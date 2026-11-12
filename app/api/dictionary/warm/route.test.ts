import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WarmVocabularyError } from "@/server/services/warm-vocabulary";

const mocks = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  warm: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ getSessionUser: async () => mocks.user }));
vi.mock("@/server/env", () => ({ getServerEnv: () => ({ AI_DAILY_LIMIT: 10 }) }));
vi.mock("@/server/ai/explainer", () => ({ getBatchExplainer: () => "explainer" }));
vi.mock("@/server/supabase-admin", () => ({ createAdminClient: () => "admin" }));
vi.mock("@/lib/supabase/server", () => {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: { display_language: "vi" } }),
  };
  return { createClient: async () => ({ from: () => query }) };
});
vi.mock("@/server/services/warm-vocabulary", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  warmLessonVocabulary: mocks.warm,
}));

const { POST } = await import("./route");

const LESSON_ID = "6f1c2b3a-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const call = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/dictionary/warm", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/dictionary/warm", () => {
  beforeEach(() => {
    mocks.user = { id: "user-1" };
    mocks.warm.mockReset().mockResolvedValue({ explained: 12, pending: 0, limited: false });
  });

  it("401 when signed out", async () => {
    mocks.user = null;
    expect((await call({ lessonId: LESSON_ID })).status).toBe(401);
    expect(mocks.warm).not.toHaveBeenCalled();
  });

  it.each([{}, { lessonId: "nope" }, { lessonId: 42 }])("400 for %j", async (body) => {
    expect((await call(body)).status).toBe(400);
  });

  it("404 when the lesson is not the user's", async () => {
    mocks.warm.mockRejectedValue(new WarmVocabularyError("NOT_FOUND"));
    expect((await call({ lessonId: LESSON_ID })).status).toBe(404);
  });

  it("500 on an unexpected failure", async () => {
    mocks.warm.mockRejectedValue(new Error("db down"));
    expect((await call({ lessonId: LESSON_ID })).status).toBe(500);
  });

  it("warms in the learner's display language and returns the counts", async () => {
    const response = await call({ lessonId: LESSON_ID });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ explained: 12, pending: 0, limited: false });
    expect(mocks.warm).toHaveBeenCalledWith(
      expect.objectContaining({
        lessonId: LESSON_ID,
        displayLanguage: "vi",
        explainBatch: "explainer",
        dailyLimit: 10,
      }),
    );
  });
});
