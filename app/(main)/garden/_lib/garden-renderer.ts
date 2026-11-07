// The PixiJS garden (garden-scene spec §3.6–3.8, §7). Imported only with import() from the
// garden page, so pixi.js never reaches the bundles of other pages.
import { Application, Assets, Container, Graphics, Sprite, type Texture } from "pixi.js";

import { assetUrl, gardenAsset } from "@/lib/garden/assets";
import { SCENE } from "@/lib/garden/config";
import {
  SCENE_HEIGHT,
  SCENE_WIDTH,
  TILE_H,
  TILE_W,
  decorTile,
  tileCenter,
  type Point,
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
  "pipo-leg-back",
  "pipo-leg-front",
  "pipo-body",
  "pipo-wing-front",
  "pipo-eyes-open",
  "pipo-eyes-closed",
];
const CAT_PARTS = ["cat-shadow", "cat-tail", "cat-leg-back", "cat-leg-front", "cat-body"];
/** Opacity of a tree while Pipo walks behind it. */
const OCCLUDING_ALPHA = 0.45;

function neededAssets(model: SceneModel): string[] {
  const ids = new Set<string>(["bg-sky", "bg-fuji", "cloud-a", "cloud-b", ...PIPO_PARTS]);
  for (const tile of model.tiles) ids.add(tile.asset);
  for (const tree of model.trees) ids.add(tree.asset);
  for (const decoration of model.decorations) ids.add(decoration.asset);
  if (model.pond) ids.add("deco-pond");
  if (model.koi) ids.add("koi-a").add("koi-b");
  if (model.cat) CAT_PARTS.forEach((id) => ids.add(id));
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

  // --- Background: sky, Mount Fuji, clouds -------------------------------------------
  const sky = sprite("bg-sky");
  const fuji = sprite("bg-fuji");
  fuji.position.set(468, 96);
  const clouds = Array.from({ length: SCENE.clouds }, (_, index) => {
    const cloud = sprite(index % 2 === 0 ? "cloud-a" : "cloud-b");
    cloud.position.set(80 + index * 210, 26 + (index % 2) * 26);
    return { sprite: cloud, speed: 4 + index * 1.5 };
  });
  app.stage.addChild(sky, fuji, ...clouds.map((cloud) => cloud.sprite));

  // --- Ground: tiles, pond, koi -----------------------------------------------------
  const ground = new Container();
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

  // --- World: trees, Pipo, cat, drawn back to front by their feet ---------------------
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

  for (const decoration of model.decorations) {
    const piece = sprite(decoration.asset);
    piece.position.set(decoration.x, decoration.y);
    piece.zIndex = decoration.y;
    world.addChild(piece);
  }

  const pipo = new Container();
  const torso = new Container();
  const pipoShadow = part("pipo-shadow", "pipo-body");
  const legBack = part("pipo-leg-back", "pipo-body");
  const legFront = part("pipo-leg-front", "pipo-body");
  const wingBack = part("pipo-wing-back", "pipo-body");
  const wingFront = part("pipo-wing-front", "pipo-body");
  const eyes = part("pipo-eyes-open", "pipo-body");
  torso.addChild(wingBack, sprite("pipo-body"), wingFront, eyes);
  pipo.addChild(pipoShadow, legBack, legFront, torso);
  pipo.eventMode = "static";
  pipo.cursor = "pointer";
  world.addChild(pipo);

  let cat: { root: Container; legs: Sprite[]; tail: Sprite } | null = null;
  if (model.cat) {
    const root = new Container();
    const tail = part("cat-tail", "cat-body");
    const legs = [part("cat-leg-back", "cat-body"), part("cat-leg-front", "cat-body")];
    root.addChild(part("cat-shadow", "cat-body"), tail, ...legs, sprite("cat-body"));
    world.addChild(root);
    cat = { root, legs, tail };
  }

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
  let catDistance = pathLength();
  let catDirection = -1;
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
    const swing = walking ? Math.sin(elapsed * 10) * 0.35 : 0;
    legFront.rotation = swing;
    legBack.rotation = -swing;
    const sitting = pipoState.mode === "sitting";
    legFront.visible = !sitting;
    legBack.visible = !sitting;
    if (pipoState.mode === "reacting") {
      const progress = 1 - pipoState.timer / SCENE.reactSeconds;
      torso.y = -Math.sin(progress * Math.PI) * 8;
      wingFront.rotation = Math.sin(elapsed * 30) * 0.6;
      wingBack.rotation = -wingFront.rotation;
    } else {
      torso.y = sitting ? 4 : walking ? -Math.abs(Math.sin(elapsed * 10)) * 2 : 0;
      wingFront.rotation = 0;
      wingBack.rotation = 0;
    }

    // A tree standing in front of Pipo fades so Pipo stays visible behind its canopy
    for (const tree of treeSprites) {
      const covers =
        tree.y > at.y && Math.abs(tree.x - at.x) < tree.halfWidth && at.y > tree.y - tree.height;
      tree.sprite.alpha = covers ? OCCLUDING_ALPHA : 1;
    }

    // Cat walks the other way
    if (cat) {
      if (moving) {
        catDistance += SCENE.catSpeed * dt * catDirection;
        if (catDistance <= 0 || catDistance >= pathLength()) {
          catDirection = -catDirection;
          catDistance = Math.min(Math.max(catDistance, 0), pathLength());
        }
      }
      const catAt = pointAt(catDistance);
      cat.root.position.set(catAt.x, catAt.y + 6);
      cat.root.zIndex = catAt.y + 6;
      cat.root.scale.x = catDirection;
      const catSwing = moving ? Math.sin(elapsed * 8) * 0.3 : 0;
      cat.legs.forEach((leg, index) => (leg.rotation = index === 0 ? catSwing : -catSwing));
      cat.tail.rotation = moving ? Math.sin(elapsed * 2) * 0.2 : 0;
    }

    // Koi swim slow ellipses around the pond
    koi.forEach((fish, index) => {
      if (!model.pond) return;
      const angle = (moving ? elapsed * 0.5 : 0) + index * Math.PI;
      fish.position.set(model.pond.x + Math.cos(angle) * 30, model.pond.y + Math.sin(angle) * 14);
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
    const center = tileCenter(decorTile(slot));
    highlight
      .roundRect(center.x - TILE_W / 2 + 3, center.y - TILE_H / 2 + 3, TILE_W - 6, TILE_H - 6, 8)
      .stroke({ width: 3, color: 0xfcf4ec });
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
