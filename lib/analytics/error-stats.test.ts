import { describe, expect, it } from "vitest";

import { countByTag, countByWeek } from "./error-stats";

const row = (tag: string, createdAt = "2026-11-02T10:00:00Z") => ({ tag, createdAt });

describe("countByTag", () => {
  it("counts per tag, most frequent first, ties in taxonomy order", () => {
    expect(
      countByTag([
        row("tense"),
        row("particle"),
        row("particle"),
        row("word_choice"),
        row("tense"),
      ]),
    ).toEqual([
      { tag: "particle", count: 2 },
      { tag: "tense", count: 2 },
      { tag: "word_choice", count: 1 },
    ]);
  });

  it("ignores tags outside the taxonomy", () => {
    expect(countByTag([row("made_up"), row("spelling")])).toEqual([{ tag: "spelling", count: 1 }]);
  });
});

describe("countByWeek", () => {
  // Monday 2026-11-02
  const now = new Date("2026-11-04T12:00:00Z");

  it("buckets by ISO week (Monday start) and keeps empty weeks", () => {
    expect(
      countByWeek(
        [
          row("tense", "2026-11-02T00:00:00Z"),
          row("tense", "2026-11-08T23:00:00Z"),
          row("tense", "2026-10-27T00:00:00Z"),
        ],
        3,
        now,
      ),
    ).toEqual([
      { weekStart: "2026-10-19", count: 0 },
      { weekStart: "2026-10-26", count: 1 },
      { weekStart: "2026-11-02", count: 2 },
    ]);
  });

  it("drops rows older than the window", () => {
    expect(
      countByWeek([row("tense", "2026-01-01T00:00:00Z")], 2, now).every((week) => week.count === 0),
    ).toBe(true);
  });
});
