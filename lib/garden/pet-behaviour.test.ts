import { describe, expect, it } from "vitest";

import {
  CloudSlime,
  EmberSprite,
  FloatingPet,
  HoppingPet,
  PET_SKILL_COOLDOWN,
  PeachSpirit,
  SakuraBunny,
  createPetBehaviour,
  type PetWorld,
} from "./pet-behaviour";
import { PET_IDS, PETS } from "./pets";

const PATH = 400;
const world = (random = () => 0.99, moving = true): PetWorld => ({
  pathLength: PATH,
  moving,
  random,
});
const options = { start: 0.5, direction: 1 as const, phase: 0, pathLength: PATH };

describe("pet behaviour", () => {
  it("gives every pet its own species class, all sharing the base behaviour", () => {
    const pets = PET_IDS.map((id) => createPetBehaviour(id, options));
    expect(pets[0]).toBeInstanceOf(PeachSpirit);
    expect(pets[4]).toBeInstanceOf(EmberSprite);
    expect(pets[5]).toBeInstanceOf(CloudSlime);
    expect(pets[5]).toBeInstanceOf(FloatingPet);
    expect(pets.slice(0, 5).every((pet) => pet instanceof HoppingPet)).toBe(true);
    expect(new Set(pets.map((pet) => pet.constructor)).size).toBe(PET_IDS.length);
  });

  it("walks along the path and turns around at the end", () => {
    const pet = createPetBehaviour("pet-slime-ember", { ...options, start: 0.99 });
    const speed = PETS["pet-slime-ember"].speed;
    pet.update(0.1, world());
    expect(pet.distance).toBeCloseTo(0.99 * PATH + speed * 0.1);
    pet.update(1, world());
    expect(pet.distance).toBe(PATH);
    expect(pet.direction).toBe(-1);
  });

  it("stands still and uses its skill when tapped, then can use it again after a pause", () => {
    const pet = createPetBehaviour("deco-slime", options);
    const seconds = PETS["deco-slime"].skillSeconds;
    expect(pet.useSkill()).toBe(true);
    expect(pet.useSkill()).toBe(false); // already running
    const before = pet.distance;
    pet.update(seconds / 2, world());
    expect(pet.distance).toBe(before);
    expect(pet.skillProgress).toBeCloseTo(0.5);
    expect(pet.pose(world()).frame).toBe("skill");
    pet.update(seconds / 2, world());
    expect(pet.usingSkill).toBe(false);
    expect(pet.useSkill()).toBe(false); // cooling down
    pet.update(PET_SKILL_COOLDOWN, world());
    expect(pet.useSkill()).toBe(true);
  });

  it("sometimes rests, and may show off its skill on its own while resting", () => {
    const pet = createPetBehaviour("pet-slime-moss", options);
    pet.update(
      0.1,
      world(() => 0),
    ); // rolls 0: stops for a rest
    expect(pet.resting).toBe(true);
    expect(
      pet.update(
        0.1,
        world(() => 0),
      ),
    ).toEqual(["skill"]);
    expect(pet.usingSkill).toBe(true);
  });

  it("does not move under reduced motion, but a tap still shows the skill picture", () => {
    const pet = createPetBehaviour("pet-slime-water", options);
    const before = pet.distance;
    pet.update(
      1,
      world(() => 0, false),
    );
    expect(pet.distance).toBe(before);
    expect(pet.resting).toBe(false);
    pet.useSkill();
    const pose = pet.pose(world(() => 0, false));
    expect(pose.frame).toBe("skill");
    expect(pose.offsetY).toBe(0);
  });

  it("hops with a squash, while the cloud floats above its shadow", () => {
    const slime = createPetBehaviour("deco-slime", { ...options, phase: 0.25 / 1.6 });
    const atTop = slime.pose(world());
    expect(atTop.offsetY).toBeCloseTo(-Math.SQRT1_2 * PETS["deco-slime"].height);
    const cloud = createPetBehaviour("pet-slime-cloud", options);
    expect(cloud.pose(world()).offsetY).toBeLessThanOrEqual(-PETS["pet-slime-cloud"].height + 3);
    expect(cloud.pose(world()).shadowAlpha).toBe(0.5);
  });

  it("lets each species override its skill pose", () => {
    const peach = createPetBehaviour("deco-slime", options);
    const bunny = createPetBehaviour("pet-slime-sakura", options);
    peach.useSkill();
    bunny.useSkill();
    peach.update(PETS["deco-slime"].skillSeconds / 2, world());
    bunny.update(PETS["pet-slime-sakura"].skillSeconds / 8, world());
    // The peach leaps high at the middle of its skill; the bunny is mid-turn, seen edge-on
    expect(peach.pose(world()).offsetY).toBeCloseTo(-14);
    expect(Math.abs(bunny.pose(world()).scaleX)).toBeLessThan(0.2);
    expect(bunny).toBeInstanceOf(SakuraBunny);
  });

  it("faces the way it walks", () => {
    const pet = createPetBehaviour("pet-slime-ember", { ...options, direction: -1 });
    expect(Math.sign(pet.pose(world()).scaleX)).toBe(-1);
  });
});
