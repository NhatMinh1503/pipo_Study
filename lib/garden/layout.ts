import { GAME } from "@/lib/game/config";

/**
 * The floating clay island the garden is built on (garden-scene spec §3.4, 3D version).
 * Positions were measured from the island model (public/garden3d/island.glb) seen from
 * above: x runs left to right, y from the back of the island to the front, both in logical
 * px with the island 640 px wide, like the old 2D scene. `h` is the height of the ground
 * there in the same units. Plots and slots are numbered in reading order (back row first);
 * plot indexes match garden_trees.plot_index.
 */

export interface Point {
  x: number;
  y: number;
}

export interface GroundPoint extends Point {
  /** Ground height at this point, logical px above the island's centre. */
  h: number;
}

/** The garden box keeps the old 2D proportions, so the page layout does not jump. */
export const SCENE_WIDTH = 640;
export const SCENE_HEIGHT = 432;

/** Ground the island covers seen from above, logical px (x across, y back to front). */
export const ISLAND_SIZE: Point = { x: 640, y: 500 };

/** Island model units to logical px (the model is 0.95 units wide). */
export const UNITS_TO_PX = 673.84;
/** Where the model's own origin sits in logical px. */
export const ISLAND_ORIGIN: Point = { x: 319.3, y: 253.2 };
/**
 * Box around the island model in world units (logical px, relative to ISLAND_ORIGIN, y up),
 * so the camera can be framed before the model has loaded.
 */
export const ISLAND_BOUNDS = {
  min: { x: -319.3, y: -111.4, z: -253.2 },
  max: { x: 320, y: 107.8, z: 252.9 },
} as const;

/** Height of the grass and the dirt path (they are level), logical px. */
export const GROUND_H = 78.5;

const ground = ([x, y, h]: readonly [number, number, number]): GroundPoint => ({ x, y, h });

/** Centres of the 26 tilled plots, the top of the soil as height. */
export const PLOTS: readonly GroundPoint[] = (
  [
    [86.8, 88.9, 87.2],
    [177.8, 88.9, 86.8],
    [267.4, 91.0, 86.6],
    [354.1, 91.7, 86.7],
    [426.7, 107.4, 83.7],
    [499.2, 103.1, 87.0],
    [566.8, 103.1, 86.8],
    [79.6, 175.6, 83.6],
    [169.2, 175.6, 86.7],
    [266.7, 175.6, 88.0],
    [359.8, 170.7, 85.2],
    [427.4, 174.2, 83.5],
    [83.2, 246.8, 85.8],
    [157.2, 248.9, 85.0],
    [611.6, 231.1, 84.9],
    [78.2, 315.7, 84.6],
    [286.6, 310.8, 86.5],
    [546.1, 290.8, 84.9],
    [611.6, 288.0, 85.4],
    [544.0, 359.1, 87.8],
    [74.0, 454.4, 85.7],
    [144.4, 446.6, 85.8],
    [215.5, 446.6, 85.7],
    [278.8, 440.2, 83.6],
    [483.6, 434.5, 86.8],
    [543.3, 426.0, 86.0],
  ] as const
).map(ground);

/** Grass spots for placed decorations (spec §3.5), off the path and the plots. */
export const DECOR_SLOTS: readonly GroundPoint[] = (
  [
    [462.2, 291.6, 78.5],
    [128.0, 330.7, 78.7],
    [492.1, 359.1, 78.5],
    [603.0, 369.8, 77.1],
    [227.6, 384.0, 78.5],
  ] as const
).map(ground);

/**
 * The sandy path in walking order, from the left edge of the island to the right edge.
 * Pipo and the pets walk a smooth curve through these points (lib/garden/path.ts).
 */
export const PATH_POINTS: readonly GroundPoint[] = (
  [
    [28.4, 387.6, 77.7],
    [85.3, 371.2, 78.8],
    [142.2, 355.6, 78.5],
    [179.2, 332.8, 78.5],
    [204.8, 297.2, 78.5],
    [238.2, 257.4, 78.5],
    [298.7, 243.2, 78.7],
    [369.8, 245.3, 78.5],
    [433.8, 229.0, 78.5],
    [497.8, 200.5, 78.1],
    [554.7, 179.2, 78.3],
    [608.0, 170.7, 74.6],
  ] as const
).map(ground);

/** The pond is part of the island model; koi swim around this point. */
export const POND: GroundPoint = { x: 379.7, y: 398.9, h: 78.5 };
/** Half size of the ellipse the koi swim, logical px. */
export const KOI_ORBIT: Point = { x: 34, y: 30 };

if (PLOTS.length !== GAME.garden.plotsPerGarden || DECOR_SLOTS.length !== GAME.garden.decorSlots) {
  throw new Error("The island layout and GAME.garden disagree about plot or slot counts");
}

export function plotPoint(index: number): GroundPoint {
  const point = PLOTS[index];
  if (!point) throw new Error(`No garden plot ${index}`);
  return point;
}

export function decorPoint(slot: number): GroundPoint {
  const point = DECOR_SLOTS[slot];
  if (!point) throw new Error(`No decoration slot ${slot}`);
  return point;
}

/** Shortest distance from a point to a polyline, logical px. */
export function distanceToPolyline(point: Point, line: readonly Point[]): number {
  let best = Infinity;
  for (let index = 0; index < line.length - 1; index += 1) {
    const a = line[index];
    const b = line[index + 1];
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy || 1;
    const t = Math.min(
      1,
      Math.max(0, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared),
    );
    best = Math.min(best, Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy)));
  }
  return best;
}
