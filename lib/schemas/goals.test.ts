import { describe, expect, it } from "vitest";

import { applicableGoals, todayGoalsSchema } from "./goals";

const sample = {
  date: "2026-11-17",
  translate: { count: 3, target: 3, done: true },
  review: { count: 0, target: 0, done: false, applicable: false },
  focus: { count: 0, target: 1, done: false },
  bonusCoins: 5,
  rewarded: false,
  justRewarded: false,
};

describe("todayGoalsSchema", () => {
  it("parses the SQL result", () => {
    expect(todayGoalsSchema.parse(sample).translate.done).toBe(true);
  });

  it("rejects a malformed result", () => {
    expect(todayGoalsSchema.safeParse({ ...sample, focus: null }).success).toBe(false);
  });
});

describe("applicableGoals", () => {
  it("leaves out the review goal when nothing was due", () => {
    expect(applicableGoals(todayGoalsSchema.parse(sample))).toHaveLength(2);
  });

  it("keeps all three goals when cards were due", () => {
    const goals = todayGoalsSchema.parse({
      ...sample,
      review: { count: 2, target: 5, done: false, applicable: true },
    });
    expect(applicableGoals(goals).map((goal) => goal.done)).toEqual([true, false, false]);
  });
});
