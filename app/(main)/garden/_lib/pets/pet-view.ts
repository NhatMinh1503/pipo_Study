import { Container, Rectangle, Sprite, type Texture } from "pixi.js";

import type { PetBehaviour, PetFrame, PetWorld } from "@/lib/garden/pet-behaviour";
import type { PetId } from "@/lib/garden/pets";

import { shapes, type ParticleLayer } from "./particles";

export interface PetTextures {
  frames: Record<PetFrame, Texture>;
  /** Where the feet are in each frame, as a share of its size (all frames match). */
  anchor: { x: number; y: number };
  shadow: Texture;
  /** The falling-petal art of the sakura trees, reused by the sakura bunny. */
  petal: Texture | null;
}

const between = (min: number, max: number, roll: number) => min + (max - min) * roll;

/**
 * Draws one pet from its behaviour (lib/garden/pet-behaviour.ts) and plays its skill effect.
 * The base class swaps frames and applies the pose; each species overrides `onSkillStart`
 * and `onSkillFrame` to add its own particles. Effects are skipped under reduced motion.
 */
export class PetView {
  readonly root = new Container();
  protected readonly body: Sprite;
  protected readonly shadow: Sprite;
  private wasUsingSkill = false;

  constructor(
    readonly behaviour: PetBehaviour,
    protected readonly textures: PetTextures,
    protected readonly fx: ParticleLayer,
    /** Sideways offset on the path so pets pass each other instead of overlapping. */
    protected readonly lane: number,
    protected readonly random: () => number,
  ) {
    this.shadow = new Sprite(textures.shadow);
    this.shadow.anchor.set(0.5);
    this.body = new Sprite(textures.frames.idle);
    this.body.anchor.set(textures.anchor.x, textures.anchor.y);
    this.root.addChild(this.shadow, this.body);
    this.root.eventMode = "static";
    this.root.cursor = "pointer";
    // A generous, steady tap target around the body, not just its opaque pixels
    const { width, height } = textures.frames.idle;
    const left = width * textures.anchor.x;
    const top = height * textures.anchor.y;
    this.root.hitArea = new Rectangle(-left - 4, -top - 6, width + 8, top + 10);
  }

  get id(): PetId {
    return this.behaviour.id;
  }

  /** Taps and the keyboard buttons end up here. Returns whether the skill started. */
  triggerSkill(world: PetWorld): boolean {
    if (!this.behaviour.useSkill()) return false;
    this.startEffect(world);
    return true;
  }

  /** Called every frame after the behaviour has been updated. */
  render(dt: number, world: PetWorld, at: { x: number; y: number }): void {
    this.root.position.set(at.x, at.y + this.lane);
    this.root.zIndex = at.y + this.lane;

    const pose = this.behaviour.pose(world);
    this.body.texture = this.textures.frames[pose.frame];
    this.body.y = pose.offsetY;
    this.body.scale.set(pose.scaleX, pose.scaleY);
    this.body.rotation = pose.rotation;
    this.shadow.scale.set(pose.shadowScale);
    this.shadow.alpha = pose.shadowAlpha;

    // A skill the behaviour started on its own (while resting) gets its effect too
    const using = this.behaviour.usingSkill;
    if (using && !this.wasUsingSkill) this.startEffect(world);
    this.wasUsingSkill = using;
    if (using && world.moving) this.onSkillFrame(this.behaviour.skillProgress, dt);
  }

  private startEffect(world: PetWorld): void {
    this.wasUsingSkill = true;
    if (world.moving) this.onSkillStart();
  }

  /** Species hook: the burst at the start of the skill. */
  protected onSkillStart(): void {}

  /** Species hook: called each frame while the skill runs, with its progress 0..1. */
  protected onSkillFrame(progress: number, dt: number): void {
    void progress;
    void dt;
  }

  /** Scene position of a point given relative to the pet's feet, in the way it faces. */
  protected spot(forward: number, up: number): { x: number; y: number } {
    return {
      x: this.root.x + forward * this.behaviour.direction,
      y: this.root.y + this.body.y - up,
    };
  }

  /** True on roughly `perSecond` frames per second, so effects do not depend on frame rate. */
  protected every(perSecond: number, dt: number): boolean {
    return this.random() < perSecond * dt;
  }
}

/** Peach spirit: leaves burst out of the ground and a sparkle where the sprout pops up. */
export class PeachView extends PetView {
  protected override onSkillStart(): void {
    const ground = this.spot(14, 0);
    for (let index = 0; index < 7; index += 1) {
      const angle = -Math.PI / 2 + between(-0.9, 0.9, this.random());
      const speed = between(30, 55, this.random());
      this.fx.add(shapes.leaf(between(2.2, 3.4, this.random()), index % 2 ? 0x7cb342 : 0x9ccc65), {
        x: ground.x,
        y: ground.y - 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 70,
        spin: between(-6, 6, this.random()),
        life: 1.1,
        floor: ground.y + 2,
      });
    }
    this.fx.add(shapes.sparkle(5, 0xfff3b0), {
      x: ground.x,
      y: ground.y - 10,
      grow: -0.6,
      life: 0.7,
    });
  }
}

/** Water sprite: a fountain of drops from its head, splashing in a ring on the ground. */
export class WaterView extends PetView {
  protected override onSkillStart(): void {
    const ground = this.spot(0, 0);
    this.fx.add(shapes.ring(6, 0xbfe8ff), {
      x: ground.x,
      y: ground.y,
      grow: 2.2,
      life: 0.9,
      fadeAt: 0.2,
    });
  }

  protected override onSkillFrame(progress: number, dt: number): void {
    if (progress > 0.75 || !this.every(28, dt)) return;
    const head = this.spot(4, 30);
    const ground = this.spot(0, 0).y;
    this.fx.add(shapes.drop(between(2.5, 4, this.random()), 0x8fd3f4), {
      x: head.x,
      y: head.y,
      vx: (between(10, 34, this.random()) * this.behaviour.direction) / 1,
      vy: -between(55, 80, this.random()),
      gravity: 160,
      life: 1.2,
      fadeAt: 0.7,
      floor: ground + between(-2, 6, this.random()),
    });
  }
}

/** Moss slime: little flowers pop up on the ground all around it. */
export class MossView extends PetView {
  private static readonly COLOURS = [0xffffff, 0xfff1a8, 0xffc7dd, 0xd9c8ff];

  protected override onSkillStart(): void {
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2 + this.random() * 0.4;
      const distance = between(14, 26, this.random());
      const flower = shapes.flower(
        1.6,
        MossView.COLOURS[index % MossView.COLOURS.length] ?? 0xffffff,
      );
      flower.scale.set(0);
      this.fx.add(flower, {
        x: this.root.x + Math.cos(angle) * distance,
        y: this.root.y + Math.sin(angle) * distance * 0.45,
        grow: between(2.5, 4, this.random()),
        maxScale: 1,
        life: 2.6,
        fadeAt: 0.75,
      });
    }
  }
}

/** Sakura bunny: petals spiral out around it while it spins. */
export class SakuraView extends PetView {
  protected override onSkillFrame(progress: number, dt: number): void {
    if (progress > 0.8 || !this.every(22, dt)) return;
    const angle = progress * Math.PI * 8 + this.random() * 0.6;
    const centre = this.spot(0, 12);
    const petal = this.textures.petal ? new Sprite(this.textures.petal) : shapes.dot(1.6, 0xf8b4c6);
    if (petal instanceof Sprite) petal.anchor.set(0.5);
    this.fx.add(petal, {
      x: centre.x + Math.cos(angle) * 10,
      y: centre.y + Math.sin(angle) * 5,
      vx: Math.cos(angle + Math.PI / 2) * 50 + Math.cos(angle) * 18,
      vy: Math.sin(angle + Math.PI / 2) * 22 - 12,
      drag: 0.35,
      gravity: 14,
      spin: between(-5, 5, this.random()),
      life: 1.6,
      fadeAt: 0.5,
    });
  }
}

/** Ember sprite: flames burst forward from its mouth, with sparks and a puff of smoke. */
export class EmberView extends PetView {
  private smoked = false;

  protected override onSkillStart(): void {
    this.smoked = false;
  }

  protected override onSkillFrame(progress: number, dt: number): void {
    // The first quarter is the wind-up (deep breath)
    if (progress < 0.25) return;
    const mouth = this.spot(14, 14);
    if (progress < 0.85 && this.every(40, dt)) {
      const flame = shapes.glow(between(2.5, 4, this.random()), 0xff7a1a, 0xffd34d);
      this.fx.add(flame, {
        x: mouth.x,
        y: mouth.y + between(-2, 2, this.random()),
        vx: between(70, 110, this.random()) * this.behaviour.direction,
        vy: between(-14, 8, this.random()),
        drag: 0.12,
        grow: 1.6,
        life: 0.55,
        fadeAt: 0.3,
      });
    }
    if (progress < 0.85 && this.every(12, dt)) {
      this.fx.add(shapes.dot(0.9, 0xffe08a), {
        x: mouth.x,
        y: mouth.y,
        vx: between(40, 90, this.random()) * this.behaviour.direction,
        vy: -between(10, 50, this.random()),
        gravity: 60,
        life: 0.8,
      });
    }
    if (progress > 0.85 && !this.smoked) {
      this.smoked = true;
      for (let index = 0; index < 3; index += 1) {
        const smoke = shapes.glow(3, 0x8a8a8a, 0xb5b5b5);
        smoke.alpha = 0.6;
        this.fx.add(smoke, {
          x: mouth.x + index * 4 * this.behaviour.direction,
          y: mouth.y - index * 2,
          vy: -between(10, 18, this.random()),
          grow: 1.2,
          life: 1.2,
          fadeAt: 0.2,
        });
      }
    }
  }
}

/** Cloud slime: rain falls from its underside and splashes on the grass. */
export class CloudView extends PetView {
  protected override onSkillFrame(progress: number, dt: number): void {
    if (progress < 0.15 || progress > 0.9 || !this.every(30, dt)) return;
    const under = this.spot(between(-12, 12, this.random()), 4);
    const ground = this.root.y;
    this.fx.add(shapes.drop(between(2.4, 3.2, this.random()), 0x7cc4ef), {
      x: under.x,
      y: under.y,
      vy: between(70, 90, this.random()),
      gravity: 120,
      life: 0.9,
      fadeAt: 0.85,
      floor: ground,
    });
    if (this.every(8, dt)) {
      this.fx.add(shapes.ring(1.5, 0xcdeeff), {
        x: under.x,
        y: ground,
        grow: 2.5,
        life: 0.5,
        fadeAt: 0.1,
      });
    }
  }
}

const VIEWS: Record<PetId, typeof PetView> = {
  "deco-slime": PeachView,
  "pet-slime-water": WaterView,
  "pet-slime-moss": MossView,
  "pet-slime-sakura": SakuraView,
  "pet-slime-ember": EmberView,
  "pet-slime-cloud": CloudView,
};

/** The view class drawing this pet. */
export function createPetView(...args: ConstructorParameters<typeof PetView>): PetView {
  const View = VIEWS[args[0].id];
  return new View(...args);
}
