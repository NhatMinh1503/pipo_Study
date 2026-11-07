import { dayKey } from "@/lib/dashboard/days";
import { GAME } from "@/lib/game/config";

/** XP for one rewarded review. Mirrors the value in the review action's wallet call. */
export const REVIEW_XP = GAME.review.xp;

/** The card's state before this review: was it ever reviewed? ("Again" counts a lapse.) */
export function wasReviewedBefore(card: { repetitions: number; lapses: number }): boolean {
  return card.repetitions + card.lapses > 0;
}

/**
 * Only a review of a card that was already due **and** reviewed before earns XP
 * (xp-levels §3.3). Re-rating a card early (e.g. pressing "Again" and seeing it again in the
 * same session) and the first review of a just-saved word still update the schedule but pay
 * nothing, so neither rating choices nor saving words can be farmed.
 */
export function isReviewRewardable(
  card: { dueDate: string | Date; reviewedBefore: boolean },
  now: Date,
): boolean {
  return card.reviewedBefore && new Date(card.dueDate).getTime() <= now.getTime();
}

/**
 * Idempotency key for the review reward: at most one payment per card per local day.
 * `timeZone` must be the one saved in the profile, the same source `wallet_apply`
 * uses for the streak day, so both agree on what "today" is.
 */
export function reviewRewardKey(cardId: string, now: Date, timeZone: string): string {
  return `review:${cardId}:${dayKey(now, timeZone)}`;
}
