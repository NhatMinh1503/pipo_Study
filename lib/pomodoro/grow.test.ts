import { describe, expect, it } from "vitest";

import { growthFrame, restingTree } from "./grow";

describe("growthFrame", () => {
  it("pops a new tree out of the soil and grows it during its first session", () => {
    expect(growthFrame({ species: "pine", fromSessions: 0 }, 0)).toEqual({
      assetId: "tree-pine-sprout",
      opacity: 0,
      scale: 0.35,
    });
    expect(growthFrame({ species: "pine", fromSessions: 0 }, 1)).toEqual({
      assetId: "tree-pine-sprout",
      opacity: 1,
      scale: 1,
    });
  });

  it("swaps to the next stage without ever blending two pictures", () => {
    // 1 → 2 sessions: sprout → young tree
    const tree = { species: "maple", fromSessions: 1 } as const;
    expect(growthFrame(tree, 0.3)).toMatchObject({ assetId: "tree-maple-sprout", opacity: 1 });
    expect(growthFrame(tree, 0.59).assetId).toBe("tree-maple-sprout");
    expect(growthFrame(tree, 0.6)).toEqual({
      assetId: "tree-maple-sapling",
      opacity: 1,
      scale: 0.85,
    });
    expect(growthFrame(tree, 1)).toEqual({ assetId: "tree-maple-sapling", opacity: 1, scale: 1 });
    for (const p of [0, 0.2, 0.5, 0.65, 0.8, 1]) expect(growthFrame(tree, p).opacity).toBe(1);
  });

  it("keeps each species' own pictures", () => {
    expect(growthFrame({ species: "bamboo", fromSessions: 1 }, 1).assetId).toBe(
      "tree-bamboo-sapling",
    );
    expect(growthFrame({ species: "sakura", fromSessions: 0 }, 1).assetId).toBe(
      "tree-sakura-sprout",
    );
  });

  it("still grows a tree whose stage stays the same", () => {
    // 2 → 3 sessions: young tree stays young
    expect(growthFrame({ species: "bamboo", fromSessions: 2 }, 0)).toEqual({
      assetId: "tree-bamboo-sapling",
      opacity: 1,
      scale: 0.85,
    });
    expect(growthFrame({ species: "bamboo", fromSessions: 2 }, 1).scale).toBe(1);
  });

  it("reaches the mature tree on the last session, never the bloom picture", () => {
    expect(growthFrame({ species: "sakura", fromSessions: 3 }, 1).assetId).toBe(
      "tree-sakura-mature",
    );
  });

  it("clamps progress and session counts it cannot use", () => {
    expect(growthFrame({ species: "pine", fromSessions: 0 }, -1).scale).toBe(0.35);
    expect(growthFrame({ species: "pine", fromSessions: 0 }, 2).scale).toBe(1);
    // A tree already mature is treated as being on its last session
    expect(growthFrame({ species: "pine", fromSessions: 9 }, 1).assetId).toBe("tree-pine-mature");
  });
});

describe("restingTree", () => {
  it("shows bare soil before the first session", () => {
    expect(restingTree({ species: "pine", fromSessions: 0 })).toBeNull();
  });

  it("shows the growing tree at its current stage", () => {
    expect(restingTree({ species: "sakura", fromSessions: 2 })?.assetId).toBe(
      "tree-sakura-sapling",
    );
  });
});
