import { describe, expect, it } from "vitest";

import {
  enqueueReview,
  flushPendingReviews,
  OFFLINE_REVIEWS_KEY,
  readPendingReviews,
  type QueueStorage,
} from "./offline-queue";

function memoryStorage(initial?: string): QueueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>(initial ? [[OFFLINE_REVIEWS_KEY, initial]] : []);
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const A = { cardId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", rating: "again" } as const;
const B = { cardId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", rating: "good" } as const;

describe("offline review queue", () => {
  it("keeps ratings in the order they were made", () => {
    const storage = memoryStorage();
    enqueueReview(storage, A);
    enqueueReview(storage, B);
    expect(readPendingReviews(storage)).toEqual([A, B]);
  });

  it.each(["not json", '{"cardId":1}', '[{"cardId":"x","rating":"good"}]'])(
    "reads corrupt data %j as empty",
    (raw) => {
      expect(readPendingReviews(memoryStorage(raw))).toEqual([]);
    },
  );

  it("sends everything oldest first and clears the key", async () => {
    const storage = memoryStorage();
    enqueueReview(storage, A);
    enqueueReview(storage, B);
    const sent: string[] = [];
    const count = await flushPendingReviews(storage, async (review) => {
      sent.push(review.rating);
      return true;
    });
    expect(count).toBe(2);
    expect(sent).toEqual(["again", "good"]);
    expect(storage.data.has(OFFLINE_REVIEWS_KEY)).toBe(false);
  });

  it("stops at the first failure and keeps the rest", async () => {
    const storage = memoryStorage();
    enqueueReview(storage, A);
    enqueueReview(storage, B);
    const count = await flushPendingReviews(
      storage,
      async (review) => review === A || review.rating === "again",
    );
    expect(count).toBe(1);
    expect(readPendingReviews(storage)).toEqual([B]);
  });
});
