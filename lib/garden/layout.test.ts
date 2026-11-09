import { describe, expect, it } from "vitest";

import {
  COLS,
  DECOR_SLOTS,
  HORIZON_Y,
  ROWS,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  PLOTS,
  POND_TILES,
  PATH_TILES,
  decorTile,
  plotTile,
  project,
  tileBase,
  tileCenter,
  tileCorners,
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

  it("maps tiles to isometric scene coordinates (spec §4.2)", () => {
    expect(tileCenter({ x: 0, y: 0 })).toEqual({ x: 280, y: 156 });
    // +x goes down-right, +y goes down-left
    expect(tileCenter({ x: 1, y: 0 })).toEqual({ x: 320, y: 176 });
    expect(tileCenter({ x: 0, y: 1 })).toEqual({ x: 240, y: 176 });
    expect(tileCenter({ x: 7, y: 5 })).toEqual({ x: 360, y: 396 });
    expect(tileBase({ x: 0, y: 0 })).toEqual({ x: 280, y: 159 });
  });

  it("keeps the whole map inside the scene, below the horizon", () => {
    const corners = [project(0, 0), project(COLS, 0), project(COLS, ROWS), project(0, ROWS)];
    for (const corner of corners) {
      expect(corner.x).toBeGreaterThanOrEqual(0);
      expect(corner.x).toBeLessThanOrEqual(SCENE_WIDTH);
      expect(corner.y).toBeGreaterThan(HORIZON_Y);
      expect(corner.y).toBeLessThanOrEqual(SCENE_HEIGHT);
    }
  });

  it("outlines a tile with its four diamond corners", () => {
    expect(tileCorners({ x: 0, y: 0 })).toEqual([
      { x: 280, y: 136 },
      { x: 320, y: 156 },
      { x: 280, y: 176 },
      { x: 240, y: 156 },
    ]);
  });

  it("rejects indexes outside the layout", () => {
    expect(() => plotTile(31)).toThrow();
    expect(() => decorTile(5)).toThrow();
  });
});
