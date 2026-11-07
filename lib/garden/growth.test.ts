import { describe, expect, it } from "vitest";

import { canPlant, isBlooming, sessionsToMature, stageFor, treeAssetId } from "./growth";

// garden-scene spec §3.1–3.3, §4.1 (test case #1)
describe("tree growth", () => {
  it.each([
    [1, "sprout"],
    [2, "sapling"],
    [3, "sapling"],
    [4, "mature"],
  ] as const)("%i session(s) → %s", (sessions, stage) => {
    expect(stageFor(sessions)).toBe(stage);
  });

  it("counts the sessions left until maturity", () => {
    expect(sessionsToMature(1)).toBe(3);
    expect(sessionsToMature(4)).toBe(0);
  });

  it("blooms only a mature sakura, and only when the learner studied today", () => {
    expect(isBlooming({ species: "sakura", sessions: 4 }, true)).toBe(true);
    expect(isBlooming({ species: "sakura", sessions: 4 }, false)).toBe(false);
    expect(isBlooming({ species: "sakura", sessions: 3 }, true)).toBe(false);
    expect(isBlooming({ species: "maple", sessions: 4 }, true)).toBe(false);
  });

  it("names the image for a tree", () => {
    expect(treeAssetId({ species: "pine", sessions: 2 }, false)).toBe("tree-pine-sapling");
    expect(treeAssetId({ species: "sakura", sessions: 4 }, true)).toBe("tree-sakura-mature-bloom");
  });

  it("lets everyone plant pine and bamboo, maple and sakura only with their seed", () => {
    expect(canPlant("pine", [])).toBe(true);
    expect(canPlant("bamboo", [])).toBe(true);
    expect(canPlant("sakura", [])).toBe(false);
    expect(canPlant("sakura", ["seed-sakura"])).toBe(true);
    expect(canPlant("maple", ["seed-sakura"])).toBe(false);
  });
});
