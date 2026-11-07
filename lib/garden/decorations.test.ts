import { describe, expect, it } from "vitest";

import { isSlotDecoration } from "./decorations";

describe("decorations on slots", () => {
  it("places lanterns and benches on slots", () => {
    expect(isSlotDecoration("deco-lantern")).toBe(true);
    expect(isSlotDecoration("deco-bench")).toBe(true);
  });

  it("keeps the pond, themes and unknown items off the slots", () => {
    expect(isSlotDecoration("deco-pond")).toBe(false);
    expect(isSlotDecoration("theme-sakura")).toBe(false);
    expect(isSlotDecoration("deco-unknown")).toBe(false);
  });
});
