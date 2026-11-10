import { GAME } from "@/lib/game/config";
import { treeAssetId, type TreeSpecies } from "@/lib/garden/growth";

/** The tree a focus session tends: its species and the sessions it had before this one. */
export interface SessionTree {
  species: TreeSpecies;
  /** Sessions tended before the current one (0 = this session plants it). */
  fromSessions: number;
}

/** The one picture of the tree shown now, with its opacity and scale. */
export interface TreeLayer {
  assetId: string;
  opacity: number;
  scale: number;
}

/** When a tree that changes stage swaps to its next picture, as a share of the session. */
const SWAP_AT = 0.6;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (value: number) => 1 - (1 - value) ** 2;

/**
 * What the Pomodoro page shows while a session runs, so the learner watches this
 * session's growth. Always one picture of the tree's own species, never two blended: a new
 * tree pops up from the soil and grows; a tree that changes stage grows a little, then
 * swaps to its next stage (the page plays a pop when the picture changes); a tree that
 * keeps its stage still grows visibly. `progress` is the share of the session done (0–1).
 */
export function growthFrame(tree: SessionTree, progress: number): TreeLayer {
  const p = clamp01(progress);
  const fromSessions = Math.min(
    Math.max(0, Math.floor(tree.fromSessions)),
    GAME.garden.matureAtSessions - 1,
  );
  const afterId = treeAssetId({ species: tree.species, sessions: fromSessions + 1 }, false);

  if (fromSessions === 0) {
    return { assetId: afterId, opacity: clamp01(p / 0.08), scale: 0.35 + 0.65 * easeOut(p) };
  }

  const beforeId = treeAssetId({ species: tree.species, sessions: fromSessions }, false);
  if (beforeId === afterId) {
    return { assetId: afterId, opacity: 1, scale: 0.85 + 0.15 * p };
  }
  if (p < SWAP_AT) {
    return { assetId: beforeId, opacity: 1, scale: 1 + 0.08 * (p / SWAP_AT) };
  }
  return { assetId: afterId, opacity: 1, scale: 0.85 + 0.15 * ((p - SWAP_AT) / (1 - SWAP_AT)) };
}

/** The picture shown when no session runs: the growing tree as it is, or null (soil only). */
export function restingTree(tree: SessionTree): TreeLayer | null {
  if (tree.fromSessions <= 0) return null;
  const sessions = Math.min(Math.floor(tree.fromSessions), GAME.garden.matureAtSessions);
  return {
    assetId: treeAssetId({ species: tree.species, sessions }, false),
    opacity: 1,
    scale: 1,
  };
}
