import { describe, expect, it } from "vitest";

import { gardenAsset } from "./assets";
import { PET_IDS, isPetId, ownedPets, petFrames } from "./pets";

describe("garden pets", () => {
  it("has six pets, the first one keeping its old shop id", () => {
    expect(PET_IDS).toEqual([
      "deco-slime",
      "pet-slime-water",
      "pet-slime-moss",
      "pet-slime-sakura",
      "pet-slime-ember",
      "pet-slime-cloud",
    ]);
  });

  it("draws every pet with three same-sized frames from the garden manifest", () => {
    for (const id of PET_IDS) {
      const [idle, ...others] = petFrames(id).map(gardenAsset);
      expect(idle?.kind).toBe("sprite");
      for (const frame of others) expect(frame).toEqual(idle);
    }
  });

  it("lists owned pets in catalog order and ignores other items", () => {
    expect(ownedPets(["pet-slime-cloud", "deco-pond", "deco-slime"])).toEqual([
      "deco-slime",
      "pet-slime-cloud",
    ]);
    expect(ownedPets([])).toEqual([]);
    expect(isPetId("deco-pond")).toBe(false);
  });
});
