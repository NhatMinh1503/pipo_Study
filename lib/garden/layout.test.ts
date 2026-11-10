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
  PATH_DRAWN,
  PATH_ROUTE,
  PATH_TILES,
  decorTile,
  pathNeighbour,
  plotTile,
  project,
  tileBase,
  tileCenter,
  tileCorners,
} from "./layout";

// garden-scene spec §3.4 (test case #2)
describe("garden layout", () => {
  it("has 31 tree plots, 5 decoration slots, a 2×2 pond and a 14-tile path", () => {
    expect(PLOTS).toHaveLength(31);
    expect(DECOR_SLOTS).toHaveLength(5);
    expect(POND_TILES).toHaveLength(4);
    expect(PATH_TILES).toHaveLength(14);
  });

  it("walks the path as one line from the left edge to the right edge", () => {
    expect(PATH_ROUTE).toHaveLength(PATH_TILES.length);
    expect(PATH_ROUTE[0]).toEqual({ x: 0, y: 4 });
    expect(PATH_ROUTE.at(-1)).toEqual({ x: COLS - 1, y: 1 });
    // Every step moves to a tile sharing an edge
    PATH_ROUTE.slice(1).forEach((tile, index) => {
      const previous = PATH_ROUTE[index] ?? tile;
      expect(Math.abs(tile.x - previous.x) + Math.abs(tile.y - previous.y)).toBe(1);
    });
  });

  it("draws the path three tiles past each edge of the map", () => {
    expect(PATH_DRAWN).toHaveLength(PATH_TILES.length + 6);
    expect(PATH_DRAWN[0]).toEqual({ x: -3, y: 4 });
    expect(PATH_DRAWN.at(-1)).toEqual({ x: COLS + 2, y: 1 });
  });

  it("finds the path tile beside a tile", () => {
    expect(pathNeighbour({ x: 3, y: 3 })).toBe(3); // (2,3), the first of three neighbours
    expect(pathNeighbour({ x: 0, y: 0 })).toBe(-1);
  });

  it("fills plots in reading order", () => {
    expect(plotTile(0)).toEqual({ x: 0, y: 0 });
    expect(plotTile(8)).toEqual({ x: 8, y: 0 });
    expect(plotTile(9)).toEqual({ x: 0, y: 1 });
    expect(plotTile(12)).toEqual({ x: 4, y: 1 }); // (3,1) is a decoration slot
    expect(plotTile(30)).toEqual({ x: 8, y: 5 });
  });

  it("places decoration slots on the D tiles", () => {
    expect(decorTile(0)).toEqual({ x: 3, y: 1 });
    expect(decorTile(4)).toEqual({ x: 3, y: 4 });
  });

  it("maps tiles to isometric scene coordinates (spec §4.2)", () => {
    expect(tileCenter({ x: 0, y: 0 })).toEqual({ x: 260, y: 146 });
    // +x goes down-right, +y goes down-left
    expect(tileCenter({ x: 1, y: 0 })).toEqual({ x: 300, y: 166 });
    expect(tileCenter({ x: 0, y: 1 })).toEqual({ x: 220, y: 166 });
    expect(tileCenter({ x: 8, y: 5 })).toEqual({ x: 380, y: 406 });
    expect(tileBase({ x: 0, y: 0 })).toEqual({ x: 260, y: 149 });
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
      { x: 260, y: 126 },
      { x: 300, y: 146 },
      { x: 260, y: 166 },
      { x: 220, y: 146 },
    ]);
  });

  it("rejects indexes outside the layout", () => {
    expect(() => plotTile(31)).toThrow();
    expect(() => decorTile(5)).toThrow();
  });
});
