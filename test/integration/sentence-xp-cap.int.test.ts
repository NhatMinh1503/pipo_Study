import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import type { Database } from "@/types/database";

import { signInAs } from "./supabase-client";

const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SECRET_KEY ?? "",
  { auth: { persistSession: false } },
);

const awardSchema = z.object({ points: z.number(), awarded: z.number(), capped: z.boolean() });

// xp-levels test case #8: two sentences unlocked at the same moment around the 300 XP cap.
// Each RPC is its own HTTP request, so each runs in its own database transaction.
describe("manual-lesson XP cap under concurrency (local Supabase)", async () => {
  const learner = await signInAs("demo2@pipo.local");
  let walletBefore: Database["public"]["Tables"]["wallets"]["Row"] | null = null;
  let lessonId = "";
  let sentenceIds: string[] = [];

  beforeAll(async () => {
    walletBefore = (await admin.from("wallets").select("*").eq("user_id", learner.userId).single())
      .data;
    const { data, error } = await admin.rpc("create_lesson_for_user", {
      p_user_id: learner.userId,
      p_title: "cap race",
      p_language: "ja",
      p_level: "N5",
      p_sentences: ["一。", "二。"],
      p_source: "manual",
    });
    if (error || !data) throw error ?? new Error("lesson not created");
    lessonId = data;
    sentenceIds = (
      (await admin.from("sentences").select("id").eq("lesson_id", lessonId)).data ?? []
    ).map((row) => row.id);
    // 296 of the 300 manual XP already used today: only 4 are left
    await admin.from("reward_claims").insert({
      user_id: learner.userId,
      claim_key: "it:cap-race-earlier",
      kind: "sentence",
      source: "manual",
      points: 296,
      xp: 296,
    });
  });

  afterAll(async () => {
    await admin
      .from("reward_claims")
      .delete()
      .eq("user_id", learner.userId)
      .or(
        `claim_key.eq.it:cap-race-earlier,claim_key.in.(${sentenceIds.map((id) => `sentence:${id}`).join(",")})`,
      );
    await admin
      .from("transactions")
      .delete()
      .eq("user_id", learner.userId)
      .like("idempotency_key", "sentence:%");
    await admin.from("lessons").delete().eq("id", lessonId);
    if (walletBefore)
      await admin.from("wallets").update(walletBefore).eq("user_id", learner.userId);
  });

  it("never pays more than the cap, whatever the order", async () => {
    const results = await Promise.all(
      sentenceIds.map((id) =>
        admin.rpc("award_sentence_xp", {
          p_user_id: learner.userId,
          p_sentence_id: id,
          p_points: 10,
        }),
      ),
    );
    const awards = results.map(({ data, error }) => {
      if (error) throw error;
      return awardSchema.parse(data);
    });
    expect(awards.reduce((sum, award) => sum + award.awarded, 0)).toBe(4);
    expect(awards.every((award) => award.capped)).toBe(true);
  });
});
