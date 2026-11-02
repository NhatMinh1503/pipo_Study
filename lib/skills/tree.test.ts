import { describe, expect, it } from "vitest";

import { computeSkillTree } from "./tree";

const zero = { lessonsCompleted: 0, wordsSaved: 0, reviews: 0, focusSessions: 0 };

describe("computeSkillTree", () => {
  it("starts with the first node of every branch open and the rest locked", () => {
    const tree = computeSkillTree(zero);
    expect(tree).toHaveLength(4);
    for (const branch of tree) {
      expect(branch.map((node) => node.state)).toEqual([
        "open",
        "locked",
        "locked",
        "locked",
        "locked",
      ]);
    }
  });

  it("completing a lesson unlocks the next node of the translate branch", () => {
    const [translate] = computeSkillTree({ ...zero, lessonsCompleted: 1 });
    expect(translate?.map((node) => node.state)).toEqual([
      "done",
      "open",
      "locked",
      "locked",
      "locked",
    ]);
    expect(translate?.[1]).toMatchObject({ threshold: 3, progress: 1 });
  });

  it("marks every reached goal done and caps progress at the threshold", () => {
    const [, vocabulary] = computeSkillTree({ ...zero, wordsSaved: 40 });
    expect(vocabulary?.map((node) => node.state)).toEqual([
      "done",
      "done",
      "done",
      "open",
      "locked",
    ]);
    expect(vocabulary?.[0]?.progress).toBe(5);
  });

  it("a fully completed branch has no open node", () => {
    const focus = computeSkillTree({ ...zero, focusSessions: 99 })[3];
    expect(focus?.every((node) => node.state === "done")).toBe(true);
  });
});
