import { describe, expect, it } from "vitest";

import { DECOR_SLOTS, KOI_ORBIT, PLOTS, POND, decorPoint, plotPoint } from "./layout";
import { closestOnPath } from "./path";
import { buildSceneModel, type SceneTree } from "./scene-model";

const tree = (overrides: Partial<SceneTree>): SceneTree => ({
  id: "t",
  plot: 0,
  species: "pine",
  sessions: 4,
  ...overrides,
});

const empty = { trees: [], hasPond: false, pets: [], studiedToday: false };
const stopAt = (distance: number) => Math.round(distance * 10) / 10;

describe("garden scene model", () => {
  it("lists every plot and decoration slot of the island", () => {
    const model = buildSceneModel(empty);
    expect(model.plots).toBe(PLOTS);
    expect(model.decorSlots).toBe(DECOR_SLOTS);
    expect(model.koi).toBeNull();
  });

  it("spreads the 3D pets along the path, walking both ways, and leaves the 2D ones out", () => {
    const model = buildSceneModel({
      ...empty,
      pets: [
        "deco-slime",
        "pet-slime-moss",
        "pet-slime-ember",
        "pet-slime-cloud",
        "pet-slime-sakura",
      ],
    });
    expect(model.pets.map((pet) => [pet.id, pet.model])).toEqual([
      ["pet-slime-moss", "pet-moss-jelly"],
      ["pet-slime-ember", "pet-ember-lava"],
      ["pet-slime-sakura", "pet-sakura-mochi"],
    ]);
    expect(model.pets.map((pet) => pet.start)).toEqual([1 / 6, 3 / 6, 5 / 6]);
    expect(model.pets.map((pet) => pet.direction)).toEqual([-1, 1, -1]);
  });

  it("puts koi in the island's pond only when the learner owns the pond", () => {
    expect(buildSceneModel({ ...empty, hasPond: true }).koi).toEqual({
      center: POND,
      orbit: KOI_ORBIT,
    });
  });

  it("stands each tree on its plot with the right model", () => {
    const model = buildSceneModel({
      ...empty,
      trees: [tree({ id: "a", plot: 9, species: "bamboo", sessions: 2 })],
    });
    expect(model.trees).toEqual([{ id: "a", model: "bamboo-2", plot: 9, ...plotPoint(9) }]);
  });

  it("blooms mature sakura on study days and drops petals from them", () => {
    const input = { ...empty, trees: [tree({ id: "s", plot: 3, species: "sakura" })] };
    expect(buildSceneModel({ ...input, studiedToday: true }).trees[0]?.model).toBe("sakura-4");
    expect(buildSceneModel({ ...input, studiedToday: false }).trees[0]?.model).toBe(
      "sakura-4-green",
    );
    expect(buildSceneModel({ ...input, studiedToday: true }).petalSources).toEqual([plotPoint(3)]);
    expect(buildSceneModel({ ...input, studiedToday: false }).petalSources).toHaveLength(0);
  });

  it("lets Pipo stop next to mature trees beside the path only", () => {
    const model = buildSceneModel({
      ...empty,
      trees: [
        tree({ id: "near", plot: 11 }), // right by the path
        tree({ id: "young", plot: 15, sessions: 2 }), // by the path, not grown yet
        tree({ id: "far", plot: 0 }), // back corner, far from the path
      ],
    });
    expect(model.stops).toEqual([
      { distance: stopAt(closestOnPath(plotPoint(11)).distance), kind: "view" },
    ]);
  });

  it("sorts trees back to front", () => {
    const model = buildSceneModel({
      ...empty,
      trees: [tree({ id: "front", plot: 25 }), tree({ id: "back", plot: 0 })],
    });
    expect(model.trees.map((item) => item.id)).toEqual(["back", "front"]);
  });

  it("stands placed decorations on their slots, with a sitting spot at a bench by the path", () => {
    const model = buildSceneModel({
      ...empty,
      decorations: [
        { itemId: "deco-bench", slot: 1 }, // right beside the path
        { itemId: "deco-lantern", slot: 4 }, // by the path, but not a seat
      ],
    });
    expect(model.decorations).toEqual([
      { id: "deco-bench", asset: "deco-bench", slot: 1, ...decorPoint(1) },
      { id: "deco-lantern", asset: "deco-lantern", slot: 4, ...decorPoint(4) },
    ]);
    expect(model.stops).toEqual([
      { distance: stopAt(closestOnPath(decorPoint(1)).distance), kind: "bench" },
    ]);
  });

  it("does not stop at a bench far from the path", () => {
    const model = buildSceneModel({ ...empty, decorations: [{ itemId: "deco-bench", slot: 3 }] });
    expect(model.stops).toEqual([]);
  });

  it("keeps one stop per spot: two trees beside the same bit of path share it", () => {
    const model = buildSceneModel({
      ...empty,
      trees: [tree({ id: "a", plot: 9 }), tree({ id: "b", plot: 16 })],
    });
    expect(model.stops).toHaveLength(1);
  });

  it("leaves out trees on plots the island does not have instead of crashing", () => {
    const model = buildSceneModel({
      ...empty,
      trees: [tree({ id: "ok", plot: 25 }), tree({ id: "old", plot: 30, species: "sakura" })],
      studiedToday: true,
    });
    expect(model.trees.map((item) => item.id)).toEqual(["ok"]);
    expect(model.petalSources).toEqual([]);
  });
});
