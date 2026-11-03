import { describe, expect, it } from "vitest";

import { dayKey, lastDayKeys, sumByDay } from "./days";

describe("dayKey", () => {
  const lateUtc = new Date("2026-11-02T16:30:00Z");

  it("uses the learner's time zone", () => {
    expect(dayKey(lateUtc, "UTC")).toBe("2026-11-02");
    expect(dayKey(lateUtc, "Asia/Tokyo")).toBe("2026-11-03");
    expect(dayKey(lateUtc, "America/New_York")).toBe("2026-11-02");
  });

  it("falls back to UTC for an unknown zone", () => {
    expect(dayKey(lateUtc, "Mars/Olympus")).toBe("2026-11-02");
  });
});

describe("lastDayKeys", () => {
  it("lists the last days ending today, oldest first, across a month boundary", () => {
    expect(lastDayKeys(new Date("2026-11-02T01:00:00Z"), "Asia/Tokyo", 3)).toEqual([
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
  });

  it("does not skip a day across a DST change", () => {
    // US clocks fall back on 2026-11-01
    expect(lastDayKeys(new Date("2026-11-02T12:00:00Z"), "America/New_York", 3)).toEqual([
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
  });
});

describe("sumByDay", () => {
  const days = ["2026-11-01", "2026-11-02", "2026-11-03"];

  it("buckets by local day and keeps empty days", () => {
    const rows = [
      { at: "2026-11-02T16:30:00Z", value: 5 }, // 11-03 in Tokyo
      { at: "2026-11-02T01:00:00Z", value: 2 },
      { at: "2026-11-02T02:00:00Z", value: 3 },
      { at: "2026-10-20T02:00:00Z", value: 99 }, // outside the window
    ];
    expect(sumByDay(rows, days, "Asia/Tokyo")).toEqual([
      { day: "2026-11-01", total: 0 },
      { day: "2026-11-02", total: 5 },
      { day: "2026-11-03", total: 5 },
    ]);
  });

  it("handles no rows", () => {
    expect(sumByDay([], days, "UTC").map((day) => day.total)).toEqual([0, 0, 0]);
  });
});
