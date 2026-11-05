import { describe, expect, it } from "vitest";

import { OPPONENT_TIMEOUT_SECONDS, shouldClaimTimeout } from "./presence";

const T0 = Date.parse("2026-11-05T09:00:00.000Z");
const seconds = (count: number) => T0 + count * 1000;

describe("shouldClaimTimeout", () => {
  it("never claims while the opponent is online", () => {
    expect(shouldClaimTimeout(null, seconds(1000))).toBe(false);
  });

  it("waits for the full timeout", () => {
    expect(shouldClaimTimeout(T0, seconds(OPPONENT_TIMEOUT_SECONDS - 1))).toBe(false);
    expect(shouldClaimTimeout(T0, seconds(OPPONENT_TIMEOUT_SECONDS))).toBe(true);
  });
});
