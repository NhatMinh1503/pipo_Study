/**
 * Slime pets that roam the garden (garden-scene spec §3.6). Prices live in the database;
 * this is only how each one looks and moves. The first slime keeps its old shop id.
 */
export type PetMotion = "hop" | "float";

export interface PetTraits {
  asset: string;
  motion: PetMotion;
  /** Walking speed along the path, logical px per second. */
  speed: number;
  /** Hops per second, or bobs per second for a floating pet. */
  beatsPerSecond: number;
  /** Height of a hop, or how high a floating pet hovers above its shadow. */
  height: number;
}

export const PETS = {
  "deco-slime": { asset: "slime", motion: "hop", speed: 16, beatsPerSecond: 1.6, height: 7 },
  "pet-slime-water": {
    asset: "slime-water",
    motion: "hop",
    speed: 19,
    beatsPerSecond: 2,
    height: 6,
  },
  // The moss slime is the lazy one: slow, low hops
  "pet-slime-moss": {
    asset: "slime-moss",
    motion: "hop",
    speed: 10,
    beatsPerSecond: 1.2,
    height: 4,
  },
  "pet-slime-sakura": {
    asset: "slime-sakura",
    motion: "hop",
    speed: 14,
    beatsPerSecond: 1.7,
    height: 9,
  },
  // The ember slime never sits still: quick, bouncy
  "pet-slime-ember": {
    asset: "slime-ember",
    motion: "hop",
    speed: 22,
    beatsPerSecond: 2.5,
    height: 6,
  },
  "pet-slime-cloud": {
    asset: "slime-cloud",
    motion: "float",
    speed: 9,
    beatsPerSecond: 0.5,
    height: 14,
  },
} as const satisfies Record<string, PetTraits>;

export type PetId = keyof typeof PETS;

export const PET_IDS = Object.keys(PETS) as PetId[];

export function isPetId(value: string): value is PetId {
  return value in PETS;
}

/** The pets a learner owns, in catalog order, from their purchased item ids. */
export function ownedPets(ownedItemIds: Iterable<string>): PetId[] {
  const owned = new Set(ownedItemIds);
  return PET_IDS.filter((id) => owned.has(id));
}
