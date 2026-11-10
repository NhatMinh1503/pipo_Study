import { isBlooming, stageFor, treeAssetId, type TreeSpecies } from "./growth";
import {
  PATH_DRAWN,
  PLOTS,
  decorTile,
  pathNeighbour,
  plotTile,
  pondCenter,
  tileBase,
  tileCenter,
  type Point,
  type Tile,
} from "./layout";
import { pathLength, pointAt, waypointDistances } from "./path";
import type { PipoStop } from "./pipo-machine";

export interface SceneTree {
  id: string;
  plot: number;
  species: TreeSpecies;
  sessions: number;
}

export interface SceneDecoration {
  /** Shop item id; the image has the same name (deco-lantern, deco-bench…). */
  itemId: string;
  slot: number;
}

export interface SceneInput {
  trees: readonly SceneTree[];
  /** Decorations placed in this garden's slots (spec §3.5). */
  decorations?: readonly SceneDecoration[];
  hasPond: boolean;
  hasSlime: boolean;
  /** Owns the red bridge; it is drawn across the pond, so it needs the pond too. */
  hasBridge?: boolean;
  /** Today had study activity: mature sakura are in bloom. */
  studiedToday: boolean;
}

export interface SceneStone extends Point {
  asset: string;
  scale: number;
  /** Mirrored left to right, so the few stone pictures do not repeat. */
  flip: boolean;
}

export interface SceneModel {
  /** Tilled plots, back to front, positioned at their tile centre. */
  tiles: { asset: string; x: number; y: number }[];
  /** Tiles the dirt path covers (it runs past both map edges); the renderer softens its edge. */
  pathTiles: readonly Tile[];
  /** Stepping stones along the path, back to front. */
  stones: SceneStone[];
  /** Back to front (by anchor y), so later items are drawn on top. */
  trees: ({ id: string; asset: string } & Point)[];
  decorations: ({ id: string; asset: string; slot: number } & Point)[];
  pond: Point | null;
  /** Where the bridge stands across the pond, or null. */
  bridge: Point | null;
  koi: boolean;
  slime: boolean;
  /** Places Pipo may stop: viewing spots next to mature trees beside the path. */
  stops: PipoStop[];
  /** Blooming sakura canopies petals fall from. */
  petalSources: Point[];
}

export const STONE_ASSETS = ["stone-a", "stone-b", "stone-c", "stone-d", "stone-e"] as const;
/** Distance between stepping stones along the path, logical px. */
const STONE_SPACING = 30;

/**
 * Stepping stones every few steps along the path, a little left and right of its middle.
 * Fixed by position (no randomness) so the garden looks the same on every visit.
 */
function steppingStones(): SceneStone[] {
  const stones: SceneStone[] = [];
  const total = pathLength();
  for (let index = 0, distance = 14; distance < total - 10; index += 1) {
    const at = pointAt(distance);
    const ahead = pointAt(distance + 1);
    const length = Math.hypot(ahead.x - at.x, ahead.y - at.y) || 1;
    // Sideways on the ground: perpendicular to the walking direction, flattened like the tiles
    const side = index % 2 === 0 ? -1 : 1;
    const normal = { x: -(ahead.y - at.y) / length, y: (ahead.x - at.x) / length / 2 };
    stones.push({
      asset: STONE_ASSETS[(index * 3) % STONE_ASSETS.length] ?? "stone-a",
      x: Math.round((at.x + normal.x * side * 3) * 10) / 10,
      y: Math.round((at.y + normal.y * side * 3) * 10) / 10,
      scale: 0.66 + ((index * 5) % 4) * 0.06,
      flip: (index * 7) % 3 === 1,
    });
    distance += STONE_SPACING + ((index * 11) % 3) * 3;
  }
  return stones.sort((a, b) => a.y - b.y);
}

const STONES = steppingStones();

/** Waypoint distance of the path tile beside this tile, or null when it is not by the path. */
function stopBeside(tile: Tile): number | null {
  const index = pathNeighbour(tile);
  return index < 0 ? null : (waypointDistances[index + 1] ?? null);
}

/** The bridge stands on the near half of the pond so it reads as crossing the water. */
function bridgeOverPond(): Point | null {
  const center = pondCenter();
  return center ? { x: center.x, y: center.y + 14 } : null;
}

/**
 * Everything the garden scene draws, computed from real data without touching PixiJS
 * (garden-scene spec §3.3–3.4, §4.2). The renderer only turns this into sprites.
 */
export function buildSceneModel(input: SceneInput): SceneModel {
  // The meadow is part of the painted backdrop; plots sit on it as tiles
  const tiles: SceneModel["tiles"] = PLOTS.map((tile) => ({
    asset: "plot-soil",
    ...tileCenter(tile),
  })).sort((a, b) => a.y - b.y || a.x - b.x);

  const trees = input.trees
    .map((tree) => ({
      id: tree.id,
      asset: treeAssetId(tree, input.studiedToday),
      ...tileBase(plotTile(tree.plot)),
    }))
    .sort((a, b) => a.y - b.y || a.x - b.x);

  // Pipo stops on the path tile beside a grown tree to look at it
  const viewStops = new Set<number>();
  for (const tree of input.trees) {
    const distance = stageFor(tree.sessions) === "mature" ? stopBeside(plotTile(tree.plot)) : null;
    if (distance !== null) viewStops.add(distance);
  }
  const decorations = (input.decorations ?? [])
    .map((decoration) => ({
      id: decoration.itemId,
      asset: decoration.itemId,
      slot: decoration.slot,
      ...tileBase(decorTile(decoration.slot)),
    }))
    .sort((a, b) => a.slot - b.slot);

  // Pipo sits on a bench placed right beside the path (a bench wins over a view there)
  const benchStops = new Set<number>();
  for (const decoration of input.decorations ?? []) {
    const distance =
      decoration.itemId === "deco-bench" ? stopBeside(decorTile(decoration.slot)) : null;
    if (distance !== null) benchStops.add(distance);
  }

  const stops: PipoStop[] = [
    ...[...viewStops]
      .filter((distance) => !benchStops.has(distance))
      .map((distance) => ({ distance, kind: "view" as const })),
    ...[...benchStops].map((distance) => ({ distance, kind: "bench" as const })),
  ].sort((a, b) => a.distance - b.distance);

  const petalSources = input.trees
    .filter((tree) => isBlooming(tree, input.studiedToday))
    .map((tree) => {
      const base = tileBase(plotTile(tree.plot));
      return { x: base.x, y: base.y - 64 };
    });

  return {
    tiles,
    pathTiles: PATH_DRAWN,
    stones: STONES,
    trees,
    decorations,
    pond: input.hasPond ? pondCenter() : null,
    bridge: input.hasPond && input.hasBridge ? bridgeOverPond() : null,
    koi: input.hasPond,
    slime: input.hasSlime,
    stops,
    petalSources,
  };
}
