import { describe, expect, it } from "vitest";

import { resolveGardenIndex } from "./gardens";

// garden-scene spec §3.4: a full garden opens the next one; the page can switch gardens
describe("which garden to show", () => {
  it("shows the newest garden by default, where new trees go", () => {
    expect(resolveGardenIndex(undefined, 3)).toBe(3);
  });

  it("shows the garden asked for", () => {
    expect(resolveGardenIndex("1", 3)).toBe(1);
  });

  it("falls back to the newest garden for anything invalid", () => {
    expect(resolveGardenIndex("9", 3)).toBe(3);
    expect(resolveGardenIndex("0", 3)).toBe(3);
    expect(resolveGardenIndex("abc", 3)).toBe(3);
    expect(resolveGardenIndex(["1", "2"], 3)).toBe(3);
  });

  it("always has at least one garden", () => {
    expect(resolveGardenIndex(undefined, 0)).toBe(1);
  });
});
