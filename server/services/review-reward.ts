import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isReviewRewardable, REVIEW_XP, reviewRewardKey } from "@/lib/review/reward";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/** The card as it was before this review changed its schedule. */
export interface ReviewedCard {
  id: string;
  dueDate: string;
  /** repetitions + lapses > 0 before this review (see wasReviewedBefore). */
  reviewedBefore: boolean;
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
  /** +5 when this review emptied the due queue after 5+ rewarded reviews today (§3.4). */
  clearBonusXp: number;
}

/**
 * Pays for one review (xp-levels §3.3–3.5): a due card reviewed before earns REVIEW_XP once
 * per local day, keeps the streak, and may complete the daily queue-clear bonus.
 */
export async function rewardReview(params: RewardReviewParams): Promise<ReviewReward> {
  const { adminClient, userId, card, now, timeZone } = params;
  const none: ReviewReward = { xp: 0, clearBonusXp: 0 };
  if (!isReviewRewardable(card, now)) return none;

  const { data: applied, error } = await adminClient.rpc("wallet_apply", {
    p_user_id: userId,
    p_xp_delta: REVIEW_XP,
    p_coins_delta: 0,
    p_reason: "flashcard_review",
    p_idempotency_key: reviewRewardKey(card.id, now, timeZone),
  });
  if (error || !applied) return none;

  await adminClient.rpc("record_study_activity", { p_user_id: userId });
  const { data: clearBonusXp } = await adminClient.rpc("award_review_clear", {
    p_user_id: userId,
  });
  return { xp: REVIEW_XP, clearBonusXp: clearBonusXp ?? 0 };
}
