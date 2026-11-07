import { isBlooming, stageFor, treeAssetId, type TreeSpecies } from "./growth";
import {
  COLS,
  GRID,
  MAP_LEFT,
  MAP_TOP,
  ROWS,
  SCENE_HEIGHT,
  TILE_H,
  TILE_W,
  plotTile,
  pondCenter,
  tileBase,
  type Point,
} from "./layout";
import { waypointDistances } from "./path";
import type { PipoStop } from "./pipo-machine";

export interface SceneTree {
  id: string;
  plot: number;
  species: TreeSpecies;
  sessions: number;
}

export interface SceneInput {
  trees: readonly SceneTree[];
  hasPond: boolean;
  hasCat: boolean;
  /** Today had study activity: mature sakura are in bloom. */
  studiedToday: boolean;
}

export interface SceneModel {
  tiles: { asset: string; x: number; y: number }[];
  /** Back to front (by anchor y), so later items are drawn on top. */
  trees: ({ id: string; asset: string } & Point)[];
  pond: Point | null;
  koi: boolean;
  cat: boolean;
  /** Places Pipo may stop: viewing spots next to mature trees beside the path. */
  stops: PipoStop[];
  /** Blooming sakura canopies petals fall from. */
  petalSources: Point[];
}

const PATH_ROW = GRID.findIndex((row) => row.startsWith("="));

/**
 * Everything the garden scene draws, computed from real data without touching PixiJS
 * (garden-scene spec §3.3–3.4, §4.2). The renderer only turns this into sprites.
 */
export function buildSceneModel(input: SceneInput): SceneModel {
  const tiles: SceneModel["tiles"] = [];
  // The ground continues one column past each side of the map and down to the bottom edge
  const groundRows = Math.ceil((SCENE_HEIGHT - MAP_TOP) / TILE_H);
  for (let y = 0; y < groundRows; y += 1) {
    for (let x = -1; x <= COLS; x += 1) {
      const cell = y < ROWS && x >= 0 && x < COLS ? GRID[y]?.[x] : undefined;
      const asset =
        cell === "=" ? "tile-path" : (x * 7 + y * 3) % 5 === 0 ? "tile-grass-b" : "tile-grass-a";
      tiles.push({ asset, x: MAP_LEFT + (x + 0.5) * TILE_W, y: MAP_TOP + (y + 0.5) * TILE_H });
    }
  }

  const trees = input.trees
    .map((tree) => ({
      id: tree.id,
      asset: treeAssetId(tree, input.studiedToday),
      ...tileBase(plotTile(tree.plot)),
    }))
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const stopColumns = new Set<number>();
  for (const tree of input.trees) {
    const tile = plotTile(tree.plot);
    if (stageFor(tree.sessions) === "mature" && Math.abs(tile.y - PATH_ROW) === 1)
      stopColumns.add(tile.x);
  }
  const stops: PipoStop[] = [...stopColumns]
    .sort((a, b) => a - b)
    .map((column) => ({ distance: waypointDistances[column + 1] ?? 0, kind: "view" }));

  const petalSources = input.trees
    .filter((tree) => isBlooming(tree, input.studiedToday))
    .map((tree) => {
      const base = tileBase(plotTile(tree.plot));
      return { x: base.x, y: base.y - 72 };
    });

  return {
    tiles,
    trees,
    pond: input.hasPond ? pondCenter() : null,
    koi: input.hasPond,
    cat: input.hasCat,
    stops,
    petalSources,
  };
}
