import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { Grader } from "@/server/ai/grader";
import { AiError } from "@/server/gemini";
import { ServiceError, verifyTranslation } from "@/server/services/verify-translation";
import type { Database } from "@/types/database";

import { signInAs } from "./supabase-client";

const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SECRET_KEY ?? "",
  { auth: { persistSession: false } },
);

const correct: Grader = async () => ({
  verdict: "exact",
  feedback: "Chính xác.",
  hint: null,
  errorTags: [],
  referenceTranslation: "Con mèo đang ngủ.",
});

const wrong: Grader = async () => ({
  verdict: "incorrect",
  feedback: "Sai chủ ngữ.",
  hint: "Ai đang ngủ?",
  errorTags: ["meaning", "particle"],
  referenceTranslation: null,
});

describe("verifyTranslation (local Supabase, fake grader)", async () => {
  const demo = await signInAs("demo@pipo.local");
  const other = await signInAs("demo2@pipo.local");
  let lessonId = "";
  let sentenceIds: string[] = [];

  beforeAll(async () => {
    const { data, error } = await demo.client.rpc("create_lesson", {
      p_title: "verify-translation int test",
      p_language: "ja",
      p_level: "N5",
      p_sentences: ["猫が寝ています。", "犬が走っています。", "鳥が歌っています。"],
    });
    if (error || !data) throw error ?? new Error("lesson not created");
    lessonId = data;
    const { data: rows } = await demo.client
      .from("sentences")
      .select("id")
      .eq("lesson_id", lessonId)
      .order("position");
    sentenceIds = (rows ?? []).map((row) => row.id);
  });

  afterAll(async () => {
    await demo.client.from("lessons").delete().eq("id", lessonId);
  });

  const params = (overrides: Partial<Parameters<typeof verifyTranslation>[0]> = {}) => ({
    userClient: demo.client,
    adminClient: admin,
    userId: demo.userId,
    sentenceId: sentenceIds[0] ?? "",
    userTranslation: "Con mèo đang ngủ.",
    grade: correct,
    dailyLimit: 1000,
    ...overrides,
  });

  it("passes context to the grader and records a correct attempt", async () => {
    const grade = vi.fn(correct);
    const result = await verifyTranslation(params({ grade }));

    expect(grade).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "猫が寝ています。",
        sourceLanguage: "ja",
        level: "N5",
        targetLanguage: "vi",
        contextBefore: null,
        contextAfter: "犬が走っています。",
      }),
    );
    expect(result).toMatchObject({ verdict: "exact", sentenceCompleted: true });

    const { data: sentence } = await demo.client
      .from("sentences")
      .select("completed_at, reference_translation")
      .eq("id", sentenceIds[0] ?? "")
      .single();
    expect(sentence?.completed_at).not.toBeNull();
    expect(sentence?.reference_translation).toBe("Con mèo đang ngủ.");
  });

  it("records an incorrect attempt with error logs and never returns a reference", async () => {
    const result = await verifyTranslation(
      params({ sentenceId: sentenceIds[1] ?? "", userTranslation: "Con mèo chạy.", grade: wrong }),
    );

    expect(result).toMatchObject({
      verdict: "incorrect",
      sentenceCompleted: false,
      referenceTranslation: null,
    });

    const { data: logs } = await demo.client
      .from("error_logs")
      .select("tag")
      .eq("attempt_id", result.attemptId);
    expect(logs?.map((log) => log.tag).sort()).toEqual(["meaning", "particle"]);

    const { data: sentence } = await demo.client
      .from("sentences")
      .select("completed_at")
      .eq("id", sentenceIds[1] ?? "")
      .single();
    expect(sentence?.completed_at).toBeNull();
  });

  it("counts a newly unlocked sentence as study activity (streak), not a wrong attempt", async () => {
    const { data: before } = await admin
      .from("wallets")
      .select("streak_current, streak_best, last_active_date")
      .eq("user_id", demo.userId)
      .single();
    if (!before) throw new Error("wallet missing");
    // Pretend the streak broke three days ago
    await admin
      .from("wallets")
      .update({ streak_current: 4, last_active_date: "2000-01-01" })
      .eq("user_id", demo.userId);

    try {
      await verifyTranslation(
        params({ sentenceId: sentenceIds[2] ?? "", userTranslation: "Sai.", grade: wrong }),
      );
      const afterWrong = await admin
        .from("wallets")
        .select("last_active_date")
        .eq("user_id", demo.userId)
        .single();
      expect(afterWrong.data?.last_active_date).toBe("2000-01-01");

      await verifyTranslation(params({ sentenceId: sentenceIds[2] ?? "" }));
      const afterPass = await admin
        .from("wallets")
        .select("streak_current, last_active_date")
        .eq("user_id", demo.userId)
        .single();
      expect(afterPass.data?.streak_current).toBe(1);
      expect(afterPass.data?.last_active_date).not.toBe("2000-01-01");
    } finally {
      await admin.from("wallets").update(before).eq("user_id", demo.userId);
    }
  });

  it("hides other users' sentences as NOT_FOUND", async () => {
    await expect(
      verifyTranslation(params({ userClient: other.client, userId: other.userId })),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("stops at the daily limit without calling the grader", async () => {
    const grade = vi.fn(correct);
    await expect(verifyTranslation(params({ grade, dailyLimit: 0 }))).rejects.toBeInstanceOf(
      ServiceError,
    );
    expect(grade).not.toHaveBeenCalled();
  });

  it("records nothing when the AI fails", async () => {
    const before = await demo.client
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("sentence_id", sentenceIds[1] ?? "");

    const failing: Grader = async () => {
      throw new AiError("AI_UNAVAILABLE", "down");
    };
    await expect(
      verifyTranslation(params({ sentenceId: sentenceIds[1] ?? "", grade: failing })),
    ).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });

    const after = await demo.client
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("sentence_id", sentenceIds[1] ?? "");
    expect(after.count).toBe(before.count);
  });
});
