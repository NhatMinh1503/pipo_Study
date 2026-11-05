import { dayKey } from "@/lib/dashboard/days";

/** XP for one rewarded review. Mirrors the value in the review action's wallet call. */
export const REVIEW_XP = 1;

/**
 * Only a review of a card that was already due earns XP. Re-rating a card early
 * (e.g. pressing "Again" and seeing it again in the same session) still updates the
 * schedule but pays nothing, so rating choices cannot be farmed.
 */
export function isReviewRewardable(dueDate: string | Date, now: Date): boolean {
  return new Date(dueDate).getTime() <= now.getTime();
}

/**
 * Idempotency key for the review reward: at most one payment per card per local day.
 * `timeZone` must be the one saved in the profile, the same source `wallet_apply`
 * uses for the streak day, so both agree on what "today" is.
 */
export function reviewRewardKey(cardId: string, now: Date, timeZone: string): string {
  return `review:${cardId}:${dayKey(now, timeZone)}`;
}
