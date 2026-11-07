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
export const TILE_W = 64;
export const TILE_H = 48;
/** Left margin of the map inside the 640 px scene, and the sky band above it. */
export const MAP_LEFT = 64;
export const MAP_TOP = 96;
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

/** Centre of a tile in scene coordinates (spec §4.2). */
export function tileCenter({ x, y }: Tile): Point {
  return { x: MAP_LEFT + (x + 0.5) * TILE_W, y: MAP_TOP + (y + 0.5) * TILE_H };
}

/** Where a standing object's anchor (trunk base, feet) sits on a tile. */
export function tileBase({ x, y }: Tile): Point {
  return { x: MAP_LEFT + (x + 0.5) * TILE_W, y: MAP_TOP + (y + 1) * TILE_H - 6 };
}

/** Top-left of the 2×2 pond area, or null if the layout has none. */
export function pondCenter(): Point | null {
  const [first] = POND_TILES;
  if (!first) return null;
  return { x: MAP_LEFT + (first.x + 1) * TILE_W, y: MAP_TOP + (first.y + 1) * TILE_H };
}
