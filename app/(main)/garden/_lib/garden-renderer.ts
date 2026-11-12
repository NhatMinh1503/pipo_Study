// The PixiJS garden (garden-scene spec §3.6–3.8, §7). Imported only with import() from the
// garden page, so pixi.js never reaches the bundles of other pages.
import {
  Application,
  Assets,
  BlurFilter,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  TilingSprite,
  type Texture,
} from "pixi.js";

import { assetUrl, gardenAsset } from "@/lib/garden/assets";
import { SCENE } from "@/lib/garden/config";
import {
  SCENE_HEIGHT,
  SCENE_WIDTH,
  decorTile,
  tileCorners,
  type Point,
  type Tile,
} from "@/lib/garden/layout";
import { pathLength, pointAt } from "@/lib/garden/path";
import {
  clickPipo,
  initialPipo,
  stepPipo,
  type PipoEvent,
  type PipoState,
} from "@/lib/garden/pipo-machine";
import { createPetBehaviour, type PetWorld } from "@/lib/garden/pet-behaviour";
import type { PetId } from "@/lib/garden/pets";
import type { SceneModel } from "@/lib/garden/scene-model";

import { ParticleLayer, shapes } from "./pets/particles";
import { createPetView } from "./pets/pet-view";

export interface RendererOptions {
  reducedMotion: boolean;
  onTreeSelect: (treeId: string) => void;
  /** Pipo wants to say something; position is the top of its head in scene coordinates. */
  onPipoSpeak: (position: Point) => void;
  /** A pet used its skill (tapped, from its button, or on its own). */
  onPetSkill?: (petId: PetId) => void;
  random?: () => number;
}

export interface GardenRenderer {
  /** Same as clicking Pipo (keyboard "Chào Pipo" button). */
  greetPipo: () => void;
  /** Same as tapping a pet (keyboard buttons under the garden). */
  usePetSkill: (petId: PetId) => void;
  /** Outlines a decoration slot while the learner chooses where to put something. */
  highlightSlot: (slot: number | null) => void;
  destroy: () => void;
}

const PIPO_PARTS = [
  "pipo-shadow",
  "pipo-wing-back",
  "pipo-body",
  "pipo-wing-front",
  "pipo-eyes-open",
  "pipo-eyes-closed",
];
/** Pets keep to two lanes across the path so they pass each other instead of overlapping. */
const PET_LANES = [7, 2] as const;
/** How high Pipo jumps when greeted, flapping its wings. */
const PIPO_GREET_JUMP = 22;
/** Pipo squashes a little less than the slime. */
const PIPO_SQUASH = 0.12;
/** Empty rows under the chick in pipo-body (where legs used to attach), in logical px. */
const PIPO_BODY_GAP = 9;
/** Opacity of a tree while Pipo walks behind it. */
const OCCLUDING_ALPHA = 0.45;
/** How soft the edge of the dirt path is, and how far its shade spreads into the meadow. */
const PATH_EDGE_BLUR = 2.5;
const PATH_SHADE_BLUR = 6;
/** The koi swim an ellipse this wide and tall around the middle of the pond. */
const KOI_ORBIT = { x: 46, y: 18 } as const;

/** One polygon per path tile, grown a little around its centre so neighbours overlap. */
function pathShape(tiles: readonly Tile[], grow: number, colour: number, alpha: number): Graphics {
  const shape = new Graphics();
  for (const tile of tiles) {
    const corners = tileCorners(tile);
    const cx = corners.reduce((sum, corner) => sum + corner.x, 0) / corners.length;
    const cy = corners.reduce((sum, corner) => sum + corner.y, 0) / corners.length;
    shape.poly(
      corners.flatMap((corner) => [cx + (corner.x - cx) * grow, cy + (corner.y - cy) * grow]),
    );
  }
  return shape.fill({ color: colour, alpha });
}

function neededAssets(model: SceneModel): string[] {
  const ids = new Set<string>(["bg-garden", "tile-path", "cloud-a", "cloud-b", ...PIPO_PARTS]);
  for (const tile of model.tiles) ids.add(tile.asset);
  for (const stone of model.stones) ids.add(stone.asset);
  for (const tree of model.trees) ids.add(tree.asset);
  for (const decoration of model.decorations) ids.add(decoration.asset);
  if (model.pond) ids.add("deco-pond");
  if (model.bridge) ids.add("deco-bridge");
  if (model.koi) ids.add("koi-a").add("koi-b");
  for (const pet of model.pets) for (const frame of pet.frames) ids.add(frame);
  if (model.pets.length > 0) ids.add("slime-shadow");
  // The sakura bunny's petal swirl uses the sakura petal
  if (model.pets.some((pet) => pet.id === "pet-slime-sakura")) ids.add("petal");
  if (model.petalSources.length > 0) ids.add("petal");
  return [...ids];
}

export async function createGardenRenderer(
  host: HTMLElement,
  model: SceneModel,
  options: RendererOptions,
): Promise<GardenRenderer> {
  const random = options.random ?? Math.random;
  const app = new Application();
  await app.init({
    width: SCENE_WIDTH,
    height: SCENE_HEIGHT,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  app.ticker.maxFPS = 60;
  // Scale with the container; PixiJS maps pointer positions through the CSS size
  app.canvas.style.width = "100%";
  app.canvas.style.height = "auto";
  app.canvas.style.display = "block";
  host.appendChild(app.canvas);

  const ids = neededAssets(model);
  await Assets.load(ids.map((id) => ({ alias: id, src: assetUrl(id) })));
  const texture = (id: string): Texture => Assets.get<Texture>(id);
  const sprite = (id: string): Sprite => {
    const info = gardenAsset(id);
    const result = new Sprite(texture(id));
    result.anchor.set(info.anchor.x / info.width, info.anchor.y / info.height);
    return result;
  };
  /** A body part placed at its attach point, relative to the body's anchor. */
  const part = (id: string, body: string): Sprite => {
    const piece = sprite(id);
    const attach = gardenAsset(id).attach ?? { x: 0, y: 0 };
    const anchor = gardenAsset(body).anchor;
    piece.position.set(attach.x - anchor.x, attach.y - anchor.y);
    return piece;
  };

  // --- Background: the painted sky, Mount Fuji, forest and meadow; drifting clouds -------
  const backdrop = sprite("bg-garden");
  const clouds = Array.from({ length: SCENE.clouds }, (_, index) => {
    const cloud = sprite(index % 2 === 0 ? "cloud-a" : "cloud-b");
    cloud.position.set(80 + index * 210, 18 + (index % 2) * 16);
    cloud.alpha = 0.92;
    return { sprite: cloud, speed: 3 + index * 1.2 };
  });
  app.stage.addChild(backdrop, ...clouds.map((cloud) => cloud.sprite));

  // --- Ground: the dirt path with a soft edge, stepping stones, plots, pond, koi ----------
  const ground = new Container();
  const sceneFrame = new Rectangle(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
  // A faint shade where the meadow meets the path, then the dirt cut out by a blurred mask
  const shade = pathShape(model.pathTiles, 1.12, 0x3c4a1c, 0.28);
  shade.filters = [new BlurFilter({ strength: PATH_SHADE_BLUR })];
  const maskShape = pathShape(model.pathTiles, 0.98, 0xffffff, 1);
  maskShape.filters = [new BlurFilter({ strength: PATH_EDGE_BLUR })];
  const maskTexture = app.renderer.generateTexture({ target: maskShape, frame: sceneFrame });
  maskShape.destroy();
  const pathMask = new Sprite(maskTexture);
  const dirt = new TilingSprite({
    texture: texture("tile-path"),
    width: SCENE_WIDTH,
    height: SCENE_HEIGHT,
  });
  dirt.mask = pathMask;
  ground.addChild(shade, dirt, pathMask);
  for (const stone of model.stones) {
    const piece = sprite(stone.asset);
    piece.position.set(stone.x, stone.y);
    piece.scale.set(stone.flip ? -stone.scale : stone.scale, stone.scale);
    ground.addChild(piece);
  }
  for (const tile of model.tiles) {
    const piece = sprite(tile.asset);
    piece.position.set(tile.x, tile.y);
    ground.addChild(piece);
  }
  const koi: Sprite[] = [];
  if (model.pond) {
    const pond = sprite("deco-pond");
    pond.position.set(model.pond.x, model.pond.y);
    ground.addChild(pond);
    if (model.koi) {
      for (let index = 0; index < SCENE.koi; index += 1) {
        const fish = sprite(index === 0 ? "koi-a" : "koi-b");
        ground.addChild(fish);
        koi.push(fish);
      }
    }
  }
  const highlight = new Graphics();
  highlight.visible = false;
  ground.addChild(highlight);
  app.stage.addChild(ground);

  // --- World: trees, Pipo, slime, drawn back to front by their feet ---------------------
  const world = new Container({ sortableChildren: true });
  app.stage.addChild(world);
  const treeSprites: { sprite: Sprite; x: number; y: number; halfWidth: number; height: number }[] =
    [];
  for (const tree of model.trees) {
    const piece = sprite(tree.asset);
    piece.position.set(tree.x, tree.y);
    piece.zIndex = tree.y;
    piece.eventMode = "static";
    piece.cursor = "pointer";
    piece.on("pointertap", () => options.onTreeSelect(tree.id));
    world.addChild(piece);
    const info = gardenAsset(tree.asset);
    treeSprites.push({
      sprite: piece,
      x: tree.x,
      y: tree.y,
      halfWidth: info.width / 2 - 4,
      height: info.height - 8,
    });
  }

  if (model.bridge) {
    const bridge = sprite("deco-bridge");
    bridge.position.set(model.bridge.x, model.bridge.y);
    bridge.zIndex = model.bridge.y;
    world.addChild(bridge);
  }

  for (const decoration of model.decorations) {
    const piece = sprite(decoration.asset);
    piece.position.set(decoration.x, decoration.y);
    piece.zIndex = decoration.y;
    world.addChild(piece);
  }

  const pipo = new Container();
  const torso = new Container();
  const pipoShadow = part("pipo-shadow", "pipo-body");
  const wingBack = part("pipo-wing-back", "pipo-body");
  const wingFront = part("pipo-wing-front", "pipo-body");
  const eyes = part("pipo-eyes-open", "pipo-body");
  torso.addChild(wingBack, sprite("pipo-body"), wingFront, eyes);
  // No legs: the round body sits on the ground and squashes from its bottom when it lands
  torso.pivot.set(0, -PIPO_BODY_GAP);
  pipo.addChild(pipoShadow, torso);
  pipo.eventMode = "static";
  pipo.cursor = "pointer";
  world.addChild(pipo);

  // Pets: behaviour objects (lib/garden/pet-behaviour.ts) drawn by their PetView subclass
  const petFx = new ParticleLayer(new Container());
  const petWorld: PetWorld = { pathLength: pathLength(), moving: !options.reducedMotion, random };
  const pets = model.pets.map((pet, index) => {
    const [idle, alt, skill] = pet.frames;
    const info = gardenAsset(idle);
    const view = createPetView(
      createPetBehaviour(pet.id, {
        start: pet.start,
        direction: pet.direction,
        phase: index * 0.37,
        pathLength: pathLength(),
      }),
      {
        frames: { idle: texture(idle), alt: texture(alt), skill: texture(skill) },
        anchor: { x: info.anchor.x / info.width, y: info.anchor.y / info.height },
        shadow: texture("slime-shadow"),
        petal: pet.id === "pet-slime-sakura" ? texture("petal") : null,
      },
      petFx,
      PET_LANES[index % PET_LANES.length] ?? 0,
      random,
    );
    view.root.on("pointertap", () => {
      if (view.triggerSkill(petWorld)) options.onPetSkill?.(pet.id);
    });
    world.addChild(view.root);
    return view;
  });
  app.stage.addChild(petFx.container);

  // --- Petals ------------------------------------------------------------------------
  const fx = new Container();
  app.stage.addChild(fx);
  const petals: { sprite: Sprite; vx: number; vy: number; floor: number; age: number }[] = [];

  // --- Behaviour ---------------------------------------------------------------------
  const context = {
    pathLength: pathLength(),
    stops: model.stops,
    reducedMotion: options.reducedMotion,
  };
  let pipoState: PipoState = initialPipo();
  let elapsed = 0;
  let petalClock = 0;

  const speak = (events: PipoEvent[]) => {
    if (events.includes("speak")) options.onPipoSpeak({ x: pipo.x, y: pipo.y - 50 });
  };
  const greetPipo = () => {
    const result = clickPipo(pipoState);
    pipoState = result.state;
    speak(result.events);
    if (options.reducedMotion) return;
    // A few feathers flutter down from the flapping wings
    for (let index = 0; index < 4; index += 1) {
      const feather = shapes.leaf(2.2, index % 2 === 0 ? 0xfce68a : 0xfff6cf);
      petFx.add(feather, {
        x: pipo.x + (random() - 0.5) * 16,
        y: pipo.y - 20 - random() * 8,
        vx: (random() - 0.5) * 30,
        vy: -10 - random() * 20,
        gravity: 30,
        drag: 0.4,
        spin: (random() - 0.5) * 8,
        life: 1.4,
        fadeAt: 0.5,
      });
    }
  };
  const usePetSkill = (petId: PetId) => {
    const view = pets.find((candidate) => candidate.id === petId);
    if (view?.triggerSkill(petWorld)) options.onPetSkill?.(petId);
  };
  pipo.on("pointertap", greetPipo);

  const update = (dt: number) => {
    elapsed += dt;
    const moving = !options.reducedMotion;

    // Pipo
    const step = stepPipo(pipoState, dt, context, random);
    pipoState = step.state;
    speak(step.events);
    const at = pointAt(pipoState.distance);
    pipo.position.set(at.x, at.y);
    pipo.zIndex = at.y;
    pipo.scale.x = pipoState.direction;
    eyes.texture = texture(pipoState.blinking > 0 ? "pipo-eyes-closed" : "pipo-eyes-open");
    const walking = pipoState.mode === "walking";
    const sitting = pipoState.mode === "sitting";
    // 0 on the ground, 1 at the top of a hop (same bounce as the slime)
    const lift =
      walking && moving ? Math.abs(Math.sin(elapsed * SCENE.pipoHopsPerSecond * Math.PI)) : 0;
    const squash = walking && moving ? (1 - lift) ** 3 * PIPO_SQUASH : 0;
    // Standing still, Pipo breathes: a slow, slight squash
    const breath = !walking && moving ? Math.sin(elapsed * 2.2) * 0.025 : 0;
    if (pipoState.mode === "reacting") {
      const progress = 1 - pipoState.timer / SCENE.reactSeconds;
      // A happy jump: crouch, spring up flapping hard, land with a little squash
      const air = Math.max(0, Math.sin(Math.min(1, progress * 1.25) * Math.PI));
      const crouch = progress < 0.12 ? Math.sin((progress / 0.12) * Math.PI) * 0.1 : 0;
      torso.y = moving ? -air * PIPO_GREET_JUMP : 0;
      torso.scale.set(1 + crouch, 1 - crouch);
      const flap = moving ? Math.sin(elapsed * 34) * (0.5 + air * 0.6) - air * 0.5 : 0;
      wingFront.rotation = flap;
      wingBack.rotation = -flap;
    } else {
      torso.y = -lift * SCENE.pipoHopHeight;
      const sit = sitting ? 0.06 : 0;
      torso.scale.set(1 + squash + sit + breath, 1 - squash - sit - breath + lift * 0.06);
      // Wings lift a little at the top of each hop
      wingFront.rotation = -lift * 0.35;
      wingBack.rotation = lift * 0.35;
    }
    pipoShadow.scale.set(1 - lift * 0.35);
    pipoShadow.alpha = 1 - lift * 0.4;

    // A tree standing in front of Pipo fades so Pipo stays visible behind its canopy
    for (const tree of treeSprites) {
      const covers =
        tree.y > at.y && Math.abs(tree.x - at.x) < tree.halfWidth && at.y > tree.y - tree.height;
      tree.sprite.alpha = covers ? OCCLUDING_ALPHA : 1;
    }

    // Pets wander, rest and use their skills; each species draws its own effect
    for (const view of pets) {
      const events = view.behaviour.update(dt, petWorld);
      if (events.includes("skill")) options.onPetSkill?.(view.id);
      view.render(dt, petWorld, pointAt(view.behaviour.distance));
    }
    petFx.update(dt);

    // Koi swim slow ellipses around the pond
    koi.forEach((fish, index) => {
      if (!model.pond) return;
      const angle = (moving ? elapsed * 0.5 : 0) + index * Math.PI;
      fish.position.set(
        model.pond.x + Math.cos(angle) * KOI_ORBIT.x,
        model.pond.y + Math.sin(angle) * KOI_ORBIT.y,
      );
      fish.rotation = angle + Math.PI / 2;
    });

    if (!moving) return;

    for (const cloud of clouds) {
      cloud.sprite.x += cloud.speed * dt;
      if (cloud.sprite.x > SCENE_WIDTH + 80) cloud.sprite.x = -80;
    }

    // Petals fall from blooming sakura
    petalClock += dt;
    if (model.petalSources.length > 0 && petalClock > 0.5 && petals.length < SCENE.maxPetals) {
      petalClock = 0;
      const source = model.petalSources[Math.floor(random() * model.petalSources.length)];
      if (source) {
        const petal = sprite("petal");
        petal.position.set(source.x + (random() - 0.5) * 50, source.y + (random() - 0.5) * 20);
        fx.addChild(petal);
        petals.push({
          sprite: petal,
          vx: 4 + random() * 6,
          vy: 10 + random() * 8,
          floor: source.y + 80,
          age: 0,
        });
      }
    }
    for (let index = petals.length - 1; index >= 0; index -= 1) {
      const petal = petals[index];
      if (!petal) continue;
      petal.age += dt;
      petal.sprite.x += (petal.vx + Math.sin(petal.age * 3) * 8) * dt;
      petal.sprite.y += petal.vy * dt;
      petal.sprite.rotation += dt;
      if (petal.sprite.y > petal.floor) petal.sprite.alpha -= dt;
      if (petal.sprite.alpha <= 0) {
        petal.sprite.destroy();
        petals.splice(index, 1);
      }
    }
  };

  app.ticker.add((ticker) => update(Math.min(ticker.deltaMS / 1000, 0.1)));
  update(0);

  // Nothing animates in a hidden tab
  const onVisibility = () => {
    if (document.hidden) app.ticker.stop();
    else app.ticker.start();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const highlightSlot = (slot: number | null) => {
    highlight.clear();
    highlight.visible = slot !== null;
    if (slot === null) return;
    highlight
      .poly(tileCorners(decorTile(slot)).flatMap((corner) => [corner.x, corner.y]))
      .stroke({ width: 3, color: 0xfcf4ec, alignment: 1 });
  };

  return {
    greetPipo,
    usePetSkill,
    highlightSlot,
    destroy: () => {
      document.removeEventListener("visibilitychange", onVisibility);
      app.destroy(true, { children: true });
    },
  };
}
