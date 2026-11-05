import { afterAll, describe, expect, it } from "vitest";

import { signInAs } from "./supabase-client";

// Requires `supabase start` + seed. Exercises the real API, auth and RLS end to end.
describe("lessons through the Supabase client", async () => {
  const demo = await signInAs("demo@pipo.local");
  const other = await signInAs("demo2@pipo.local");
  const createdIds: string[] = [];

  afterAll(async () => {
    if (createdIds.length > 0) await demo.client.from("lessons").delete().in("id", createdIds);
  });

  it("creates a lesson with sentences through create_lesson and reads it back", async () => {
    const { data: lessonId, error } = await demo.client.rpc("create_lesson", {
      p_title: "Integration lesson",
      p_language: "ja",
      p_level: "N5",
      p_sentences: ["猫がいます。", "犬もいます。"],
    });
    expect(error).toBeNull();
    if (!lessonId) throw new Error("lesson id was not returned");
    createdIds.push(lessonId);

    const { data: readBack } = await demo.client
      .from("lessons")
      .select("title, source, sentences(position, source_text)")
      .eq("id", lessonId)
      .order("position", { referencedTable: "sentences" })
      .single();

    expect(readBack).toEqual({
      title: "Integration lesson",
      source: "manual",
      sentences: [
        { position: 0, source_text: "猫がいます。" },
        { position: 1, source_text: "犬もいます。" },
      ],
    });
  });

  it("does not let the client insert lessons or sentences directly", async () => {
    const lesson = await demo.client
      .from("lessons")
      .insert({ user_id: demo.userId, title: "Direct", language: "ja", level: "N5" });
    expect(lesson.error?.code).toBe("42501");

    const lessonId = createdIds[0];
    if (!lessonId) throw new Error("previous test did not create a lesson");
    const sentence = await demo.client
      .from("sentences")
      .insert({ lesson_id: lessonId, user_id: demo.userId, position: 9, source_text: "はい。" });
    expect(sentence.error?.code).toBe("42501");
  });

  it("hides the lesson from another user", async () => {
    const lessonId = createdIds[0];
    if (!lessonId) throw new Error("previous test did not create a lesson");

    const { data } = await other.client.from("lessons").select("id").eq("id", lessonId);
    expect(data).toEqual([]);
  });

  it("rejects a lesson whose level does not match its language", async () => {
    const { error } = await demo.client.rpc("create_lesson", {
      p_title: "Bad",
      p_language: "en",
      p_level: "N2",
      p_sentences: ["Hi."],
    });
    expect(error?.code).toBe("23514");
  });

  it("does not let the client change its own wallet", async () => {
    const { error } = await demo.client
      .from("wallets")
      .update({ coins: 999_999 })
      .eq("user_id", demo.userId);
    expect(error?.code).toBe("42501");
  });
});
