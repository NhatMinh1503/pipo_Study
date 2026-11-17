import { describe, expect, it, vi } from "vitest";

import type { Grader } from "@/server/ai/grader";

vi.mock("server-only", () => ({}));
vi.mock("@/server/services/grading-cache", () => ({
  readCachedGrade: vi.fn(async () => null),
  storeGrade: vi.fn(async () => undefined),
}));

const { verifyTranslation, ServiceError } = await import("./verify-translation");

const SOURCE = "毎朝、電車で通学しています。";

/** Fake user client covering the reads the service makes before grading. */
function userClient(displayLanguage: string) {
  const rpc = vi.fn(async () => ({ data: true, error: null }));
  const from = (table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      in: async () => ({ data: [] }),
      maybeSingle: async () =>
        table === "sentences"
          ? {
              data: {
                id: "s1",
                lesson_id: "l1",
                position: 0,
                source_text: SOURCE,
                reference_translation: null,
                completed_at: null,
                lessons: { language: "ja", level: "N4" },
              },
            }
          : { data: { display_language: displayLanguage } },
    };
    return chain;
  };
  return { from, rpc };
}

function grader(): Grader & ReturnType<typeof vi.fn> {
  return Object.assign(
    vi.fn(async () => {
      throw new Error("the grader must not be reached");
    }),
    { cacheable: true },
  );
}

const run = (displayLanguage: string, userTranslation: string, grade: Grader) => {
  const client = userClient(displayLanguage);
  return {
    client,
    promise: verifyTranslation({
      // The fakes cover only the calls made before the copy check
      userClient: client as never,
      adminClient: {} as never,
      userId: "u1",
      sentenceId: "s1",
      userTranslation,
      grade,
      dailyLimit: 10,
    }),
  };
};

describe("verifyTranslation copy guard", () => {
  it("rejects the source pasted back by a Japanese learner with a Japanese UI", async () => {
    const grade = grader();
    const { client, promise } = run("ja", SOURCE, grade);
    await expect(promise).rejects.toEqual(new ServiceError("COPIED_SOURCE"));
    // Neither AI quota nor the grader is spent on a copy
    expect(client.rpc).not.toHaveBeenCalled();
    expect(grade).not.toHaveBeenCalled();
  });

  it("rejects a same-language copy with only punctuation removed", async () => {
    const { promise } = run("ja", "毎朝電車で通学しています", grader());
    await expect(promise).rejects.toEqual(new ServiceError("COPIED_SOURCE"));
  });

  it("rejects the source pasted as a Vietnamese translation", async () => {
    const { promise } = run("vi", SOURCE, grader());
    await expect(promise).rejects.toEqual(new ServiceError("COPIED_SOURCE"));
  });
});
