import {
  LEVELS_BY_LANGUAGE,
  type LearningLanguage,
  type ProficiencyLevel,
} from "@/lib/schemas/common";

/** Topic branches of the skill tree; each has one node per level of the language. */
export const SKILL_TOPICS = ["daily", "food", "travel", "school", "work", "technology"] as const;
export type SkillTopic = (typeof SKILL_TOPICS)[number];

/** English topic names sent to the lesson generator (UI names come from next-intl). */
export const TOPIC_PROMPTS: Record<SkillTopic, string> = {
  daily: "daily life, family and home",
  food: "food, cooking and restaurants",
  travel: "travel, transport and directions",
  school: "school, study and friends",
  work: "work, jobs and the office",
  technology: "technology, the internet and AI",
};

/** A finished lesson passes its node at this accuracy (sentence points / max points). */
export const PASS_ACCURACY = 0.6;

export type TopicNodeState = "done" | "open" | "locked";

export interface TopicNode {
  id: string;
  topic: SkillTopic;
  level: ProficiencyLevel;
  tier: number;
  state: TopicNodeState;
  /** Best accuracy of a finished lesson on this node, 0–1; null if none yet. */
  bestAccuracy: number | null;
}

export interface NodeProgress {
  skill_node: string;
  best_accuracy: number;
}

/** Node id stored on lessons.skill_node. */
export function skillNodeId(topic: SkillTopic, level: ProficiencyLevel): string {
  return `${topic}:${level}`;
}

/** Parses a node id; null when it is not a node of this language's tree. */
export function parseSkillNode(
  id: string,
  language: LearningLanguage,
): { topic: SkillTopic; level: ProficiencyLevel } | null {
  const [topic, level] = id.split(":");
  const topicMatch = SKILL_TOPICS.find((value) => value === topic);
  const levelMatch = (LEVELS_BY_LANGUAGE[language] as readonly ProficiencyLevel[]).find(
    (value) => value === level,
  );
  return topicMatch && levelMatch ? { topic: topicMatch, level: levelMatch } : null;
}

/**
 * Node states for one learner. Nodes up to the learner's own level start open (placement:
 * an N2 learner does not have to grind N5 first); above it, a node opens when the node below
 * in the same topic is passed. A passed node is done whatever its position.
 */
export function computeTopicTree(
  language: LearningLanguage,
  learnerLevel: ProficiencyLevel,
  progress: readonly NodeProgress[],
): TopicNode[][] {
  const levels = LEVELS_BY_LANGUAGE[language] as readonly ProficiencyLevel[];
  const placement = Math.max(0, levels.indexOf(learnerLevel));
  const best = new Map(progress.map((row) => [row.skill_node, Number(row.best_accuracy)]));

  return SKILL_TOPICS.map((topic) => {
    let previousDone = false;
    return levels.map((level, tier) => {
      const id = skillNodeId(topic, level);
      const accuracy = best.get(id) ?? null;
      const passed = accuracy !== null && accuracy >= PASS_ACCURACY;
      const state: TopicNodeState = passed
        ? "done"
        : tier <= placement || previousDone
          ? "open"
          : "locked";
      previousDone = passed;
      return { id, topic, level, tier, state, bestAccuracy: accuracy };
    });
  });
}

/** True when the learner may start a lesson on this node now. */
export function canStartNode(tree: TopicNode[][], id: string): boolean {
  return tree.some((branch) => branch.some((node) => node.id === id && node.state !== "locked"));
}
