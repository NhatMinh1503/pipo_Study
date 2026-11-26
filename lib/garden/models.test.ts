import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { allModelIds, decorModelId, gardenPets, modelUrl, petModelId, treeModelId } from "./models";

describe("garden 3D models", () => {
  it("grows a shared sprout into a bigger model each session", () => {
    expect(treeModelId({ species: "pine", sessions: 1 }, false)).toBe("sprout");
    expect(treeModelId({ species: "pine", sessions: 2 }, false)).toBe("pine-2");
    expect(treeModelId({ species: "bamboo", sessions: 3 }, false)).toBe("bamboo-3");
    expect(treeModelId({ species: "pine", sessions: 4 }, false)).toBe("pine-4");
    // Sessions never go past mature
    expect(treeModelId({ species: "pine", sessions: 9 }, false)).toBe("pine-4");
  });

  it("draws the maple species as an oak", () => {
    expect(treeModelId({ species: "maple", sessions: 4 }, true)).toBe("oak-4");
  });

  it("makes a mature sakura pink only on days the learner studied", () => {
    expect(treeModelId({ species: "sakura", sessions: 4 }, true)).toBe("sakura-4");
    expect(treeModelId({ species: "sakura", sessions: 4 }, false)).toBe("sakura-4-green");
    expect(treeModelId({ species: "sakura", sessions: 3 }, true)).toBe("sakura-3");
  });

  it("has a model for the ember, sakura, moss and cloud pets", () => {
    expect(petModelId("pet-slime-ember")).toBe("pet-ember-lava");
    expect(petModelId("pet-slime-sakura")).toBe("pet-sakura-mochi");
    expect(petModelId("pet-slime-moss")).toBe("pet-moss-jelly");
    expect(petModelId("deco-slime")).toBeNull();
    expect(petModelId("pet-slime-cloud")).toBe("pet-cloud");
    expect(petModelId("pet-slime-water")).toBeNull();
  });

  it("draws the torii, lantern and bench with clay models", () => {
    expect(decorModelId("deco-torii")).toBe("deco-torii");
    expect(decorModelId("deco-bench")).toBe("deco-bench");
    expect(decorModelId("deco-pond")).toBeNull();
  });

  it("shows only the pets that have a 3D model", () => {
    expect(
      gardenPets(["deco-slime", "pet-slime-ember", "pet-slime-water", "pet-slime-moss"]),
    ).toEqual(["pet-slime-ember", "pet-slime-moss"]);
  });

  it("ships every model file in public/garden3d", () => {
    for (const id of allModelIds()) {
      expect(modelUrl(id)).toBe(`/garden3d/${id}.glb`);
      expect(existsSync(join(process.cwd(), "public", modelUrl(id))), id).toBe(true);
    }
  });
});
