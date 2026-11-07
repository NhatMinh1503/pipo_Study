import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { GAME } from "@/lib/game/config";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface LessonRewardSummary {
  /** XP actually paid for this lesson: unlocked sentences + completion bonus. */
  xp: number;
  coins: number;
  /** The daily cap for the learner's own lessons stopped the completion reward. */
  capped: boolean;
  /** Too few sentences for a completion reward (xp-levels §3.2). */
  tooShort: boolean;
}

/**
 * What the server paid for a finished lesson, read from the learner's own records (RLS):
 * reward claims for lessons finished under per-sentence XP, or the single ledger entry
 * of a lesson rewarded by the old whole-lesson rule.
 */
export async function getLessonRewardSummary(
  client: Client,
  lessonId: string,
  sentenceCount: number,
): Promise<LessonRewardSummary> {
  const tooShort = sentenceCount < GAME.translation.minLessonSentences;
  const { data: claims } = await client
    .from("reward_claims")
    .select("kind, xp, coins, capped")
    .eq("lesson_id", lessonId);

  const lessonClaim = claims?.find((claim) => claim.kind === "lesson");
  if (lessonClaim) {
    return {
      xp: (claims ?? []).reduce((sum, claim) => sum + claim.xp, 0),
      coins: lessonClaim.coins,
      capped: lessonClaim.capped,
      tooShort,
    };
  }

  const { data: legacy } = await client
    .from("transactions")
    .select("xp_delta, coins_delta")
    .eq("idempotency_key", `lesson:${lessonId}`)
    .maybeSingle();
  return {
    xp: legacy?.xp_delta ?? 0,
    coins: legacy?.coins_delta ?? 0,
    capped: false,
    tooShort: legacy ? false : tooShort,
  };
}
