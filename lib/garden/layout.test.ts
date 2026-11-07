import { describe, expect, it } from "vitest";

import {
  DECOR_SLOTS,
  PLOTS,
  POND_TILES,
  PATH_TILES,
  decorTile,
  plotTile,
  tileBase,
  tileCenter,
} from "./layout";

// garden-scene spec §3.4 (test case #2)
describe("garden layout", () => {
  it("has 31 tree plots, 5 decoration slots, a 2×2 pond and a full path row", () => {
    expect(PLOTS).toHaveLength(31);
    expect(DECOR_SLOTS).toHaveLength(5);
    expect(POND_TILES).toHaveLength(4);
    expect(PATH_TILES).toHaveLength(8);
    expect(PATH_TILES.every((tile) => tile.y === 2)).toBe(true);
  });

  it("fills plots in reading order", () => {
    expect(plotTile(0)).toEqual({ x: 0, y: 0 });
    expect(plotTile(7)).toEqual({ x: 7, y: 0 });
    expect(plotTile(8)).toEqual({ x: 0, y: 1 });
    expect(plotTile(9)).toEqual({ x: 2, y: 1 }); // (1,1) is a decoration slot
    expect(plotTile(30)).toEqual({ x: 7, y: 5 });
  });

  it("places decoration slots on the D tiles", () => {
    expect(decorTile(0)).toEqual({ x: 1, y: 1 });
    expect(decorTile(4)).toEqual({ x: 5, y: 4 });
  });

  it("maps tiles to scene coordinates (spec §4.2)", () => {
    expect(tileCenter({ x: 0, y: 0 })).toEqual({ x: 96, y: 120 });
    expect(tileCenter({ x: 7, y: 5 })).toEqual({ x: 544, y: 360 });
    expect(tileBase({ x: 0, y: 0 })).toEqual({ x: 96, y: 138 });
  });

  it("rejects indexes outside the layout", () => {
    expect(() => plotTile(31)).toThrow();
    expect(() => decorTile(5)).toThrow();
  });
});
