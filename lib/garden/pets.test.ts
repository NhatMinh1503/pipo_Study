import { describe, expect, it } from "vitest";

import { gardenAsset } from "./assets";
import { PET_IDS, PETS, isPetId, ownedPets } from "./pets";

describe("garden pets", () => {
  it("has six slimes, the first one keeping its old shop id", () => {
    expect(PET_IDS).toEqual([
      "deco-slime",
      "pet-slime-water",
      "pet-slime-moss",
      "pet-slime-sakura",
      "pet-slime-ember",
      "pet-slime-cloud",
    ]);
  });

  it("draws every pet with art from the garden manifest", () => {
    for (const id of PET_IDS) expect(gardenAsset(PETS[id].asset).kind).toBe("sprite");
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
