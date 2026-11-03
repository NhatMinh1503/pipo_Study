import { describe, expect, it } from "vitest";

import { formatClock, progress, remainingMs } from "./timer";

const START = "2026-11-02T09:00:00.000Z";
const at = (iso: string) => new Date(iso).getTime();

describe("remainingMs", () => {
  it("counts down from the server start time", () => {
    expect(remainingMs(START, 25, at("2026-11-02T09:10:00.000Z"))).toBe(15 * 60_000);
  });

  it("stays correct after the tab was in the background (no ticking needed)", () => {
    expect(remainingMs(START, 25, at("2026-11-02T09:24:59.000Z"))).toBe(1000);
  });

  it("never goes below zero", () => {
    expect(remainingMs(START, 25, at("2026-11-02T10:00:00.000Z"))).toBe(0);
  });
});

describe("progress", () => {
  it("goes from 0 to 1", () => {
    expect(progress(START, 25, at(START))).toBe(0);
    expect(progress(START, 20, at("2026-11-02T09:05:00.000Z"))).toBe(0.25);
    expect(progress(START, 25, at("2026-11-02T11:00:00.000Z"))).toBe(1);
  });
});

describe("formatClock", () => {
  it.each([
    [25 * 60_000, "25:00"],
    [61_000, "01:01"],
    [1, "00:01"],
    [0, "00:00"],
  ])("%i ms → %s", (ms, expected) => {
    expect(formatClock(ms)).toBe(expected);
  });
});
