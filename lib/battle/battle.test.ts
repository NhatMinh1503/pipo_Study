import { describe, expect, it } from "vitest";

import { pickPassage } from "./passages";
import { battlePoints, decideWinner } from "./scoring";

describe("battlePoints", () => {
  it.each([
    ["exact", 0, 15],
    ["exact", 19, 15],
    ["exact", 20, 14],
    ["acceptable", 45, 10],
    ["exact", 600, 10],
    ["incorrect", 1, 0],
  ] as const)("%s in %is → %i", (verdict, seconds, points) => {
    expect(battlePoints(verdict, seconds)).toBe(points);
  });

  it("treats a negative duration (clock skew) as instant", () => {
    expect(battlePoints("acceptable", -3)).toBe(12);
  });
});

describe("decideWinner", () => {
  const a = { userId: "a", score: 40, finishedAt: "2026-11-02T10:01:00Z" };
  const b = { userId: "b", score: 35, finishedAt: "2026-11-02T10:00:30Z" };

  it("waits until both players finish", () => {
    expect(decideWinner([a, { ...b, finishedAt: null }])).toBeNull();
    expect(decideWinner([a])).toBeNull();
  });

  it("picks the higher score", () => {
    expect(decideWinner([a, b])).toBe("a");
  });

  it("breaks ties by who finished first", () => {
    expect(decideWinner([a, { ...b, score: 40 }])).toBe("b");
  });
});

describe("pickPassage", () => {
  it("returns five sentences for the learner's level", () => {
    expect(pickPassage("ja", "N3", () => 0)).toHaveLength(5);
    expect(pickPassage("en", "C2", () => 0)[0]).toMatch(/Cities/);
  });

  it("returns a copy, not the shared bank", () => {
    const first = pickPassage("en", "A1", () => 0);
    first.pop();
    expect(pickPassage("en", "A1", () => 0)).toHaveLength(5);
  });
});
