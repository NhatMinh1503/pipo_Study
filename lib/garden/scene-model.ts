import { stageFor, isBlooming, type TreeSpecies } from "./growth";
import {
  DECOR_SLOTS,
  KOI_ORBIT,
  PLOTS,
  POND,
  decorPoint,
  plotPoint,
  type GroundPoint,
  type Point,
} from "./layout";
import { petModelId, treeModelId } from "./models";
import { closestOnPath } from "./path";
import { petFrames, type PetId } from "./pets";
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
  /** Owned pets, in catalog order (see ownedPets). */
  pets?: readonly PetId[];
  /** Owns the red bridge (the island model has one over its pond). */
  hasBridge?: boolean;
  /** Today had study activity: mature sakura are in bloom. */
  studiedToday: boolean;
}

export interface ScenePet {
  id: PetId;
  /** Its idle, second idle and skill pictures (see petFrames), for pets without a model. */
  frames: [string, string, string];
  /** Its 3D model, or null while it is still drawn from 2D frames. */
  model: string | null;
  /** Where it starts, as a share of the path length. */
  start: number;
  /** 1 walks toward the end of the path, -1 toward the start. */
  direction: 1 | -1;
}

export interface SceneModel {
  /** Every plot on the island, so the renderer can outline an empty one. */
  plots: readonly GroundPoint[];
  /** Back to front (by y), so overlapping trees sort naturally. */
  trees: ({ id: string; model: string; plot: number } & GroundPoint)[];
  decorations: ({ id: string; asset: string; slot: number } & GroundPoint)[];
  /** Decoration slots, for highlighting an empty one while placing. */
  decorSlots: readonly GroundPoint[];
  /** Koi swim in the island's pond once the learner owns the pond. */
  koi: { center: GroundPoint; orbit: Point } | null;
  /** Pets roaming the path, spread out along it and walking both ways. */
  pets: ScenePet[];
  /** Places Pipo may stop: viewing spots next to mature trees beside the path. */
  stops: PipoStop[];
  /** Blooming sakura petals fall from (the base of the tree; the renderer adds the canopy). */
  petalSources: GroundPoint[];
}

/** A plot or slot this close to the path (logical px) counts as "beside the path". */
export const BESIDE_PATH = 80;

/** Distance along the path to stop at beside a point, or null when it is too far away. */
function stopBeside(point: Point): number | null {
  const closest = closestOnPath(point);
  return closest.gap <= BESIDE_PATH ? Math.round(closest.distance * 10) / 10 : null;
}

/**
 * Everything the garden scene draws, computed from real data without touching three.js
 * (garden-scene spec §3.3–3.4, §4.2). The renderer only turns this into meshes.
 */
export function buildSceneModel(input: SceneInput): SceneModel {
  const trees = input.trees
    .map((tree) => ({
      id: tree.id,
      model: treeModelId(tree, input.studiedToday),
      plot: tree.plot,
      ...plotPoint(tree.plot),
    }))
    .sort((a, b) => a.y - b.y || a.x - b.x);

  // Pipo stops on the path beside a grown tree to look at it
  const viewStops = new Set<number>();
  for (const tree of input.trees) {
    const distance = stageFor(tree.sessions) === "mature" ? stopBeside(plotPoint(tree.plot)) : null;
    if (distance !== null) viewStops.add(distance);
  }

  const decorations = (input.decorations ?? [])
    .map((decoration) => ({
      id: decoration.itemId,
      asset: decoration.itemId,
      slot: decoration.slot,
      ...decorPoint(decoration.slot),
    }))
    .sort((a, b) => a.slot - b.slot);

  // Pipo sits on a bench placed beside the path (a bench wins over a view there)
  const benchStops = new Set<number>();
  for (const decoration of input.decorations ?? []) {
    const distance =
      decoration.itemId === "deco-bench" ? stopBeside(decorPoint(decoration.slot)) : null;
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
    .map((tree) => plotPoint(tree.plot));

  return {
    plots: PLOTS,
    trees,
    decorations,
    decorSlots: DECOR_SLOTS,
    koi: input.hasPond ? { center: POND, orbit: KOI_ORBIT } : null,
    pets: (input.pets ?? []).map((id, index, all) => ({
      id,
      frames: petFrames(id),
      model: petModelId(id),
      start: (index + 0.5) / all.length,
      direction: index % 2 === 0 ? -1 : 1,
    })),
    stops,
    petalSources,
  };
}
