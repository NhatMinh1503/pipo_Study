import { describe, expect, it } from "vitest";

import { plotTile, tileBase } from "./layout";
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
  it("covers the whole ground with tiles, path tiles on the path row", () => {
    const model = buildSceneModel({
      trees: [],
      hasPond: false,
      hasCat: false,
      studiedToday: false,
    });
    // 10 columns (map + one margin column each side) × 7 rows down to the bottom edge
    expect(model.tiles).toHaveLength(70);
    expect(model.tiles.filter((tile) => tile.asset === "tile-path")).toHaveLength(8);
    expect(model.pond).toBeNull();
  });

  it("draws the pond over its four tiles only when the learner owns one", () => {
    const model = buildSceneModel({ trees: [], hasPond: true, hasCat: false, studiedToday: false });
    expect(model.pond).toEqual({ x: 256, y: 288 });
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
});
