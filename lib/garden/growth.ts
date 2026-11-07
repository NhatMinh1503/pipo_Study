import { GAME } from "@/lib/game/config";

export const TREE_SPECIES = ["pine", "bamboo", "maple", "sakura"] as const;
export type TreeSpecies = (typeof TREE_SPECIES)[number];
export type TreeStage = "sprout" | "sapling" | "mature";

export interface TreeGrowth {
  species: TreeSpecies;
  /** Sessions tended, 1–4. */
  sessions: number;
}

/** Stage from sessions tended (garden-scene spec §4.1). */
export function stageFor(sessions: number): TreeStage {
  if (sessions >= GAME.garden.matureAtSessions) return "mature";
  if (sessions >= GAME.garden.saplingAtSessions) return "sapling";
  return "sprout";
}

export function sessionsToMature(sessions: number): number {
  return Math.max(0, GAME.garden.matureAtSessions - sessions);
}

/** A mature sakura is in bloom on days the learner studied (spec §3.3). */
export function isBlooming(tree: TreeGrowth, studiedToday: boolean): boolean {
  return tree.species === "sakura" && stageFor(tree.sessions) === "mature" && studiedToday;
}

export function treeAssetId(tree: TreeGrowth, studiedToday: boolean): string {
  const base = `tree-${tree.species}-${stageFor(tree.sessions)}`;
  return isBlooming(tree, studiedToday) ? `${base}-bloom` : base;
}

/** Mirrors SQL can_plant_species: free species, or the learner owns seed-<species>. */
export function canPlant(species: TreeSpecies, ownedItemIds: readonly string[]): boolean {
  return (
    GAME.garden.freeSpecies.some((free) => free === species) ||
    ownedItemIds.includes(`seed-${species}`)
  );
}

export function isTreeSpecies(value: string): value is TreeSpecies {
  return TREE_SPECIES.some((species) => species === value);
}
