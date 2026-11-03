import { z } from "zod";

import { ratingSchema } from "@/lib/srs/schedule";

/** Where ratings made without a connection wait until they can be sent. */
export const OFFLINE_REVIEWS_KEY = "pipo:pending-reviews";

const pendingReviewSchema = z.object({ cardId: z.uuid(), rating: ratingSchema });
export type PendingReview = z.infer<typeof pendingReviewSchema>;

/** The subset of the Web Storage API the queue needs, so tests can pass a fake. */
export type QueueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Pending ratings in the order they were made; corrupt or foreign data reads as empty. */
export function readPendingReviews(storage: QueueStorage): PendingReview[] {
  try {
    const parsed = z
      .array(pendingReviewSchema)
      .safeParse(JSON.parse(storage.getItem(OFFLINE_REVIEWS_KEY) ?? "[]"));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function enqueueReview(storage: QueueStorage, review: PendingReview): void {
  storage.setItem(OFFLINE_REVIEWS_KEY, JSON.stringify([...readPendingReviews(storage), review]));
}

/**
 * Sends queued ratings one by one, oldest first, removing each only after it succeeded so a
 * dropped connection mid-way loses nothing. Stops at the first failure. Returns how many were sent.
 */
export async function flushPendingReviews(
  storage: QueueStorage,
  send: (review: PendingReview) => Promise<boolean>,
): Promise<number> {
  let sent = 0;
  for (;;) {
    const [next, ...rest] = readPendingReviews(storage);
    if (!next || !(await send(next))) return sent;
    if (rest.length > 0) storage.setItem(OFFLINE_REVIEWS_KEY, JSON.stringify(rest));
    else storage.removeItem(OFFLINE_REVIEWS_KEY);
    sent++;
  }
}
