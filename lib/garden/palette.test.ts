import { describe, expect, it } from "vitest";

import { GARDEN_PALETTE, offPaletteRatio } from "./palette";

const pixel = (hex: string, alpha = 255) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha];
};

// design/game/art-bible.md §3
describe("garden palette", () => {
  it("has exactly 16 colours, including the outline brown", () => {
    expect(GARDEN_PALETTE).toHaveLength(16);
    expect(GARDEN_PALETTE).toContain("#542414");
    expect(new Set(GARDEN_PALETTE).size).toBe(16);
  });

  it("counts no off-palette pixels in an image made of palette colours", () => {
    const data = Uint8Array.from([...pixel("#FCE46C"), ...pixel("#542414"), ...pixel("#8CC45C")]);
    expect(offPaletteRatio(data, 4)).toBe(0);
  });

  it("ignores transparent and soft-edge pixels", () => {
    const data = Uint8Array.from([
      ...pixel("#123456", 0),
      ...pixel("#123456", 120),
      ...pixel("#FCE46C"),
    ]);
    expect(offPaletteRatio(data, 4)).toBe(0);
  });

  it("reports the share of opaque pixels that are not palette colours", () => {
    const data = Uint8Array.from([
      ...pixel("#FCE46C"),
      ...pixel("#00FF00"),
      ...pixel("#FF00FF"),
      ...pixel("#542414"),
    ]);
    expect(offPaletteRatio(data, 4)).toBe(0.5);
  });

  it("tolerates tiny compression differences", () => {
    expect(offPaletteRatio(Uint8Array.from(pixel("#FBE36D")), 4)).toBe(0);
  });
});
