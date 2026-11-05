import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isReviewRewardable, REVIEW_XP, reviewRewardKey } from "@/lib/review/reward";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/** The card as it was before this review changed its schedule. */
export interface ReviewedCard {
  id: string;
  dueDate: string;
}

export interface RewardReviewParams {
  adminClient: Client;
  userId: string;
  card: ReviewedCard;
  now: Date;
  /** The profile time zone, the same one wallet_apply and the streak use. */
  timeZone: string;
}

export interface ReviewReward {
  xp: number;
}

/**
 * Pays for one review (xp-levels §3.3): a due card earns REVIEW_XP once per local day,
 * and a rewarded review is study activity, so it keeps the streak (§3.5).
 */
export async function rewardReview(params: RewardReviewParams): Promise<ReviewReward> {
  const { adminClient, userId, card, now, timeZone } = params;
  if (!isReviewRewardable(card.dueDate, now)) return { xp: 0 };

  const { data: applied, error } = await adminClient.rpc("wallet_apply", {
    p_user_id: userId,
    p_xp_delta: REVIEW_XP,
    p_coins_delta: 0,
    p_reason: "flashcard_review",
    p_idempotency_key: reviewRewardKey(card.id, now, timeZone),
  });
  if (error || !applied) return { xp: 0 };

  await adminClient.rpc("record_study_activity", { p_user_id: userId });
  return { xp: REVIEW_XP };
}
