export interface LearnerStats {
  lessonsCompleted: number;
  wordsSaved: number;
  reviews: number;
  focusSessions: number;
}

export type BranchId = "translate" | "vocabulary" | "review" | "focus";

interface BranchDefinition {
  id: BranchId;
  stat: keyof LearnerStats;
  /** Thresholds of the five nodes, from first to last. */
  thresholds: readonly number[];
}

/** The skill tree: four branches, each a ladder of goals unlocked in order. */
export const SKILL_TREE: readonly BranchDefinition[] = [
  { id: "translate", stat: "lessonsCompleted", thresholds: [1, 3, 5, 10, 20] },
  { id: "vocabulary", stat: "wordsSaved", thresholds: [5, 15, 30, 60, 100] },
  { id: "review", stat: "reviews", thresholds: [10, 30, 80, 150, 300] },
  { id: "focus", stat: "focusSessions", thresholds: [1, 3, 7, 15, 30] },
];

export type NodeState = "done" | "open" | "locked";

export interface SkillNode {
  branch: BranchId;
  tier: number;
  threshold: number;
  progress: number;
  state: NodeState;
}

/**
 * Node states from the learner's stats: reached goals are done, the next one is open
 * (shows progress), everything after it stays locked until the previous node is done.
 */
export function computeSkillTree(stats: LearnerStats): SkillNode[][] {
  return SKILL_TREE.map((branch) => {
    const value = stats[branch.stat];
    let previousDone = true;
    return branch.thresholds.map((threshold, tier) => {
      const state: NodeState = !previousDone ? "locked" : value >= threshold ? "done" : "open";
      previousDone = state === "done";
      return { branch: branch.id, tier, threshold, progress: Math.min(value, threshold), state };
    });
  });
}
