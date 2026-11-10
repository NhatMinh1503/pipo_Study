import { describe, expect, it } from "vitest";

import { assetUrl, GARDEN_ASSETS, gardenAsset } from "./assets";

const ids = Object.keys(GARDEN_ASSETS);

// design/game/asset-prompts.md §7 and art-bible.md §6
describe("garden asset manifest", () => {
  it("lists the 43 files of the asset prompts plus the painted garden ground", () => {
    expect(ids).toHaveLength(49);
    expect(ids).toEqual(
      expect.arrayContaining(["bg-garden", "stone-a", "stone-b", "stone-c", "stone-d", "stone-e"]),
    );
    for (const species of ["pine", "bamboo", "maple", "sakura"]) {
      for (const stage of ["sprout", "sapling", "mature"]) {
        expect(ids).toContain(`tree-${species}-${stage}`);
      }
    }
    expect(ids).toContain("tree-sakura-mature-bloom");
    expect(ids).toEqual(
      expect.arrayContaining(["pipo-body", "pipo-eyes-open", "pipo-eyes-closed", "pipo-shadow"]),
    );
  });

  it("puts every anchor and attach point inside its image", () => {
    for (const id of ids) {
      const asset = gardenAsset(id);
      expect(asset.anchor.x, id).toBeGreaterThanOrEqual(0);
      expect(asset.anchor.x, id).toBeLessThanOrEqual(asset.width);
      expect(asset.anchor.y, id).toBeGreaterThanOrEqual(0);
      expect(asset.anchor.y, id).toBeLessThanOrEqual(asset.height);
    }
  });

  it("attaches Pipo's parts inside its body", () => {
    const body = gardenAsset("pipo-body");
    for (const id of ids.filter((name) => name.startsWith("pipo-") && name !== "pipo-body")) {
      const attach = gardenAsset(id).attach;
      expect(attach, id).toBeDefined();
      expect(attach?.x ?? -1, id).toBeLessThanOrEqual(body.width);
      expect(attach?.y ?? -1, id).toBeLessThanOrEqual(body.height + 2);
    }
  });

  it("uses the art bible sizes for tiles and tree stages", () => {
    expect(gardenAsset("tile-path")).toMatchObject({ width: 128, height: 48, kind: "tile" });
    expect(gardenAsset("plot-soil")).toMatchObject({ width: 76, height: 42 });
    expect(gardenAsset("tree-pine-sprout")).toMatchObject({ width: 28, height: 28 });
    expect(gardenAsset("tree-pine-sapling")).toMatchObject({ width: 48, height: 58 });
    expect(gardenAsset("tree-pine-mature")).toMatchObject({ width: 80, height: 96 });
    expect(gardenAsset("bg-garden")).toMatchObject({ width: 640, height: 432 });
  });

  it("serves @2x files from /garden/", () => {
    expect(assetUrl("pipo-body")).toBe("/garden/pipo-body@2x.png");
  });

  it("rejects an unknown asset id", () => {
    expect(() => gardenAsset("tree-oak-mature")).toThrow();
  });
});
