/**
 * Pets that roam the garden (garden-scene spec §3.5b). Prices live in the database; this is
 * how each one looks, moves and which skill it has. Shop ids stay as they were sold, so the
 * first pet keeps "deco-slime" even though it is now a peach spirit.
 */
export type PetMotion = "hop" | "float";

/** What a pet does when tapped (or now and then on its own while resting). */
export type PetSkill = "sprout" | "fountain" | "bloom" | "petals" | "fire" | "rain";

export interface PetTraits {
  /**
   * Base name of its art: `<art>` (idle), `<art>-b` (second idle frame) and `<art>-skill`,
   * all the same size with the same anchor so frames swap in place.
   */
  art: string;
  motion: PetMotion;
  skill: PetSkill;
  /** How long the skill lasts, seconds. */
  skillSeconds: number;
  /** Walking speed along the path, logical px per second. */
  speed: number;
  /** Hops per second, or bobs per second for a floating pet. */
  beatsPerSecond: number;
  /** Height of a hop, or how high a floating pet hovers above its shadow. */
  height: number;
}

export const PETS = {
  "deco-slime": {
    art: "pet-peach",
    motion: "hop",
    skill: "sprout",
    skillSeconds: 1.6,
    speed: 15,
    beatsPerSecond: 1.6,
    height: 7,
  },
  "pet-slime-water": {
    art: "pet-water",
    motion: "hop",
    skill: "fountain",
    skillSeconds: 1.8,
    speed: 19,
    beatsPerSecond: 2,
    height: 5,
  },
  // The moss slime is the lazy one: slow, low hops
  "pet-slime-moss": {
    art: "pet-moss",
    motion: "hop",
    skill: "bloom",
    skillSeconds: 2.2,
    speed: 10,
    beatsPerSecond: 1.2,
    height: 4,
  },
  "pet-slime-sakura": {
    art: "pet-sakura",
    motion: "hop",
    skill: "petals",
    skillSeconds: 1.6,
    speed: 14,
    beatsPerSecond: 1.7,
    height: 9,
  },
  // The ember sprite never sits still: quick, bouncy
  "pet-slime-ember": {
    art: "pet-ember",
    motion: "hop",
    skill: "fire",
    skillSeconds: 1.4,
    speed: 22,
    beatsPerSecond: 2.5,
    height: 6,
  },
  "pet-slime-cloud": {
    art: "pet-cloud",
    motion: "float",
    skill: "rain",
    skillSeconds: 2.4,
    speed: 9,
    beatsPerSecond: 0.5,
    height: 14,
  },
} as const satisfies Record<string, PetTraits>;

export type PetId = keyof typeof PETS;

export const PET_IDS = Object.keys(PETS) as PetId[];

/** The three pictures of a pet, in the order idle, second idle frame, skill. */
export function petFrames(id: PetId): [string, string, string] {
  const { art } = PETS[id];
  return [art, `${art}-b`, `${art}-skill`];
}

export function isPetId(value: string): value is PetId {
  return value in PETS;
}

/** The pets a learner owns, in catalog order, from their purchased item ids. */
export function ownedPets(ownedItemIds: Iterable<string>): PetId[] {
  const owned = new Set(ownedItemIds);
  return PET_IDS.filter((id) => owned.has(id));
}
