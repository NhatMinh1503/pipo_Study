import { Graphics, type Container, type Sprite } from "pixi.js";

/** One short-lived bit of a skill effect: a drop, a petal, a flame, a flower. */
interface Particle {
  node: Container | Graphics | Sprite;
  vx: number;
  vy: number;
  /** Downward acceleration, px/s². */
  gravity: number;
  /** Fraction of speed kept each second (1 = no drag). */
  drag: number;
  spin: number;
  /** Scale change per second, stopping at maxScale. */
  grow: number;
  maxScale: number;
  age: number;
  life: number;
  /** Share of its life after which it starts to fade out. */
  fadeAt: number;
  /** It stops falling at this y (lands on the ground) when set. */
  floor: number | null;
}

export type ParticleOptions = Partial<Omit<Particle, "node" | "age">> & { x: number; y: number };

/** Moves, fades and removes skill-effect particles. Drawing is done by whoever adds them. */
export class ParticleLayer {
  private readonly particles: Particle[] = [];

  constructor(readonly container: Container) {}

  add(node: Particle["node"], options: ParticleOptions): void {
    node.position.set(options.x, options.y);
    this.container.addChild(node);
    this.particles.push({
      node,
      vx: options.vx ?? 0,
      vy: options.vy ?? 0,
      gravity: options.gravity ?? 0,
      drag: options.drag ?? 1,
      spin: options.spin ?? 0,
      grow: options.grow ?? 0,
      maxScale: options.maxScale ?? Number.POSITIVE_INFINITY,
      age: 0,
      life: options.life ?? 1,
      fadeAt: options.fadeAt ?? 0.6,
      floor: options.floor ?? null,
    });
  }

  update(dt: number): void {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      if (!particle) continue;
      particle.age += dt;
      const keep = particle.drag ** dt;
      particle.vx *= keep;
      particle.vy = particle.vy * keep + particle.gravity * dt;
      particle.node.x += particle.vx * dt;
      particle.node.y += particle.vy * dt;
      if (particle.floor !== null && particle.node.y > particle.floor) {
        particle.node.y = particle.floor;
        particle.vx = 0;
        particle.vy = 0;
        particle.gravity = 0;
      }
      particle.node.rotation += particle.spin * dt;
      if (particle.grow !== 0) {
        const scale = Math.min(
          particle.maxScale,
          Math.max(0, particle.node.scale.x + particle.grow * dt),
        );
        particle.node.scale.set(scale);
      }
      const progress = particle.age / particle.life;
      if (progress > particle.fadeAt) {
        particle.node.alpha = Math.max(0, 1 - (progress - particle.fadeAt) / (1 - particle.fadeAt));
      }
      if (progress >= 1) {
        particle.node.destroy();
        this.particles.splice(index, 1);
      }
    }
  }
}

/** Small painted-looking shapes for effects, drawn once per particle. */
export const shapes = {
  dot(radius: number, color: number, alpha = 1): Graphics {
    return new Graphics().circle(0, 0, radius).fill({ color, alpha });
  },
  /** A soft blob with a lighter core, for flames, water and puffs of smoke. */
  glow(radius: number, color: number, core: number): Graphics {
    return new Graphics()
      .circle(0, 0, radius)
      .fill({ color, alpha: 0.85 })
      .circle(-radius * 0.2, -radius * 0.2, radius * 0.5)
      .fill({ color: core, alpha: 0.9 });
  },
  drop(length: number, color: number): Graphics {
    return new Graphics()
      .ellipse(0, 0, length * 0.32, length * 0.5)
      .fill({ color, alpha: 0.9 })
      .circle(-length * 0.08, -length * 0.15, length * 0.1)
      .fill({ color: 0xffffff, alpha: 0.8 });
  },
  leaf(size: number, color: number): Graphics {
    return new Graphics()
      .ellipse(0, 0, size, size * 0.45)
      .fill(color)
      .moveTo(-size, 0)
      .lineTo(size, 0)
      .stroke({ width: 0.6, color: 0x2f5a1c, alpha: 0.7 });
  },
  /** Five round petals around a yellow middle. */
  flower(radius: number, petal: number): Graphics {
    const flower = new Graphics();
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * Math.PI * 2;
      flower.circle(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.7, radius * 0.75);
    }
    return flower
      .fill(petal)
      .circle(0, 0, radius * 0.6)
      .fill(0xf6c445);
  },
  sparkle(size: number, color: number): Graphics {
    return new Graphics()
      .poly([
        0,
        -size,
        size * 0.25,
        -size * 0.25,
        size,
        0,
        size * 0.25,
        size * 0.25,
        0,
        size,
        -size * 0.25,
        size * 0.25,
        -size,
        0,
        -size * 0.25,
        -size * 0.25,
      ])
      .fill(color);
  },
  /** A flat ring on the ground, squashed like the tiles. */
  ring(radius: number, color: number): Graphics {
    return new Graphics()
      .ellipse(0, 0, radius, radius * 0.45)
      .stroke({ width: 1.2, color, alpha: 0.8 });
  },
};
