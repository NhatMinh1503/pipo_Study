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
      hasCat: false,
      studiedToday: false,
    });
    expect(model.tiles.filter((tile) => tile.asset === "plot-soil")).toHaveLength(31);
    // 8 path tiles in the map plus one outside each end
    expect(model.tiles.filter((tile) => tile.asset === "tile-path")).toHaveLength(10);
    expect(model.tiles).toHaveLength(41);
    expect(model.tiles).toContainEqual({ asset: "plot-soil", ...tileCenter(plotTile(0)) });
    // Back to front
    const ys = model.tiles.map((tile) => tile.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect(model.pond).toBeNull();
  });

  it("draws the pond over its four tiles only when the learner owns one", () => {
    const model = buildSceneModel({ trees: [], hasPond: true, hasCat: false, studiedToday: false });
    expect(model.pond).toEqual(project(3, 4));
    expect(model.koi).toBe(true);
  });

  it("stands each tree on its plot with the right image", () => {
    const model = buildSceneModel({
      trees: [tree({ id: "a", plot: 9, species: "bamboo", sessions: 2 })],
      hasPond: false,
      hasCat: false,
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
      hasCat: false,
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
        tree({ id: "near", plot: 9 }), // (2,1): right above the path
        tree({ id: "young", plot: 10, sessions: 2 }), // (3,1): not mature
        tree({ id: "far", plot: 0 }), // (0,0): two rows away
      ],
      hasPond: false,
      hasCat: false,
      studiedToday: false,
    });
    expect(model.stops).toEqual([{ distance: waypointDistances[3], kind: "view" }]);
  });

  it("sorts trees back to front so lower ones are drawn on top", () => {
    const model = buildSceneModel({
      trees: [tree({ id: "low", plot: 30 }), tree({ id: "high", plot: 0 })],
      hasPond: false,
      hasCat: false,
      studiedToday: false,
    });
    expect(model.trees.map((item) => item.id)).toEqual(["high", "low"]);
  });

  it("stands placed decorations on their slots, with a sitting spot at a bench by the path", () => {
    const model = buildSceneModel({
      trees: [],
      hasPond: false,
      hasCat: false,
      studiedToday: false,
      decorations: [
        { itemId: "deco-bench", slot: 2 }, // (1,3): just below the path
        { itemId: "deco-lantern", slot: 4 }, // (5,4): two rows away
      ],
    });
    expect(model.decorations).toEqual([
      { id: "deco-bench", asset: "deco-bench", slot: 2, ...tileBase(decorTile(2)) },
      { id: "deco-lantern", asset: "deco-lantern", slot: 4, ...tileBase(decorTile(4)) },
    ]);
    expect(model.stops).toEqual([{ distance: waypointDistances[2], kind: "bench" }]);
  });
});
