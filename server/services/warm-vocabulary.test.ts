import { beforeEach, describe, expect, it, vi } from "vitest";

import { tokenizeEnglish } from "@/lib/nlp/tokenize-english";
import type { BatchExplainer } from "@/server/ai/explainer";

const mocks = vi.hoisted(() => ({ workspace: null as unknown }));
vi.mock("@/server/services/ensure-tokens", () => ({
  getTokenizedWorkspace: async () => mocks.workspace,
}));
vi.mock("@/server/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

const { warmLessonVocabulary, WarmVocabularyError } = await import("./warm-vocabulary");

const sentence = (sourceText: string) => ({ sourceText, tokens: tokenizeEnglish(sourceText) });
const lesson = (texts: string[]) => ({ id: "l1", language: "en", sentences: texts.map(sentence) });

function makeClients(options: { cached?: string[]; allowed?: boolean[] } = {}) {
  const allowed = [...(options.allowed ?? [true, true])];
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn(async () => ({ data: allowed.shift() ?? true, error: null }));
  const read = {
    select: () => read,
    eq: () => read,
    in: async () => ({
      data: (options.cached ?? []).map((term) => ({ term, reading: "" })),
      error: null,
    }),
  };
  return {
    userClient: { from: () => read, rpc },
    adminClient: { from: () => ({ upsert }) },
    upsert,
    rpc,
  };
}

function explainer(cacheable = true): BatchExplainer & ReturnType<typeof vi.fn> {
  const fn = vi.fn(async ({ words }: { words: Array<{ term: string }> }) => ({
    words: words.map((word) => ({
      term: word.term,
      meaning: `m-${word.term}`,
      partOfSpeech: null,
      note: null,
    })),
  }));
  return Object.assign(fn, { cacheable });
}

const run = (clients: ReturnType<typeof makeClients>, explainBatch: BatchExplainer) =>
  warmLessonVocabulary({
    // The fakes cover only the calls the service makes
    userClient: clients.userClient as never,
    adminClient: clients.adminClient as never,
    lessonId: "l1",
    displayLanguage: "vi",
    explainBatch,
    dailyLimit: 10,
  });

describe("warmLessonVocabulary", () => {
  beforeEach(() => {
    mocks.workspace = lesson(["I run fast.", "You run too."]);
  });

  it("explains only uncached words, in one call, and caches them", async () => {
    const clients = makeClients({ cached: ["i"] });
    const explain = explainer();
    expect(await run(clients, explain)).toEqual({ explained: 4, pending: 0, limited: false });
    expect(explain).toHaveBeenCalledOnce();
    expect(explain.mock.calls[0]?.[0].words.map((w: { term: string }) => w.term)).toEqual([
      "run",
      "fast",
      "you",
      "too",
    ]);
    const rows = clients.upsert.mock.calls[0]?.[0];
    expect(rows[0]).toMatchObject({ term: "run", display_language: "vi", meaning: "m-run" });
    expect(clients.rpc).toHaveBeenCalledOnce();
  });

  it("does nothing when every word is cached", async () => {
    const clients = makeClients({ cached: ["i", "run", "fast", "you", "too"] });
    const explain = explainer();
    expect(await run(clients, explain)).toEqual({ explained: 0, pending: 0, limited: false });
    expect(explain).not.toHaveBeenCalled();
    expect(clients.rpc).not.toHaveBeenCalled();
  });

  it("stops at the daily quota and reports what is left", async () => {
    const clients = makeClients({ allowed: [false] });
    const explain = explainer();
    expect(await run(clients, explain)).toEqual({ explained: 0, pending: 5, limited: true });
    expect(explain).not.toHaveBeenCalled();
  });

  it("uses at most two calls for a long lesson", async () => {
    const letter = (n: number) => String.fromCharCode(97 + n);
    const many = Array.from(
      { length: 80 },
      (_, i) => `w${letter(Math.floor(i / 26))}${letter(i % 26)}`,
    );
    mocks.workspace = lesson([many.join(" ")]);
    const clients = makeClients();
    const explain = explainer();
    const result = await run(clients, explain);
    expect(explain).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ explained: 60, pending: 20, limited: false });
  });

  it("ignores answers for words that were not asked", async () => {
    const clients = makeClients({ cached: ["i", "run", "fast", "you"] });
    const explain = Object.assign(
      vi.fn(async () => ({
        words: [
          { term: "too", meaning: "cũng", partOfSpeech: null, note: null },
          { term: "hacked", meaning: "x", partOfSpeech: null, note: null },
        ],
      })),
      { cacheable: true },
    );
    expect((await run(clients, explain)).explained).toBe(1);
    expect(clients.upsert.mock.calls[0]?.[0]).toHaveLength(1);
  });

  it("never caches answers from the fake explainer", async () => {
    const clients = makeClients();
    expect((await run(clients, explainer(false))).explained).toBe(0);
    expect(clients.upsert).not.toHaveBeenCalled();
  });

  it("treats an AI failure as best effort", async () => {
    const clients = makeClients();
    const explain = Object.assign(vi.fn().mockRejectedValue(new Error("timeout")), {
      cacheable: true,
    });
    expect(await run(clients, explain)).toEqual({ explained: 0, pending: 5, limited: false });
  });

  it("throws NOT_FOUND for a lesson the user cannot see", async () => {
    mocks.workspace = null;
    await expect(run(makeClients(), explainer())).rejects.toBeInstanceOf(WarmVocabularyError);
  });
});
