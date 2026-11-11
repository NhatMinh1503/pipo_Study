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
import type { SceneModel } from "@/lib/garden/scene-model";

export interface RendererOptions {
  reducedMotion: boolean;
  onTreeSelect: (treeId: string) => void;
  /** Pipo wants to say something; position is the top of its head in scene coordinates. */
  onPipoSpeak: (position: Point) => void;
  random?: () => number;
}

export interface GardenRenderer {
  /** Same as clicking Pipo (keyboard "Chào Pipo" button). */
  greetPipo: () => void;
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
/** How much the slime squashes when it lands (fraction of its size). */
const SLIME_SQUASH = 0.16;
/** Chance per second that a pet stops for a rest, and how long it rests. */
const PET_REST_CHANCE = 0.08;
const PET_REST_SECONDS = { min: 1.5, max: 3.5 } as const;
/** Pets keep to two lanes across the path so they pass each other instead of overlapping. */
const PET_LANES = [7, 2] as const;
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
  for (const pet of model.pets) ids.add(pet.asset).add("slime-shadow");
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

  const pets = model.pets.map((pet, index) => {
    const root = new Container();
    const shadow = sprite("slime-shadow");
    const body = sprite(pet.asset);
    root.addChild(shadow, body);
    world.addChild(root);
    return {
      pet,
      root,
      body,
      shadow,
      distance: pet.start * pathLength(),
      direction: pet.direction,
      rest: 0,
      lane: PET_LANES[index % PET_LANES.length] ?? 0,
      // Pets do not hop in step with each other
      phase: index * 0.37,
    };
  });

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
      torso.y = -Math.sin(progress * Math.PI) * 10;
      torso.scale.set(1, 1);
      wingFront.rotation = Math.sin(elapsed * 30) * 0.6;
      wingBack.rotation = -wingFront.rotation;
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

    // Pets wander the path both ways, resting now and then: slimes hop with a squash
    // when they land, the cloud floats and bobs above its shadow
    for (const roamer of pets) {
      const { pet } = roamer;
      if (moving) {
        if (roamer.rest > 0) {
          roamer.rest -= dt;
        } else {
          roamer.distance += pet.speed * dt * roamer.direction;
          if (roamer.distance <= 0 || roamer.distance >= pathLength()) {
            roamer.direction = roamer.direction === 1 ? -1 : 1;
            roamer.distance = Math.min(Math.max(roamer.distance, 0), pathLength());
          }
          if (random() < dt * PET_REST_CHANCE) {
            roamer.rest =
              PET_REST_SECONDS.min + random() * (PET_REST_SECONDS.max - PET_REST_SECONDS.min);
          }
        }
      }
      const at = pointAt(roamer.distance);
      roamer.root.position.set(at.x, at.y + roamer.lane);
      roamer.root.zIndex = at.y + roamer.lane;

      const beat = (elapsed + roamer.phase) * pet.beatsPerSecond;
      if (pet.motion === "float") {
        const bob = moving ? Math.sin(beat * 2 * Math.PI) : 0;
        roamer.body.y = -(pet.height + bob * 3);
        roamer.body.scale.set(roamer.direction, 1);
        roamer.shadow.scale.set(0.8 - bob * 0.08);
        roamer.shadow.alpha = 0.5;
      } else {
        const hopping = moving && roamer.rest <= 0;
        const lift = hopping ? Math.abs(Math.sin(beat * Math.PI)) : 0;
        const squash = hopping ? (1 - lift) ** 3 * SLIME_SQUASH : 0;
        // Resting slimes breathe a little instead
        const breath = moving && !hopping ? Math.sin((elapsed + roamer.phase) * 2.4) * 0.03 : 0;
        roamer.body.y = -lift * pet.height;
        roamer.body.scale.set(
          roamer.direction * (1 + squash - breath),
          1 - squash + lift * 0.06 + breath,
        );
        roamer.shadow.scale.set(1 - lift * 0.35);
        roamer.shadow.alpha = 1 - lift * 0.4;
      }
    }

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
    highlightSlot,
    destroy: () => {
      document.removeEventListener("visibilitychange", onVisibility);
      app.destroy(true, { children: true });
    },
  };
}
