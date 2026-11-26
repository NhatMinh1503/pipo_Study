import {
  Group,
  Vector3,
  type Camera,
  type Mesh,
  type MeshBasicMaterial,
  type Object3D,
  type PlaneGeometry,
  type Texture,
} from "three";

import type { PetBehaviour, PetFrame, PetWorld } from "@/lib/garden/pet-behaviour";
import type { PetId } from "@/lib/garden/pets";

import { Billboard, anchoredCard, blobShadow } from "../three/billboard";

import type { ParticleLayer, ShapeBook } from "./particles";

/** How the pet is drawn: its 3D clay model, or its three 2D frames on a card. */
export type PetLook =
  | { kind: "model"; model: Object3D; width: number }
  | { kind: "card"; art: string; frames: Record<PetFrame, Texture>; width: number };

export interface PetAssets {
  look: PetLook;
  shadow: Texture;
  shapes: ShapeBook;
  /** The falling-petal art of the sakura trees, reused by the sakura bunny. */
  petal: Texture | null;
}

/** Where the pet stands this frame: ground point, ground height and walking direction. */
export interface PetPlace {
  x: number;
  z: number;
  h: number;
  /** Unit vector along the path toward its end, on the ground. */
  tangentX: number;
  tangentZ: number;
}

const between = (min: number, max: number, roll: number) => min + (max - min) * roll;
/** A walking model turns this much of the way toward where it walks; the rest faces us. */
const WALK_TURN = 0.6;
/** How fast a model turns to face a new way, per second. */
const TURN_SPEED = 8;

/**
 * Draws one pet from its behaviour (lib/garden/pet-behaviour.ts) and plays its skill effect.
 * The behaviour is the same one the 2D garden used: only `render` changed, turning the pose
 * into a 3D transform. A model hops, squashes and leans exactly like the old picture did and
 * turns to face where it walks; a pet without a model still swaps its 2D frames on a card.
 * Each species overrides `onSkillStart` / `onSkillFrame` for its particles.
 */
export class PetView {
  readonly root = new Group();
  protected readonly shadow: Mesh<PlaneGeometry, MeshBasicMaterial>;
  /** Moved up and down by the pose (hop height). */
  protected readonly lift = new Group();
  private readonly turn = new Group();
  private readonly tilt = new Group();
  private readonly card: Mesh<PlaneGeometry, MeshBasicMaterial> | null = null;
  private readonly billboard: Billboard | null = null;
  private yaw = 0;
  private wasUsingSkill = false;
  /** Direction it walks on the ground (already flipped by behaviour.direction). */
  protected readonly forward = new Vector3(1, 0, 0);

  constructor(
    readonly behaviour: PetBehaviour,
    protected readonly assets: PetAssets,
    protected readonly fx: ParticleLayer,
    /** Sideways offset on the path so pets pass each other instead of overlapping. */
    protected readonly lane: number,
    protected readonly random: () => number,
  ) {
    const { look } = assets;
    this.shadow = blobShadow(assets.shadow, look.width * 0.8);
    this.root.add(this.shadow, this.lift);
    if (look.kind === "model") {
      this.tilt.add(look.model);
      this.turn.add(this.tilt);
      this.lift.add(this.turn);
    } else {
      this.billboard = new Billboard();
      this.card = anchoredCard(look.art, look.frames.idle);
      this.billboard.add(this.card);
      this.lift.add(this.billboard);
    }
    this.root.userData.petId = behaviour.id;
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
  render(dt: number, world: PetWorld, place: PetPlace, camera: Camera): void {
    const direction = this.behaviour.direction;
    this.forward.set(place.tangentX * direction, 0, place.tangentZ * direction);
    // The lane is to the side of the path, toward the camera on both walking directions
    this.root.position.set(
      place.x - place.tangentZ * this.lane,
      place.h,
      place.z + place.tangentX * this.lane,
    );

    const pose = this.behaviour.pose(world);
    this.lift.position.y = -pose.offsetY;
    this.shadow.scale.set(
      this.shadow.userData.width * pose.shadowScale,
      1,
      this.shadow.userData.width * 0.8 * pose.shadowScale,
    );
    this.shadow.material.opacity = pose.shadowAlpha;

    if (this.card && this.billboard) {
      this.billboard.face(camera);
      const texture = this.assets.look.kind === "card" ? this.assets.look.frames[pose.frame] : null;
      if (texture && this.card.material.map !== texture) this.card.material.map = texture;
      // The path runs left to right across the screen, so the path direction is the
      // screen direction and the 2D pose (scaleX carries it) applies as it is
      this.card.scale.set(pose.scaleX, pose.scaleY, 1);
      this.card.rotation.z = -pose.rotation;
    } else {
      const walking = !this.behaviour.resting && !this.behaviour.usingSkill && world.moving;
      const target = walking ? Math.atan2(this.forward.x, this.forward.z) * WALK_TURN : 0;
      this.yaw += (target - this.yaw) * Math.min(1, dt * TURN_SPEED);
      this.turn.rotation.y = this.yaw + this.extraYaw(world);
      // scaleX carries the walking direction in 2D; in 3D the turn shows it instead
      const width = this.modelWidthScale(Math.abs(pose.scaleX));
      this.tilt.scale.set(width, pose.scaleY, width);
      // A 2D lean forward (rotation · direction > 0) is a pitch toward the face in 3D
      this.tilt.rotation.x = pose.rotation * direction;
    }

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

  /** Species hook: extra turn of a 3D model (the sakura bunny really spins). */
  protected extraYaw(world: PetWorld): number {
    void world;
    return 0;
  }

  /** Species hook: how wide a 3D model is drawn for the pose's 2D width. */
  protected modelWidthScale(width: number): number {
    return width;
  }

  /** Species hook: the burst at the start of the skill. */
  protected onSkillStart(): void {}

  /** Species hook: called each frame while the skill runs, with its progress 0..1. */
  protected onSkillFrame(progress: number, dt: number): void {
    void progress;
    void dt;
  }

  /** World position of a point in front of the pet's feet and above them. */
  protected spot(forward: number, up: number): Vector3 {
    return new Vector3(
      this.root.position.x + this.forward.x * forward,
      this.root.position.y + this.lift.position.y + up,
      this.root.position.z + this.forward.z * forward,
    );
  }

  /** Height of the ground under the pet. */
  protected get ground(): number {
    return this.root.position.y;
  }

  /** True on roughly `perSecond` frames per second, so effects do not depend on frame rate. */
  protected every(perSecond: number, dt: number): boolean {
    return this.random() < perSecond * dt;
  }

  /** A random way along the ground. */
  protected sideways(): { x: number; z: number } {
    const angle = this.random() * Math.PI * 2;
    return { x: Math.cos(angle), z: Math.sin(angle) };
  }
}

/** Peach spirit: leaves burst out of the ground and a sparkle where the sprout pops up. */
export class PeachView extends PetView {
  protected override onSkillStart(): void {
    const at = this.spot(14, 0);
    const { shapes } = this.assets;
    for (let index = 0; index < 7; index += 1) {
      const out = between(-0.9, 0.9, this.random());
      const speed = between(30, 55, this.random());
      const way = this.sideways();
      this.fx.add(shapes.leaf(between(2.2, 3.4, this.random()), index % 2 ? 0x7cb342 : 0x9ccc65), {
        x: at.x,
        y: this.ground + 4,
        z: at.z,
        vx: way.x * Math.sin(out) * speed,
        vz: way.z * Math.sin(out) * speed,
        vy: Math.cos(out) * speed,
        gravity: 70,
        spin: between(-6, 6, this.random()),
        life: 1.1,
        floor: this.ground + 0.5,
      });
    }
    this.fx.add(shapes.sparkle(5, 0xfff3b0), {
      x: at.x,
      y: this.ground + 10,
      z: at.z,
      grow: -0.6,
      life: 0.7,
    });
  }
}

/** Water sprite: a fountain of drops from its head, splashing in a ring on the ground. */
export class WaterView extends PetView {
  protected override onSkillStart(): void {
    const at = this.spot(0, 0);
    this.fx.add(this.assets.shapes.ring(6, 0xbfe8ff), {
      x: at.x,
      y: this.ground + 0.4,
      z: at.z,
      grow: 2.2,
      life: 0.9,
      fadeAt: 0.2,
    });
  }

  protected override onSkillFrame(progress: number, dt: number): void {
    if (progress > 0.75 || !this.every(28, dt)) return;
    const head = this.spot(4, 30);
    const ahead = between(10, 34, this.random());
    const side = between(-8, 8, this.random());
    this.fx.add(this.assets.shapes.drop(between(2.5, 4, this.random()), 0x8fd3f4), {
      x: head.x,
      y: head.y,
      z: head.z,
      vx: this.forward.x * ahead - this.forward.z * side,
      vz: this.forward.z * ahead + this.forward.x * side,
      vy: between(55, 80, this.random()),
      gravity: 160,
      life: 1.2,
      fadeAt: 0.7,
      floor: this.ground + 0.5,
    });
  }
}

/** Moss slime: little flowers pop up on the ground all around it. */
export class MossView extends PetView {
  private static readonly COLOURS = [0xffffff, 0xfff1a8, 0xffc7dd, 0xd9c8ff];

  protected override onSkillStart(): void {
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2 + this.random() * 0.4;
      const distance = between(16, 30, this.random());
      this.fx.add(
        this.assets.shapes.flower(
          1.6,
          MossView.COLOURS[index % MossView.COLOURS.length] ?? 0xffffff,
        ),
        {
          x: this.root.position.x + Math.cos(angle) * distance,
          y: this.ground + 2,
          z: this.root.position.z + Math.sin(angle) * distance,
          scale: 0,
          grow: between(2.5, 4, this.random()),
          maxScale: 1,
          life: 2.6,
          fadeAt: 0.75,
        },
      );
    }
  }
}

/** Sakura bunny: petals spiral out around it while it spins. */
export class SakuraView extends PetView {
  /** The 2D bunny faked its spin by squeezing its width; the 3D one really turns. */
  protected override extraYaw(world: PetWorld): number {
    return this.behaviour.usingSkill && world.moving
      ? this.behaviour.skillProgress * Math.PI * 4
      : 0;
  }

  protected override modelWidthScale(): number {
    return 1;
  }

  protected override onSkillFrame(progress: number, dt: number): void {
    if (progress > 0.8 || !this.every(22, dt)) return;
    const angle = progress * Math.PI * 8 + this.random() * 0.6;
    const centre = this.spot(0, 12);
    const shape = this.assets.petal
      ? this.assets.shapes.picture(this.assets.petal, 8)
      : this.assets.shapes.dot(1.6, 0xf8b4c6);
    this.fx.add(shape, {
      x: centre.x + Math.cos(angle) * 10,
      y: centre.y,
      z: centre.z + Math.sin(angle) * 10,
      vx: Math.cos(angle + Math.PI / 2) * 50 + Math.cos(angle) * 18,
      vz: Math.sin(angle + Math.PI / 2) * 50 + Math.sin(angle) * 18,
      vy: 12,
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
    const { shapes } = this.assets;
    if (progress < 0.85 && this.every(40, dt)) {
      const speed = between(70, 110, this.random());
      this.fx.add(shapes.glow(between(2.5, 4, this.random()), 0xff7a1a, 0xffd34d), {
        x: mouth.x,
        y: mouth.y + between(-2, 2, this.random()),
        z: mouth.z,
        vx: this.forward.x * speed,
        vz: this.forward.z * speed,
        vy: between(-8, 14, this.random()),
        drag: 0.12,
        grow: 1.6,
        life: 0.55,
        fadeAt: 0.3,
      });
    }
    if (progress < 0.85 && this.every(12, dt)) {
      const speed = between(40, 90, this.random());
      this.fx.add(shapes.dot(0.9, 0xffe08a), {
        x: mouth.x,
        y: mouth.y,
        z: mouth.z,
        vx: this.forward.x * speed,
        vz: this.forward.z * speed,
        vy: between(10, 50, this.random()),
        gravity: 60,
        life: 0.8,
      });
    }
    if (progress > 0.85 && !this.smoked) {
      this.smoked = true;
      for (let index = 0; index < 3; index += 1) {
        this.fx.add(shapes.glow(3, 0x8a8a8a, 0xb5b5b5), {
          x: mouth.x + this.forward.x * index * 4,
          y: mouth.y + index * 2,
          z: mouth.z + this.forward.z * index * 4,
          vy: between(10, 18, this.random()),
          grow: 1.2,
          life: 1.2,
          fadeAt: 0.2,
          opacity: 0.6,
        });
      }
    }
  }
}

/** Cloud slime: rain falls from its underside and splashes on the grass. */
export class CloudView extends PetView {
  protected override onSkillFrame(progress: number, dt: number): void {
    if (progress < 0.15 || progress > 0.9 || !this.every(30, dt)) return;
    const under = this.spot(0, 4);
    const way = this.sideways();
    const reach = between(0, 12, this.random());
    const x = under.x + way.x * reach;
    const z = under.z + way.z * reach;
    const { shapes } = this.assets;
    this.fx.add(shapes.drop(between(2.4, 3.2, this.random()), 0x7cc4ef), {
      x,
      y: under.y,
      z,
      vy: -between(70, 90, this.random()),
      gravity: 120,
      life: 0.9,
      fadeAt: 0.85,
      floor: this.ground,
    });
    if (this.every(8, dt)) {
      this.fx.add(shapes.ring(1.5, 0xcdeeff), {
        x,
        y: this.ground + 0.4,
        z,
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
