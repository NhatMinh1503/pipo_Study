import { PETS, type PetId, type PetTraits } from "./pets";

/**
 * How pets move and use their skills, without any drawing (garden-scene spec §3.5b).
 * PetBehaviour holds what every pet shares: walking the path both ways, resting, starting
 * and timing its skill. HoppingPet and FloatingPet override how a pet moves; each species
 * overrides how its skill pose looks. The renderer only reads `pose()` each frame.
 */

/** Which of the pet's three pictures to show. */
export type PetFrame = "idle" | "alt" | "skill";

export interface PetPose {
  frame: PetFrame;
  /** Body offset above the foot point, logical px (negative is up). */
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  shadowScale: number;
  shadowAlpha: number;
}

export interface PetWorld {
  pathLength: number;
  /** False under prefers-reduced-motion: pets stand still and skills show without motion. */
  moving: boolean;
  random: () => number;
}

/** Things a pet did this frame that the renderer reacts to. */
export type PetEvent = "skill";

/** Chance per second that a walking pet stops for a rest, and how long it rests. */
export const PET_REST_CHANCE = 0.08;
export const PET_REST_SECONDS = { min: 1.5, max: 3.5 } as const;
/** Chance per second that a resting pet shows off its skill without being tapped. */
export const PET_AUTO_SKILL_CHANCE = 0.06;
/** A skill cannot start again until this long after the last one ended. */
export const PET_SKILL_COOLDOWN = 0.6;
/** How much a slime squashes when it lands (fraction of its size). */
const SQUASH = 0.14;

const between = (min: number, max: number, roll: number) => min + (max - min) * roll;

export abstract class PetBehaviour {
  distance: number;
  direction: 1 | -1;
  protected rest = 0;
  protected skillLeft = 0;
  protected cooldown = 0;
  protected clock: number;

  constructor(
    readonly id: PetId,
    readonly traits: PetTraits,
    options: { start: number; direction: 1 | -1; phase: number; pathLength: number },
  ) {
    this.distance = options.start * options.pathLength;
    this.direction = options.direction;
    // Pets do not move in step with each other
    this.clock = options.phase;
  }

  get usingSkill(): boolean {
    return this.skillLeft > 0;
  }

  get resting(): boolean {
    return this.rest > 0;
  }

  /** 0 when the skill starts, 1 when it ends; 0 when no skill is running. */
  get skillProgress(): number {
    return this.usingSkill ? 1 - this.skillLeft / this.traits.skillSeconds : 0;
  }

  /** Starts the skill unless one is running or just ended. Returns whether it started. */
  useSkill(): boolean {
    if (this.usingSkill || this.cooldown > 0) return false;
    this.skillLeft = this.traits.skillSeconds;
    return true;
  }

  update(dt: number, world: PetWorld): PetEvent[] {
    this.clock += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.usingSkill) {
      this.skillLeft = Math.max(0, this.skillLeft - dt);
      if (!this.usingSkill) this.cooldown = PET_SKILL_COOLDOWN;
      return [];
    }
    if (!world.moving) return [];
    if (this.resting) {
      this.rest = Math.max(0, this.rest - dt);
      if (world.random() < dt * PET_AUTO_SKILL_CHANCE && this.useSkill()) return ["skill"];
      return [];
    }
    this.walk(dt, world);
    return [];
  }

  /** Moves along the path, turning at either end, and sometimes stops for a rest. */
  protected walk(dt: number, world: PetWorld): void {
    this.distance += this.traits.speed * dt * this.direction;
    if (this.distance <= 0 || this.distance >= world.pathLength) {
      this.direction = this.direction === 1 ? -1 : 1;
      this.distance = Math.min(Math.max(this.distance, 0), world.pathLength);
    }
    if (world.random() < dt * PET_REST_CHANCE) {
      this.rest = between(PET_REST_SECONDS.min, PET_REST_SECONDS.max, world.random());
    }
  }

  pose(world: PetWorld): PetPose {
    if (this.usingSkill) return this.skillPose(this.skillProgress, world);
    return this.motionPose(world);
  }

  /** How the pet looks while walking or resting. */
  protected abstract motionPose(world: PetWorld): PetPose;

  /** How the pet looks while using its skill; species override this. */
  protected skillPose(progress: number, world: PetWorld): PetPose {
    const jump = world.moving ? Math.sin(progress * Math.PI) * 4 : 0;
    return this.basePose({ frame: "skill", offsetY: -jump });
  }

  protected basePose(overrides: Partial<PetPose>): PetPose {
    return {
      frame: "idle",
      offsetY: 0,
      scaleX: this.direction,
      scaleY: 1,
      rotation: 0,
      shadowScale: 1,
      shadowAlpha: 1,
      ...overrides,
    };
  }
}

/** Slimes and spirits that bounce along the ground with a squash when they land. */
export class HoppingPet extends PetBehaviour {
  protected motionPose(world: PetWorld): PetPose {
    const beat = this.clock * this.traits.beatsPerSecond;
    if (!world.moving) return this.basePose({});
    if (this.resting) {
      // Resting pets breathe, and blink to their second frame now and then
      const breath = Math.sin(this.clock * 2.4) * 0.03;
      return this.basePose({
        frame: this.clock % 3 < 0.25 ? "alt" : "idle",
        scaleX: this.direction * (1 - breath),
        scaleY: 1 + breath,
      });
    }
    const lift = Math.abs(Math.sin(beat * Math.PI));
    const squash = (1 - lift) ** 3 * SQUASH;
    return this.basePose({
      // The second frame on every other hop makes the hop feel alive
      frame: Math.floor(beat) % 2 === 0 ? "idle" : "alt",
      offsetY: -lift * this.traits.height,
      scaleX: this.direction * (1 + squash),
      scaleY: 1 - squash + lift * 0.06,
      shadowScale: 1 - lift * 0.35,
      shadowAlpha: 1 - lift * 0.4,
    });
  }
}

/** A pet that hovers above its shadow and bobs instead of hopping. */
export class FloatingPet extends PetBehaviour {
  protected motionPose(world: PetWorld): PetPose {
    const bob = world.moving ? Math.sin(this.clock * this.traits.beatsPerSecond * 2 * Math.PI) : 0;
    return this.basePose({
      frame: this.clock % 4 < 0.4 ? "alt" : "idle",
      offsetY: -(this.traits.height + bob * 3),
      shadowScale: 0.8 - bob * 0.08,
      shadowAlpha: 0.5,
    });
  }
}

/** Peach spirit: leaps up high while a sprout pops out of the ground. */
export class PeachSpirit extends HoppingPet {
  protected override skillPose(progress: number, world: PetWorld): PetPose {
    const leap = world.moving ? Math.sin(progress * Math.PI) * 14 : 0;
    return this.basePose({
      frame: "skill",
      offsetY: -leap,
      shadowScale: 1 - leap / 30,
      shadowAlpha: 1 - leap / 28,
    });
  }
}

/** Water sprite: stretches tall and holds still while it spouts a fountain. */
export class WaterSprite extends HoppingPet {
  protected override skillPose(progress: number, world: PetWorld): PetPose {
    const stretch = world.moving ? Math.sin(Math.min(progress * 3, 1) * Math.PI * 0.5) * 0.08 : 0;
    return this.basePose({
      frame: "skill",
      scaleX: this.direction * (1 - stretch / 2),
      scaleY: 1 + stretch,
    });
  }
}

/** Moss slime: swells up slowly as flowers bloom on its back and around it. */
export class MossSlime extends HoppingPet {
  protected override skillPose(progress: number, world: PetWorld): PetPose {
    const swell = world.moving ? Math.sin(progress * Math.PI) * 0.07 : 0;
    return this.basePose({
      frame: "skill",
      scaleX: this.direction * (1 + swell),
      scaleY: 1 + swell,
    });
  }
}

/** Sakura mochi bunny: spins on the spot inside a swirl of petals. */
export class SakuraBunny extends HoppingPet {
  protected override skillPose(progress: number, world: PetWorld): PetPose {
    // Two full turns: the width follows a cosine, so it seems to turn around
    const turn = world.moving ? Math.cos(progress * Math.PI * 4) : 1;
    const hover = world.moving ? Math.sin(progress * Math.PI) * 5 : 0;
    return this.basePose({
      frame: "skill",
      offsetY: -hover,
      scaleX: this.direction * (Math.abs(turn) < 0.15 ? 0.15 * Math.sign(turn || 1) : turn),
      shadowScale: 1 - hover / 20,
    });
  }
}

/** Ember sprite: rocks back to take a breath, then lunges forward breathing fire. */
export class EmberSprite extends HoppingPet {
  protected override skillPose(progress: number, world: PetWorld): PetPose {
    if (!world.moving) return this.basePose({ frame: "skill" });
    const windUp = progress < 0.25;
    const lean = windUp ? -(progress / 0.25) * 0.18 : 0.12 * (1 - (progress - 0.25) / 0.75);
    // A little shake while the flames come out
    const shake = windUp ? 0 : Math.sin(this.clock * 60) * 0.6;
    return this.basePose({
      frame: windUp ? "alt" : "skill",
      rotation: lean * this.direction,
      offsetY: shake,
    });
  }
}

/** Cloud slime: rises higher and puffs up while it rains on the garden. */
export class CloudSlime extends FloatingPet {
  protected override skillPose(progress: number, world: PetWorld): PetPose {
    const rise = world.moving ? Math.sin(progress * Math.PI) * 8 : 0;
    const puff = world.moving ? Math.sin(progress * Math.PI) * 0.06 : 0;
    return this.basePose({
      frame: "skill",
      offsetY: -(this.traits.height + rise),
      scaleX: this.direction * (1 + puff),
      scaleY: 1 + puff,
      shadowScale: 0.9,
      shadowAlpha: 0.6,
    });
  }
}

const SPECIES: Record<
  PetId,
  new (
    id: PetId,
    traits: PetTraits,
    options: ConstructorParameters<typeof HoppingPet>[2],
  ) => PetBehaviour
> = {
  "deco-slime": PeachSpirit,
  "pet-slime-water": WaterSprite,
  "pet-slime-moss": MossSlime,
  "pet-slime-sakura": SakuraBunny,
  "pet-slime-ember": EmberSprite,
  "pet-slime-cloud": CloudSlime,
};

/** The behaviour object for one owned pet. */
export function createPetBehaviour(
  id: PetId,
  options: { start: number; direction: 1 | -1; phase: number; pathLength: number },
): PetBehaviour {
  const Species = SPECIES[id];
  return new Species(id, PETS[id], options);
}
