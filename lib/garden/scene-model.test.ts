import { describe, expect, it } from "vitest";

import { decorTile, plotTile, project, tileBase, tileCenter } from "./layout";
import { waypointDistances } from "./path";
import { buildSceneModel, type SceneTree } from "./scene-model";

const tree = (overrides: Partial<SceneTree>): SceneTree => ({
  id: "t",
  plot: 0,
  species: "pine",
  sessions: 4,
  ...overrides,
});

describe("garden scene model", () => {
  it("draws a tilled plot on every plot tile and a path that runs past both map edges", () => {
    const model = buildSceneModel({
      trees: [],
      hasPond: false,
      pets: [],
      studiedToday: false,
    });
    expect(model.tiles).toHaveLength(31);
    expect(model.tiles.every((tile) => tile.asset === "plot-soil")).toBe(true);
    // 14 path tiles in the map plus three past each edge
    expect(model.pathTiles).toHaveLength(20);
    expect(model.tiles).toContainEqual({ asset: "plot-soil", ...tileCenter(plotTile(0)) });
    // Back to front
    const ys = model.tiles.map((tile) => tile.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect(model.pond).toBeNull();
  });

  it("spreads owned pets along the path, walking both ways", () => {
    const model = buildSceneModel({
      trees: [],
      hasPond: false,
      pets: ["deco-slime", "pet-slime-water", "pet-slime-cloud"],
      studiedToday: false,
    });
    expect(model.pets.map((pet) => [pet.id, pet.asset, pet.motion])).toEqual([
      ["deco-slime", "slime", "hop"],
      ["pet-slime-water", "slime-water", "hop"],
      ["pet-slime-cloud", "slime-cloud", "float"],
    ]);
    expect(model.pets.map((pet) => pet.start)).toEqual([1 / 6, 3 / 6, 5 / 6]);
    expect(model.pets.map((pet) => pet.direction)).toEqual([-1, 1, -1]);
  });

  it("lays stepping stones along the path, the same on every visit, back to front", () => {
    const input = { trees: [], hasPond: false, pets: [], studiedToday: false };
    const { stones } = buildSceneModel(input);
    expect(stones.length).toBeGreaterThan(15);
    expect(buildSceneModel(input).stones).toEqual(stones);
    const ys = stones.map((stone) => stone.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect(stones.every((stone) => stone.asset.startsWith("stone-"))).toBe(true);
  });

  it("draws the pond over its four tiles only when the learner owns one", () => {
    const model = buildSceneModel({
      trees: [],
      hasPond: true,
      pets: [],
      studiedToday: false,
    });
    expect(model.pond).toEqual(project(5, 5));
    expect(model.koi).toBe(true);
    expect(model.bridge).toBeNull();
  });

  it("puts the bridge across the pond, and only when there is a pond", () => {
    const withPond = buildSceneModel({
      trees: [],
      hasPond: true,
      pets: [],
      hasBridge: true,
      studiedToday: false,
    });
    expect(withPond.bridge?.x).toBe(project(5, 5).x);
    const noPond = buildSceneModel({
      trees: [],
      hasPond: false,
      pets: [],
      hasBridge: true,
      studiedToday: false,
    });
    expect(noPond.bridge).toBeNull();
  });

  it("stands each tree on its plot with the right image", () => {
    const model = buildSceneModel({
      trees: [tree({ id: "a", plot: 9, species: "bamboo", sessions: 2 })],
      hasPond: false,
      pets: [],
      studiedToday: false,
    });
    expect(model.trees).toEqual([
      { id: "a", asset: "tree-bamboo-sapling", ...tileBase(plotTile(9)) },
    ]);
  });

  it("blooms mature sakura on study days and drops petals from them", () => {
    const input = {
      trees: [tree({ id: "s", plot: 3, species: "sakura" })],
      hasPond: false,
      pets: [],
    };
    expect(buildSceneModel({ ...input, studiedToday: true }).trees[0]?.asset).toBe(
      "tree-sakura-mature-bloom",
    );
    expect(buildSceneModel({ ...input, studiedToday: true }).petalSources).toHaveLength(1);
    expect(buildSceneModel({ ...input, studiedToday: false }).petalSources).toHaveLength(0);
  });

  it("lets Pipo stop next to mature trees beside the path only", () => {
    const model = buildSceneModel({
      trees: [
        tree({ id: "near", plot: 18 }), // (3,3): beside path tile 3, (2,3)
        tree({ id: "young", plot: 12, sessions: 2 }), // (4,1): by the path, not mature
        tree({ id: "far", plot: 0 }), // (0,0): away from the path
      ],
      hasPond: false,
      pets: [],
      studiedToday: false,
    });
    expect(model.stops).toEqual([{ distance: waypointDistances[4], kind: "view" }]);
  });

  it("sorts trees back to front so lower ones are drawn on top", () => {
    const model = buildSceneModel({
      trees: [tree({ id: "low", plot: 30 }), tree({ id: "high", plot: 0 })],
      hasPond: false,
      pets: [],
      studiedToday: false,
    });
    expect(model.trees.map((item) => item.id)).toEqual(["high", "low"]);
  });

  it("stands placed decorations on their slots, with a sitting spot at a bench by the path", () => {
    const model = buildSceneModel({
      trees: [],
      hasPond: false,
      pets: [],
      studiedToday: false,
      decorations: [
        { itemId: "deco-bench", slot: 1 }, // (5,2): beside path tile 6, (4,2)
        { itemId: "deco-lantern", slot: 4 }, // (3,4): by the path, but not a seat
      ],
    });
    expect(model.decorations).toEqual([
      { id: "deco-bench", asset: "deco-bench", slot: 1, ...tileBase(decorTile(1)) },
      { id: "deco-lantern", asset: "deco-lantern", slot: 4, ...tileBase(decorTile(4)) },
    ]);
    expect(model.stops).toEqual([{ distance: waypointDistances[7], kind: "bench" }]);
  });

  it("keeps one stop per path tile: a bench there wins over a view", () => {
    const model = buildSceneModel({
      trees: [tree({ id: "by-bench", plot: 12 })], // (4,1): beside path tile 6, like the bench
      decorations: [{ itemId: "deco-bench", slot: 1 }],
      hasPond: false,
      pets: [],
      studiedToday: false,
    });
    expect(model.stops).toEqual([{ distance: waypointDistances[7], kind: "bench" }]);
  });
});
