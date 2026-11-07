import { describe, expect, it } from "vitest";

import { lessonRewards, scoreLesson, scoreSentence } from "./scoring";

describe("scoreSentence", () => {
  it.each([
    [["exact"], 10, 1],
    [["acceptable"], 7, 1],
    [["incorrect", "exact"], 8, 2],
    [["incorrect", "incorrect", "acceptable"], 3, 3],
    [["incorrect", "incorrect", "incorrect", "incorrect", "exact"], 2, 5],
  ] as const)("%j → %i points in %i attempts", (verdicts, points, attempts) => {
    expect(scoreSentence({ verdicts })).toMatchObject({ points, attempts });
  });

  it("ignores attempts after the sentence was passed", () => {
    expect(scoreSentence({ verdicts: ["exact", "incorrect"] })).toMatchObject({
      points: 10,
      attempts: 1,
      finalVerdict: "exact",
    });
  });

  it("scores 0 for a sentence never passed", () => {
    expect(scoreSentence({ verdicts: ["incorrect", "incorrect"] })).toEqual({
      points: 0,
      attempts: 2,
      finalVerdict: "incorrect",
    });
    expect(scoreSentence({ verdicts: [] })).toEqual({
      points: 0,
      attempts: 0,
      finalVerdict: null,
    });
  });
});

describe("scoreLesson", () => {
  it("marks a lesson perfect when every sentence is exact on the first try", () => {
    const result = scoreLesson([{ verdicts: ["exact"] }, { verdicts: ["exact"] }]);
    expect(result).toMatchObject({ points: 20, maxPoints: 20, percent: 100, perfect: true });
  });

  it("computes points and percent for a mixed lesson", () => {
    const result = scoreLesson([
      { verdicts: ["exact"] },
      { verdicts: ["incorrect", "acceptable"] },
      { verdicts: ["acceptable"] },
    ]);
    // 10 + 5 + 7 = 22 of 30
    expect(result).toMatchObject({ points: 22, maxPoints: 30, percent: 73, perfect: false });
  });

  it("handles an empty lesson", () => {
    expect(scoreLesson([])).toMatchObject({ points: 0, percent: 0, perfect: false });
  });
});

// xp-levels §4.2 (test case #2): completion rewards need at least 3 sentences
describe("lessonRewards", () => {
  it("pays nothing for a lesson shorter than 3 sentences", () => {
    expect(lessonRewards({ sentenceCount: 2, points: 20, perfect: true })).toEqual({
      bonusXp: 0,
      coins: 0,
    });
  });

  it("pays the bonus and one coin per 10 points from 3 sentences", () => {
    expect(lessonRewards({ sentenceCount: 3, points: 22, perfect: false })).toEqual({
      bonusXp: 5,
      coins: 2,
    });
  });

  it("adds the perfect coins bonus", () => {
    expect(lessonRewards({ sentenceCount: 5, points: 50, perfect: true })).toEqual({
      bonusXp: 5,
      coins: 5 + 3,
    });
  });

  it("matches the spec example: 5 sentences, 42 points, not perfect", () => {
    expect(lessonRewards({ sentenceCount: 5, points: 42, perfect: false })).toEqual({
      bonusXp: 5,
      coins: 4,
    });
  });
});
