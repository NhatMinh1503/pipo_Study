import { describe, expect, it } from "vitest";

import {
  canStartNode,
  computeTopicTree,
  parseSkillNode,
  PASS_ACCURACY,
  SKILL_TOPICS,
  skillNodeId,
} from "./topics";

const states = (tree: ReturnType<typeof computeTopicTree>, topic: string) =>
  tree.find((branch) => branch[0]?.topic === topic)?.map((node) => node.state);

describe("computeTopicTree", () => {
  it("has one branch per topic and one node per level of the language", () => {
    const ja = computeTopicTree("ja", "N5", []);
    expect(ja).toHaveLength(SKILL_TOPICS.length);
    expect(ja[0]?.map((node) => node.level)).toEqual(["N5", "N4", "N3", "N2", "N1"]);
    expect(computeTopicTree("en", "A1", [])[0]).toHaveLength(6);
  });

  it("opens only the first level for a beginner", () => {
    expect(states(computeTopicTree("ja", "N5", []), "travel")).toEqual([
      "open",
      "locked",
      "locked",
      "locked",
      "locked",
    ]);
  });

  it("opens every level up to the learner's own level (placement)", () => {
    expect(states(computeTopicTree("ja", "N3", []), "food")).toEqual([
      "open",
      "open",
      "open",
      "locked",
      "locked",
    ]);
  });

  it("passing a node opens the next one in the same topic only", () => {
    const tree = computeTopicTree("ja", "N5", [{ skill_node: "travel:N5", best_accuracy: 0.8 }]);
    expect(states(tree, "travel")).toEqual(["done", "open", "locked", "locked", "locked"]);
    expect(states(tree, "work")?.[1]).toBe("locked");
  });

  it("a lesson below the pass mark keeps the node open", () => {
    const tree = computeTopicTree("en", "A1", [
      { skill_node: "daily:A1", best_accuracy: PASS_ACCURACY - 0.01 },
    ]);
    expect(states(tree, "daily")?.slice(0, 2)).toEqual(["open", "locked"]);
  });

  it("an unknown learner level falls back to the first level", () => {
    expect(states(computeTopicTree("en", "N3", []), "school")?.[0]).toBe("open");
  });
});

describe("node ids", () => {
  it("round-trips a node id for the right language", () => {
    expect(parseSkillNode(skillNodeId("work", "B2"), "en")).toEqual({ topic: "work", level: "B2" });
  });

  it("rejects ids of another language, unknown topics and junk", () => {
    expect(parseSkillNode("work:B2", "ja")).toBeNull();
    expect(parseSkillNode("space:N3", "ja")).toBeNull();
    expect(parseSkillNode("", "ja")).toBeNull();
  });

  it("canStartNode refuses locked nodes", () => {
    const tree = computeTopicTree("ja", "N5", []);
    expect(canStartNode(tree, "daily:N5")).toBe(true);
    expect(canStartNode(tree, "daily:N4")).toBe(false);
    expect(canStartNode(tree, "daily:N9")).toBe(false);
  });
});
