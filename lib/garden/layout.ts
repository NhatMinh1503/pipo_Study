import { GAME } from "@/lib/game/config";

/**
 * The fixed garden map (garden-scene spec §3.4): T tree plot, D decoration slot, = path,
 * W pond (meadow when the learner has no pond). Plots and slots are numbered in reading
 * order; plot indexes match garden_trees.plot_index. The path winds from the left edge
 * (column 0) to the right edge (last column), one tile wide, never touching itself.
 */
export const GRID = [
  "TTTTTTTTT",
  "TTTDTT===",
  "TT===D=DT",
  "TD=T===TT",
  "===DWWTTT",
  "TTTTWWTTT",
] as const;

export const COLS = 9;
export const ROWS = 6;
/** Isometric diamond tile, 2:1 like farm games (garden-scene spec §4.2). */
export const TILE_W = 80;
export const TILE_H = 40;
/** Screen position of the map's top corner (grid point 0,0). */
export const ISO_ORIGIN = { x: 260, y: 126 } as const;
/** Where the meadow meets the distant forest in the painted backdrop (bg-garden). */
export const HORIZON_Y = 124;
export const SCENE_WIDTH = 640;
export const SCENE_HEIGHT = 432;

export interface Tile {
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

function tilesOf(symbol: string): Tile[] {
  return GRID.flatMap((row, y) =>
    [...row].flatMap((cell, x) => (cell === symbol ? [{ x, y }] : [])),
  );
}

export const PLOTS = tilesOf("T");
export const DECOR_SLOTS = tilesOf("D");
export const POND_TILES = tilesOf("W");
export const PATH_TILES = tilesOf("=");

const isPath = ({ x, y }: Tile) => GRID[y]?.[x] === "=";

/**
 * The path tiles in walking order, from the one on the left edge to the one on the right
 * edge: each step goes to the only neighbouring path tile not visited yet.
 */
function walkPath(): Tile[] {
  const start = PATH_TILES.find((tile) => tile.x === 0);
  if (!start) throw new Error("The garden path must start on the left edge");
  const route = [start];
  const seen = new Set([`${start.x},${start.y}`]);
  for (;;) {
    const last = route.at(-1) ?? start;
    const next = [
      { x: last.x + 1, y: last.y },
      { x: last.x, y: last.y - 1 },
      { x: last.x, y: last.y + 1 },
      { x: last.x - 1, y: last.y },
    ].find((tile) => isPath(tile) && !seen.has(`${tile.x},${tile.y}`));
    if (!next) break;
    route.push(next);
    seen.add(`${next.x},${next.y}`);
  }
  if (route.length !== PATH_TILES.length || route.at(-1)?.x !== COLS - 1) {
    throw new Error("The garden path must be one winding line from the left edge to the right");
  }
  return route;
}

/** Path tiles in the order Pipo walks them. */
export const PATH_ROUTE: readonly Tile[] = walkPath();

/** Path tiles drawn past each end of the map, so the path leads off the scene. */
export const PATH_EXTENSION = 3;

/** The drawn path: the route plus a few tiles continuing straight out of each edge. */
export const PATH_DRAWN: readonly Tile[] = (() => {
  const first = PATH_ROUTE[0];
  const last = PATH_ROUTE.at(-1);
  if (!first || !last) return [];
  const before = Array.from({ length: PATH_EXTENSION }, (_, index) => ({
    x: first.x - PATH_EXTENSION + index,
    y: first.y,
  }));
  const after = Array.from({ length: PATH_EXTENSION }, (_, index) => ({
    x: last.x + 1 + index,
    y: last.y,
  }));
  return [...before, ...PATH_ROUTE, ...after];
})();

/** Index in PATH_ROUTE of the path tile next to this tile (sharing an edge), or -1. */
export function pathNeighbour({ x, y }: Tile): number {
  return PATH_ROUTE.findIndex((tile) => Math.abs(tile.x - x) + Math.abs(tile.y - y) === 1);
}

if (PLOTS.length !== GAME.garden.plotsPerGarden || DECOR_SLOTS.length !== GAME.garden.decorSlots) {
  throw new Error("Garden layout does not match GAME.garden");
}

export function plotTile(index: number): Tile {
  const tile = PLOTS[index];
  if (!tile) throw new Error(`No plot ${index}`);
  return tile;
}

export function decorTile(index: number): Tile {
  const tile = DECOR_SLOTS[index];
  if (!tile) throw new Error(`No decoration slot ${index}`);
  return tile;
}

/**
 * Projects a point of the grid (in tile units, may be fractional) to scene coordinates:
 * +x runs down-right, +y runs down-left, like the plots of a farm game.
 */
export function project(gridX: number, gridY: number): Point {
  return {
    x: ISO_ORIGIN.x + ((gridX - gridY) * TILE_W) / 2,
    y: ISO_ORIGIN.y + ((gridX + gridY) * TILE_H) / 2,
  };
}

/** Centre of a tile in scene coordinates (spec §4.2). */
export function tileCenter({ x, y }: Tile): Point {
  return project(x + 0.5, y + 0.5);
}

/** Where a standing object's anchor (trunk base, feet) sits on a tile. */
export function tileBase(tile: Tile): Point {
  const center = tileCenter(tile);
  return { x: center.x, y: center.y + 3 };
}

/** The four corners of a tile (top, right, bottom, left), for outlines. */
export function tileCorners({ x, y }: Tile): Point[] {
  return [project(x, y), project(x + 1, y), project(x + 1, y + 1), project(x, y + 1)];
}

/** Centre of the 2×2 pond area, or null if the layout has none. */
export function pondCenter(): Point | null {
  const [first] = POND_TILES;
  if (!first) return null;
  return project(first.x + 1, first.y + 1);
}
