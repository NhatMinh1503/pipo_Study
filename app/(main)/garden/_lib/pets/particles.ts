import {
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  type Texture,
} from "three";

/**
 * Skill-effect particles in the 3D garden. Units are the scene's logical px (see
 * garden-renderer.ts), with y pointing up, so the numbers tuned for the 2D garden still
 * feel the same: speeds in px/s, gravity pulls down in px/s².
 */

/** A camera-facing picture, or a flat ring lying on the ground. */
export type ParticleNode = Sprite | Mesh<RingGeometry, MeshBasicMaterial>;

interface Particle {
  node: ParticleNode;
  material: SpriteMaterial | MeshBasicMaterial;
  /** Size at scale 1, px. */
  size: number;
  scale: number;
  vx: number;
  vy: number;
  vz: number;
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
  /** It stops falling at this height (lands on the ground) when set. */
  floor: number | null;
  opacity: number;
}

export interface ParticleOptions {
  x: number;
  y: number;
  z: number;
  vx?: number;
  /** Upward speed, px/s. */
  vy?: number;
  vz?: number;
  gravity?: number;
  drag?: number;
  spin?: number;
  grow?: number;
  maxScale?: number;
  /** Starting scale (flowers pop up from 0). */
  scale?: number;
  life?: number;
  fadeAt?: number;
  floor?: number;
  opacity?: number;
}

/** A painted shape: its texture and its size in px. */
export interface Shape {
  texture: Texture | null;
  size: number;
  /** Rings lie flat on the ground instead of facing the camera. */
  flat?: boolean;
  color?: number;
}

type Painter = (context: CanvasRenderingContext2D, size: number) => void;

const hex = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

/** Draws each kind of shape once into a small canvas and reuses it. */
export class ShapeBook {
  private readonly cache = new Map<string, CanvasTexture>();

  private paint(key: string, painter: Painter): CanvasTexture {
    const found = this.cache.get(key);
    if (found) return found;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (context) {
      context.translate(32, 32);
      painter(context, 28);
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  dot(radius: number, color: number): Shape {
    const texture = this.paint(`dot${color}`, (context, size) => {
      context.fillStyle = hex(color);
      context.beginPath();
      context.arc(0, 0, size, 0, Math.PI * 2);
      context.fill();
    });
    return { texture, size: radius * 2 };
  }

  /** A soft blob with a lighter core, for flames, water and puffs of smoke. */
  glow(radius: number, color: number, core: number): Shape {
    const texture = this.paint(`glow${color}-${core}`, (context, size) => {
      context.globalAlpha = 0.85;
      context.fillStyle = hex(color);
      context.beginPath();
      context.arc(0, 0, size, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 0.9;
      context.fillStyle = hex(core);
      context.beginPath();
      context.arc(-size * 0.2, -size * 0.2, size * 0.5, 0, Math.PI * 2);
      context.fill();
    });
    return { texture, size: radius * 2 };
  }

  drop(length: number, color: number): Shape {
    const texture = this.paint(`drop${color}`, (context, size) => {
      context.fillStyle = hex(color);
      context.beginPath();
      context.ellipse(0, 0, size * 0.64, size, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "rgba(255,255,255,0.8)";
      context.beginPath();
      context.arc(-size * 0.16, -size * 0.3, size * 0.2, 0, Math.PI * 2);
      context.fill();
    });
    return { texture, size: length };
  }

  leaf(size: number, color: number): Shape {
    const texture = this.paint(`leaf${color}`, (context, radius) => {
      context.fillStyle = hex(color);
      context.beginPath();
      context.ellipse(0, 0, radius, radius * 0.45, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(47,90,28,0.7)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(-radius, 0);
      context.lineTo(radius, 0);
      context.stroke();
    });
    return { texture, size: size * 2 };
  }

  /** Five round petals around a yellow middle. */
  flower(radius: number, petal: number): Shape {
    const texture = this.paint(`flower${petal}`, (context, size) => {
      const r = size / 2;
      context.fillStyle = hex(petal);
      for (let index = 0; index < 5; index += 1) {
        const angle = (index / 5) * Math.PI * 2;
        context.beginPath();
        context.arc(Math.cos(angle) * r, Math.sin(angle) * r, r * 0.75, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = "#f6c445";
      context.beginPath();
      context.arc(0, 0, r * 0.6, 0, Math.PI * 2);
      context.fill();
    });
    return { texture, size: radius * 4 };
  }

  sparkle(size: number, color: number): Shape {
    const texture = this.paint(`sparkle${color}`, (context, radius) => {
      const points = [0, -1, 0.25, -0.25, 1, 0, 0.25, 0.25, 0, 1, -0.25, 0.25, -1, 0, -0.25, -0.25];
      context.fillStyle = hex(color);
      context.beginPath();
      for (let index = 0; index < points.length; index += 2) {
        const x = (points[index] ?? 0) * radius;
        const y = (points[index + 1] ?? 0) * radius;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.fill();
    });
    return { texture, size: size * 2 };
  }

  /** A thin ring lying on the ground. */
  ring(radius: number, color: number): Shape {
    return { texture: null, size: radius, flat: true, color };
  }

  /** A loaded picture (the sakura petal) used as a particle. */
  picture(texture: Texture, size: number): Shape {
    return { texture, size };
  }

  dispose(): void {
    for (const texture of this.cache.values()) texture.dispose();
    this.cache.clear();
  }
}

const RING = new RingGeometry(0.85, 1, 28).rotateX(-Math.PI / 2);

/** Moves, fades and removes skill-effect particles. */
export class ParticleLayer {
  readonly group = new Group();
  private readonly particles: Particle[] = [];

  add(shape: Shape, options: ParticleOptions): void {
    let node: ParticleNode;
    let material: SpriteMaterial | MeshBasicMaterial;
    if (shape.flat) {
      const ring = new MeshBasicMaterial({
        color: shape.color ?? 0xffffff,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        side: DoubleSide,
      });
      material = ring;
      node = new Mesh(RING, ring);
    } else {
      const sprite = new SpriteMaterial({
        map: shape.texture,
        transparent: true,
        depthWrite: false,
      });
      material = sprite;
      node = new Sprite(sprite);
    }
    node.position.set(options.x, options.y, options.z);
    const particle: Particle = {
      node,
      material,
      size: shape.size,
      scale: options.scale ?? 1,
      vx: options.vx ?? 0,
      vy: options.vy ?? 0,
      vz: options.vz ?? 0,
      gravity: options.gravity ?? 0,
      drag: options.drag ?? 1,
      spin: options.spin ?? 0,
      grow: options.grow ?? 0,
      maxScale: options.maxScale ?? Number.POSITIVE_INFINITY,
      age: 0,
      life: options.life ?? 1,
      fadeAt: options.fadeAt ?? 0.6,
      floor: options.floor ?? null,
      opacity: options.opacity ?? material.opacity,
    };
    material.opacity = particle.opacity;
    this.applyScale(particle);
    this.group.add(node);
    this.particles.push(particle);
  }

  private applyScale(particle: Particle): void {
    const size = Math.max(particle.size * particle.scale, 0.0001);
    particle.node.scale.set(size, size, size);
  }

  update(dt: number): void {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      if (!particle) continue;
      const { node } = particle;
      particle.age += dt;
      const keep = particle.drag ** dt;
      particle.vx *= keep;
      particle.vz *= keep;
      particle.vy = particle.vy * keep - particle.gravity * dt;
      node.position.x += particle.vx * dt;
      node.position.y += particle.vy * dt;
      node.position.z += particle.vz * dt;
      if (particle.floor !== null && node.position.y < particle.floor) {
        node.position.y = particle.floor;
        particle.vx = 0;
        particle.vy = 0;
        particle.vz = 0;
        particle.gravity = 0;
      }
      if (node instanceof Sprite) node.material.rotation += particle.spin * dt;
      if (particle.grow !== 0) {
        particle.scale = Math.min(
          particle.maxScale,
          Math.max(0, particle.scale + particle.grow * dt),
        );
        this.applyScale(particle);
      }
      const progress = particle.age / particle.life;
      if (progress > particle.fadeAt) {
        const fade = Math.max(0, 1 - (progress - particle.fadeAt) / (1 - particle.fadeAt));
        particle.material.opacity = particle.opacity * fade;
      }
      if (progress >= 1) {
        this.group.remove(node);
        particle.material.dispose();
        this.particles.splice(index, 1);
      }
    }
  }

  get count(): number {
    return this.particles.length;
  }

  dispose(): void {
    for (const particle of this.particles) particle.material.dispose();
    this.particles.length = 0;
    this.group.clear();
  }
}
