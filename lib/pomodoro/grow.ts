import type { TreeSpecies, TreeStage } from "@/lib/garden/growth";

/** The tree a focus session plants (Forest style: one session, one whole tree). */
export interface SessionTree {
  species: TreeSpecies;
}

/** The one picture of the tree shown now: its stage, opacity and scale. */
export interface TreeLayer {
  stage: TreeStage;
  opacity: number;
  scale: number;
}

/** Where the growing tree changes picture, as a share of the session. */
const SAPLING_AT = 1 / 3;
const MATURE_AT = 2 / 3;
/** The sprout fades in over the first moments of the session. */
const FADE_IN = 0.04;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (value: number) => 1 - (1 - value) ** 2;

/**
 * What the Pomodoro page shows while a session runs: the tree grows from sprout to young
 * tree to mature tree during the one session. Always a single picture (a new stage pops
 * in, never blended with the old one), and it keeps growing a little within each stage.
 * `progress` is the share of the session done (0–1).
 */
export function growthFrame(progress: number): TreeLayer {
  const p = clamp01(progress);
  if (p < SAPLING_AT) {
    const within = p / SAPLING_AT;
    return { stage: "sprout", opacity: clamp01(p / FADE_IN), scale: 0.7 + 0.3 * easeOut(within) };
  }
  if (p < MATURE_AT) {
    return { stage: "sapling", opacity: 1, scale: 0.82 + 0.18 * ((p - SAPLING_AT) / SAPLING_AT) };
  }
  return { stage: "mature", opacity: 1, scale: 0.85 + 0.15 * ((p - MATURE_AT) / (1 - MATURE_AT)) };
}

/** The finished tree, shown during the break after a completed session. */
export const GROWN_TREE: TreeLayer = { stage: "mature", opacity: 1, scale: 1 };

/** Before a session: a faint sprout of the chosen seed shows what will grow. */
export const SEED_PREVIEW: TreeLayer = { stage: "sprout", opacity: 0.75, scale: 0.85 };
