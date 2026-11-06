import { describe, expect, it } from "vitest";

import { isReviewRewardable, reviewRewardKey, wasReviewedBefore } from "./reward";

const CARD = "00000000-0000-4000-8000-000000000001";

describe("isReviewRewardable", () => {
  const now = new Date("2026-11-05T09:00:00.000Z");
  const seen = { reviewedBefore: true };

  it("pays for a card that is overdue", () => {
    expect(isReviewRewardable({ dueDate: "2026-11-04T09:00:00.000Z", ...seen }, now)).toBe(true);
  });

  it("pays for a card that became due exactly now", () => {
    expect(isReviewRewardable({ dueDate: now.toISOString(), ...seen }, now)).toBe(true);
  });

  it("does not pay for a card that is not due yet (e.g. an 'Again' card seen early)", () => {
    expect(isReviewRewardable({ dueDate: "2026-11-05T09:10:00.000Z", ...seen }, now)).toBe(false);
  });

  // xp-levels §3.3, test case #17: a new card's first review pays nothing
  it("does not pay for the first review of a new card, even when due", () => {
    expect(
      isReviewRewardable({ dueDate: "2026-11-04T09:00:00.000Z", reviewedBefore: false }, now),
    ).toBe(false);
  });
});

describe("wasReviewedBefore", () => {
  it("is false for a card never reviewed", () => {
    expect(wasReviewedBefore({ repetitions: 0, lapses: 0 })).toBe(false);
  });

  it("is true after a successful review or a lapse", () => {
    expect(wasReviewedBefore({ repetitions: 1, lapses: 0 })).toBe(true);
    // "Again" resets repetitions to 0 but counts a lapse: the card was still seen before
    expect(wasReviewedBefore({ repetitions: 0, lapses: 1 })).toBe(true);
  });
});

describe("reviewRewardKey", () => {
  it("gives the same key for two reviews of a card on the same local day", () => {
    const morning = new Date("2026-11-05T00:30:00.000Z"); // 09:30 in Tokyo
    const evening = new Date("2026-11-05T14:00:00.000Z"); // 23:00 in Tokyo
    expect(reviewRewardKey(CARD, morning, "Asia/Tokyo")).toBe(
      reviewRewardKey(CARD, evening, "Asia/Tokyo"),
    );
  });

  it("uses the learner's local date, not UTC", () => {
    // 16:00 UTC on Nov 5 is already Nov 6 in Tokyo
    const at = new Date("2026-11-05T16:00:00.000Z");
    expect(reviewRewardKey(CARD, at, "Asia/Tokyo")).toBe(`review:${CARD}:2026-11-06`);
    expect(reviewRewardKey(CARD, at, "UTC")).toBe(`review:${CARD}:2026-11-05`);
  });

  it("changes after local midnight, so a card can pay again the next day", () => {
    const beforeMidnight = new Date("2026-11-05T14:59:00.000Z"); // 23:59 Tokyo
    const afterMidnight = new Date("2026-11-05T15:01:00.000Z"); // 00:01 Tokyo
    expect(reviewRewardKey(CARD, beforeMidnight, "Asia/Tokyo")).not.toBe(
      reviewRewardKey(CARD, afterMidnight, "Asia/Tokyo"),
    );
  });

  it("keeps cards apart on the same day", () => {
    const at = new Date("2026-11-05T09:00:00.000Z");
    expect(reviewRewardKey(CARD, at, "UTC")).not.toBe(
      reviewRewardKey("00000000-0000-4000-8000-000000000002", at, "UTC"),
    );
  });
});
