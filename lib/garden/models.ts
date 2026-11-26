import { GAME } from "@/lib/game/config";

import { isBlooming, type TreeGrowth, type TreeSpecies } from "./growth";
import type { PetId } from "./pets";

/**
 * Which 3D clay model (public/garden3d/<id>.glb) draws each tree and pet. The models were
 * made in Meshy from the clay concept art, then shrunk with scripts/optimize-glb (weld,
 * simplify, WebP textures, meshopt) so the whole garden stays under 8 MB.
 */

/** Model name per species. The "maple" species is drawn (and now named) as an oak. */
const TREE_MODEL: Record<TreeSpecies, string> = {
  pine: "pine",
  bamboo: "bamboo",
  maple: "oak",
  sakura: "sakura",
};

/** The floating island the whole garden stands on. */
export const ISLAND_MODEL = "island";
/** Pipo, the chick with round glasses. */
export const PIPO_MODEL = "pipo";

/** Decorations that have a clay model (shop item id to model). */
const DECOR_MODEL: Record<string, string> = {
  "deco-torii": "deco-torii",
  "deco-lantern": "deco-lantern",
  "deco-bench": "deco-bench",
};

/** Model of a placed decoration, or null to draw its 2D picture. */
export function decorModelId(itemId: string): string | null {
  return DECOR_MODEL[itemId] ?? null;
}

/**
 * Model for a tree: one shared sprout for the first session, then a bigger model for each
 * session after it (-2, -3 and -4 = mature). A mature sakura is pink only on days the
 * learner studied (spec §3.3); otherwise its canopy is green.
 */
export function treeModelId(tree: TreeGrowth, studiedToday: boolean): string {
  const sessions = Math.min(Math.max(Math.trunc(tree.sessions), 1), GAME.garden.matureAtSessions);
  if (sessions <= 1) return "sprout";
  const base = `${TREE_MODEL[tree.species]}-${sessions}`;
  if (tree.species === "sakura" && sessions === GAME.garden.matureAtSessions) {
    return isBlooming(tree, studiedToday) ? base : `${base}-green`;
  }
  return base;
}

/** Pets that already have a 3D model; the others are still drawn from their 2D frames. */
const PET_MODEL: Partial<Record<PetId, string>> = {
  "pet-slime-ember": "pet-ember-lava",
  "pet-slime-sakura": "pet-sakura-mochi",
  "pet-slime-moss": "pet-moss-jelly",
};

export function petModelId(id: PetId): string | null {
  return PET_MODEL[id] ?? null;
}

/**
 * Pets shown in the garden: only those with a 3D model. Minh asked to drop the 2D pets
 * (26/11/2026); the others come back as their clay models are made.
 */
export function gardenPets(pets: readonly PetId[]): PetId[] {
  return pets.filter((id) => petModelId(id) !== null);
}

export function modelUrl(id: string): string {
  return `/garden3d/${id}.glb`;
}

/** Every model file the garden may load, for the asset check test. */
export function allModelIds(): string[] {
  const trees = Object.values(TREE_MODEL).flatMap((name) =>
    [2, 3, 4].map((step) => `${name}-${step}`),
  );
  return [
    ISLAND_MODEL,
    PIPO_MODEL,
    "sprout",
    ...trees,
    "sakura-4-green",
    ...Object.values(PET_MODEL),
    ...Object.values(DECOR_MODEL),
  ];
}
