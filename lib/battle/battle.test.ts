import { describe, expect, it } from "vitest";

import { pickPassage } from "./passages";
import { battlePoints, decideAgainstGhost, decideWinner, ghostProgress } from "./scoring";

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
    expect(decideWinner([a, b])).toEqual({ winnerId: "a" });
  });

  it("calls equal scores a draw: speed is already in the points", () => {
    expect(decideWinner([a, { ...b, score: 40 }])).toEqual({ winnerId: null });
  });
});

describe("ghost mode", () => {
  const answers = [
    { offsetSeconds: 12, points: 15 },
    { offsetSeconds: 40, points: 0 },
    { offsetSeconds: 75, points: 12 },
  ];

  it("replays the recorded run at its own pace", () => {
    expect(ghostProgress(answers, 0)).toEqual({ answered: 0, score: 0 });
    expect(ghostProgress(answers, 40)).toEqual({ answered: 2, score: 15 });
    expect(ghostProgress(answers, 999)).toEqual({ answered: 3, score: 27 });
  });

  it("decides against the ghost's final score", () => {
    const ghost = { userId: "ghost", score: 27 };
    expect(decideAgainstGhost({ userId: "me", score: 30 }, ghost)).toEqual({ winnerId: "me" });
    expect(decideAgainstGhost({ userId: "me", score: 20 }, ghost)).toEqual({ winnerId: "ghost" });
    expect(decideAgainstGhost({ userId: "me", score: 27 }, ghost)).toEqual({ winnerId: null });
  });
});

describe("pickPassage", () => {
  it("returns five sentences for the learner's level", () => {
    expect(pickPassage("ja", "N3", [], () => 0)).toHaveLength(5);
    expect(pickPassage("en", "C2", [], () => 0)).toHaveLength(5);
  });

  it("avoids passages played recently while another one is left", () => {
    const first = pickPassage("ja", "N3", [], () => 0);
    const next = pickPassage("ja", "N3", [first[0] ?? ""], () => 0);
    expect(next[0]).not.toBe(first[0]);
  });

  it("falls back to the level pool when every passage was played", () => {
    const all = [0, 1, 2].map((index) => pickPassage("ja", "N3", [], () => index)[0] ?? "");
    expect(pickPassage("ja", "N3", all, () => 0)).toHaveLength(5);
  });

  it("returns a copy, not the shared bank", () => {
    const first = pickPassage("en", "A1", [], () => 0);
    first.pop();
    expect(pickPassage("en", "A1", [], () => 0)).toHaveLength(5);
  });
});
