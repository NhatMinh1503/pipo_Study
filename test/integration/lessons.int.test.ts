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

  it("creates a lesson with sentences and reads it back", async () => {
    const { data: lesson, error } = await demo.client
      .from("lessons")
      .insert({ user_id: demo.userId, title: "Integration lesson", language: "ja", level: "N5" })
      .select()
      .single();
    expect(error).toBeNull();
    if (!lesson) throw new Error("lesson was not returned");
    createdIds.push(lesson.id);

    const { error: sentenceError } = await demo.client.from("sentences").insert([
      { lesson_id: lesson.id, user_id: demo.userId, position: 0, source_text: "猫がいます。" },
      { lesson_id: lesson.id, user_id: demo.userId, position: 1, source_text: "犬もいます。" },
    ]);
    expect(sentenceError).toBeNull();

    const { data: readBack } = await demo.client
      .from("lessons")
      .select("title, sentences(position, source_text)")
      .eq("id", lesson.id)
      .order("position", { referencedTable: "sentences" })
      .single();

    expect(readBack).toEqual({
      title: "Integration lesson",
      sentences: [
        { position: 0, source_text: "猫がいます。" },
        { position: 1, source_text: "犬もいます。" },
      ],
    });
  });

  it("hides the lesson from another user", async () => {
    const lessonId = createdIds[0];
    if (!lessonId) throw new Error("previous test did not create a lesson");

    const { data } = await other.client.from("lessons").select("id").eq("id", lessonId);
    expect(data).toEqual([]);
  });

  it("rejects a lesson whose level does not match its language", async () => {
    const { error } = await demo.client
      .from("lessons")
      .insert({ user_id: demo.userId, title: "Bad", language: "en", level: "N2" });
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
