import { GAME } from "@/lib/game/config";

/**
 * The fixed garden map (garden-scene spec §3.4): T tree plot, D decoration slot, = path,
 * W pond (grass when the learner has no pond). Plots and slots are numbered in reading order;
 * plot indexes match garden_trees.plot_index.
 */
export const GRID = [
  "TTTTTTTT",
  "TDTTTTDT",
  "========",
  "TDWWDTTT",
  "TTWWTDTT",
  "TTTTTTTT",
] as const;

export const COLS = 8;
export const ROWS = 6;
/** Isometric diamond tile, 2:1 like farm games (garden-scene spec §4.2). */
export const TILE_W = 80;
export const TILE_H = 40;
/** Screen position of the map's top corner (grid point 0,0). */
export const ISO_ORIGIN = { x: 280, y: 136 } as const;
/** Where the grass meets the distant hills. */
export const HORIZON_Y = 118;
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
