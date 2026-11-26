// The 3D clay garden (garden-scene spec §3.6–3.8, §7): a floating island with clay trees,
// Pipo and the pets. Imported only with import() from the garden page, so three.js never
// reaches the bundles of other pages.
import {
  AmbientLight,
  Box3,
  Clock,
  DirectionalLight,
  Group,
  HemisphereLight,
  Layers,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Raycaster,
  RingGeometry,
  SRGBColorSpace,
  Scene,
  Sprite,
  SpriteMaterial,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
  PCFSoftShadowMap,
  type Material,
  type Object3D,
  type Texture,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

import { assetUrl, gardenAsset } from "@/lib/garden/assets";
import { SCENE } from "@/lib/garden/config";
import {
  GROUND_H,
  ISLAND_ORIGIN,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  UNITS_TO_PX,
  decorPoint,
  type Point,
} from "@/lib/garden/layout";
import { ISLAND_MODEL, PIPO_MODEL, modelUrl } from "@/lib/garden/models";
import { closestOnPath, pathLength, pointAt } from "@/lib/garden/path";
import { createPetBehaviour, type PetWorld } from "@/lib/garden/pet-behaviour";
import type { PetId } from "@/lib/garden/pets";
import {
  clickPipo,
  initialPipo,
  stepPipo,
  type PipoEvent,
  type PipoState,
} from "@/lib/garden/pipo-machine";
import type { SceneModel } from "@/lib/garden/scene-model";

import { ParticleLayer, ShapeBook } from "./pets/particles";
import { createPetView, type PetLook } from "./pets/pet-view";
import { Billboard, anchoredCard, blobShadow, shadowTexture } from "./three/billboard";
import { DEFAULT_YAW, fitGardenCamera, gardenCamera, toWorld } from "./three/camera";

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

// World units are the logical px of the 2D garden (x across, y up, z toward the viewer), so
// layout numbers, hop heights and particle speeds keep their meaning.

/** Tree height in px for each step of growth: the shared sprout, then -2, -3 and -4. */
const TREE_HEIGHT: Record<string, number> = { sprout: 26, "2": 58, "3": 86, "4": 124 };
/** Widest a tree may be at each step, px, so a bushy model stays inside its plot like the concept. */
const TREE_WIDTH: Record<string, number> = { sprout: 30, "2": 46, "3": 62, "4": 80 };
/** Height of each pet model, px (the 2D frames were about this tall). */
const PET_HEIGHT: Record<string, number> = {
  "pet-ember-lava": 34,
  "pet-sakura-mochi": 42,
  "pet-moss-jelly": 40,
  "pet-cloud": 36,
};
/** Pipo, the pets and decorations are drawn this much bigger than their 2D art. */
const FIGURE_SCALE = 1.25;
/** Pets keep to two lanes beside the path so they pass each other instead of overlapping. */
const PET_LANES = [9, -5] as const;
/** How high Pipo jumps when greeted, flapping its wings. */
const PIPO_GREET_JUMP = 22;
/** Pipo squashes a little less than the slime. */
const PIPO_SQUASH = 0.12;
/** Pipo's height, px (before FIGURE_SCALE). */
const PIPO_HEIGHT = 40;
/** Decoration heights, px, and the widest they may be (before FIGURE_SCALE). */
const DECOR_SIZE: Record<string, { height: number; width: number }> = {
  "deco-torii": { height: 70, width: 72 },
  "deco-lantern": { height: 44, width: 30 },
  "deco-bench": { height: 30, width: 46 },
};
/** A walker turns this much of the way toward where it walks; the rest faces the camera. */
const WALK_TURN = 0.6;
const TURN_SPEED = 8;
/** Opacity of a tree while Pipo or a pet walks behind it. */
const OCCLUDING_ALPHA = 0.45;
/** The island bobs gently up and down, px, and how fast (radians per second). */
const BOB_HEIGHT = 3;
const BOB_SPEED = 0.6;
/** Painted backdrop behind the island (made with Gemini from the concept art). */
const BACKDROP_URL = "/garden3d/backdrop.webp";
/** Radians the island turns per px dragged sideways. */
const DRAG_TURN = 0.008;
/** A press that moves less than this (px) is a tap, not a drag. */
const DRAG_SLOP = 5;
/** Share of the spin kept each second after letting go. */
const SPIN_KEEP = 0.04;
/** Raycasts only look at things that can be tapped. */
const PICK_LAYER = 1;

function treeStep(modelId: string): string {
  return modelId === "sprout" ? "sprout" : (modelId.match(/-(\d)(?:-|$)/)?.[1] ?? "4");
}

/**
 * A copy of a model, scaled to `height` px (or less, so it is at most `width` px wide),
 * standing on the origin. Materials are its own.
 */
function placeModel(source: Object3D, height: number, shadows: boolean, width = Infinity): Group {
  const model = source.clone(true);
  model.traverse((node) => {
    if (node instanceof Mesh) {
      node.material = Array.isArray(node.material)
        ? node.material.map((material: Material) => material.clone())
        : node.material.clone();
      node.castShadow = shadows;
      node.receiveShadow = shadows;
    }
  });
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const scale = Math.min(height / (size.y || 1), width / (Math.max(size.x, size.z) || 1));
  const fit = new Group();
  fit.scale.setScalar(scale);
  fit.position.set(
    (-(box.min.x + box.max.x) / 2) * scale,
    -box.min.y * scale,
    (-(box.min.z + box.max.z) / 2) * scale,
  );
  fit.add(model);
  const holder = new Group();
  holder.add(fit);
  return holder;
}

function materialsOf(root: Object3D): Material[] {
  const found: Material[] = [];
  root.traverse((node) => {
    if (node instanceof Mesh) {
      if (Array.isArray(node.material)) found.push(...node.material);
      else found.push(node.material);
    }
  });
  return found;
}

function makePickable(root: Object3D): void {
  root.traverse((node) => node.layers.enable(PICK_LAYER));
}

export async function createGardenRenderer(
  host: HTMLElement,
  model: SceneModel,
  options: RendererOptions,
): Promise<GardenRenderer> {
  const random = options.random ?? Math.random;
  const moving = !options.reducedMotion;

  // --- Renderer, scene, camera, light ------------------------------------------------
  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  // Sideways drags turn the island; up and down still scroll the page on a phone
  canvas.style.touchAction = "pan-y";
  canvas.style.cursor = "grab";
  // Painted clay backdrop (Mount Fuji and a forest on cream paper) behind the island
  // Zoomed a little and pinned to the bottom, so the horizon sits high behind the island
  canvas.style.background = `url(${BACKDROP_URL}) 38% 100% / 118% auto no-repeat, #f3ecdf`;

  const scene = new Scene();
  const camera = gardenCamera(SCENE_WIDTH / SCENE_HEIGHT);
  // Light measured against the concept art: a strong, nearly white sun gives the trees
  // their bright tops and shaded sides (the concept's light-to-dark spread), with just
  // enough sky light that shadows do not go black
  scene.add(new HemisphereLight(0xf7f5ef, 0x8a876d, 0.8), new AmbientLight(0xffffff, 0.12));
  const sun = new DirectionalLight(0xfff2e1, 3.7);
  sun.position.set(-220, 520, 320);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 4;
  // Wide enough for the island at any turn (its corners reach about 410 px from the middle)
  sun.shadow.camera.left = -440;
  sun.shadow.camera.right = 440;
  sun.shadow.camera.top = 440;
  sun.shadow.camera.bottom = -440;
  sun.shadow.camera.near = 50;
  sun.shadow.camera.far = 1500;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.8;
  scene.add(sun, sun.target);

  /** Everything on the island; it bobs as one piece. */
  const garden = new Group();
  garden.rotation.y = DEFAULT_YAW;
  scene.add(garden);

  // --- Loading -----------------------------------------------------------------------
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const modelIds = new Set<string>([ISLAND_MODEL, PIPO_MODEL]);
  for (const tree of model.trees) modelIds.add(tree.model);
  for (const pet of model.pets) if (pet.model) modelIds.add(pet.model);

  const pictureIds = new Set<string>();
  for (const decoration of model.decorations) {
    if (decoration.model) modelIds.add(decoration.model);
    else pictureIds.add(decoration.asset);
  }
  if (model.koi) pictureIds.add("koi-a").add("koi-b");
  for (const pet of model.pets)
    if (!pet.model) for (const frame of pet.frames) pictureIds.add(frame);
  if (model.petalSources.length > 0 || model.pets.some((pet) => pet.id === "pet-slime-sakura")) {
    pictureIds.add("petal");
  }

  const textureLoader = new TextureLoader();
  const [models, pictures] = await Promise.all([
    Promise.all(
      [...modelIds].map(async (id) => [id, (await loader.loadAsync(modelUrl(id))).scene] as const),
    ),
    Promise.all(
      [...pictureIds].map(async (id) => {
        const texture = await textureLoader.loadAsync(assetUrl(id));
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = 4;
        return [id, texture] as const;
      }),
    ),
  ]);
  const modelById = new Map<string, Object3D>(models);
  const pictureById = new Map<string, Texture>(pictures);
  const getModel = (id: string): Object3D => {
    const found = modelById.get(id);
    if (!found) throw new Error(`Garden model not loaded: ${id}`);
    return found;
  };
  const picture = (id: string): Texture => {
    const found = pictureById.get(id);
    if (!found) throw new Error(`Garden picture not loaded: ${id}`);
    return found;
  };
  const shapes = new ShapeBook();
  const shadows = shadowTexture();

  // --- The island ----------------------------------------------------------------------
  const island = getModel(ISLAND_MODEL);
  island.scale.setScalar(UNITS_TO_PX);
  island.traverse((node) => {
    if (node instanceof Mesh) node.receiveShadow = true;
  });
  garden.add(island);

  // --- Trees ---------------------------------------------------------------------------
  const trees = model.trees.map((tree) => {
    const step = treeStep(tree.model);
    const holder = placeModel(
      getModel(tree.model),
      TREE_HEIGHT[step] ?? 124,
      true,
      TREE_WIDTH[step] ?? 80,
    );
    holder.position.copy(toWorld(tree.x, tree.y, tree.h - 1));
    // A little turn per plot so rows of the same tree do not look stamped
    holder.rotation.y = ((tree.plot * 37) % 360) * (Math.PI / 180);
    holder.userData.treeId = tree.id;
    makePickable(holder);
    garden.add(holder);
    return {
      holder,
      x: tree.x,
      y: tree.y,
      materials: materialsOf(holder),
      faded: false,
      rect: { left: 0, bottom: 0, right: 0, top: 0 },
    };
  });

  // --- Decorations, koi, highlight -------------------------------------------------------
  const cards: Billboard[] = [];
  for (const decoration of model.decorations) {
    const at = toWorld(decoration.x, decoration.y, decoration.h);
    if (decoration.model) {
      const size = DECOR_SIZE[decoration.model] ?? { height: 40, width: 40 };
      const piece = placeModel(getModel(decoration.model), size.height, true, size.width);
      piece.position.copy(at);
      piece.scale.setScalar(FIGURE_SCALE);
      // Face the path, so the bench looks onto it and the gate opens toward it
      const onPath = pointAt(closestOnPath(decoration).distance);
      piece.rotation.y = Math.atan2(onPath.x - decoration.x, onPath.y - decoration.y);
      garden.add(piece);
      continue;
    }
    const card = new Billboard();
    card.add(anchoredCard(decoration.asset, picture(decoration.asset)));
    card.position.copy(at);
    card.scale.setScalar(FIGURE_SCALE);
    garden.add(card);
    cards.push(card);
  }

  const koi: Mesh[] = [];
  if (model.koi) {
    for (let index = 0; index < SCENE.koi; index += 1) {
      const id = index === 0 ? "koi-a" : "koi-b";
      const info = gardenAsset(id);
      const fish = new Mesh(
        new PlaneGeometry(info.width, info.height).rotateX(-Math.PI / 2),
        new MeshBasicMaterial({ map: picture(id), transparent: true, depthWrite: false }),
      );
      garden.add(fish);
      koi.push(fish);
    }
  }

  const highlight = new Mesh(
    new RingGeometry(15, 19, 40).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xfcf4ec, transparent: true, opacity: 0.95, depthWrite: false }),
  );
  highlight.visible = false;
  garden.add(highlight);

  // --- Pipo: the clay chick with round glasses -----------------------------------------
  const pipo = new Group();
  pipo.userData.pipo = true;
  const pipoShadow = blobShadow(shadows, 30);
  /** Moved and squashed by Pipo's hops and jumps. */
  const torso = new Group();
  /** Turned toward where Pipo walks, or to the camera when it stops. */
  const pipoTurn = new Group();
  pipoTurn.add(placeModel(getModel(PIPO_MODEL), PIPO_HEIGHT, false));
  torso.add(pipoTurn);
  torso.scale.setScalar(FIGURE_SCALE);
  pipo.add(pipoShadow, torso);
  makePickable(torso);
  garden.add(pipo);
  let pipoYaw = 0;

  // --- Pets: the same behaviour objects as before, drawn in 3D ----------------------------
  const petFx = new ParticleLayer();
  garden.add(petFx.group);
  const petWorld: PetWorld = { pathLength: pathLength(), moving, random };
  const pets = model.pets.map((pet, index) => {
    let look: PetLook;
    if (pet.model) {
      const height = PET_HEIGHT[pet.model] ?? 32;
      const placed = placeModel(getModel(pet.model), height, false);
      const width = new Box3().setFromObject(placed).getSize(new Vector3()).x;
      look = { kind: "model", model: placed, width };
    } else {
      const [idle, alt, skill] = pet.frames;
      look = {
        kind: "card",
        art: idle,
        frames: { idle: picture(idle), alt: picture(alt), skill: picture(skill) },
        width: gardenAsset(idle).width * 0.7,
      };
    }
    const view = createPetView(
      createPetBehaviour(pet.id, {
        start: pet.start,
        direction: pet.direction,
        phase: index * 0.37,
        pathLength: pathLength(),
      }),
      {
        look,
        shadow: shadows,
        shapes,
        petal: pet.id === "pet-slime-sakura" ? picture("petal") : null,
      },
      petFx,
      PET_LANES[index % PET_LANES.length] ?? 0,
      random,
    );
    makePickable(view.root);
    view.root.scale.setScalar(FIGURE_SCALE);
    garden.add(view.root);
    return view;
  });

  // --- Falling petals --------------------------------------------------------------------
  const petals: { sprite: Sprite; vx: number; vy: number; age: number }[] = [];
  const petalMaterial = pictureById.has("petal")
    ? new SpriteMaterial({ map: picture("petal"), transparent: true, depthWrite: false })
    : null;

  // --- Framing -----------------------------------------------------------------------------
  const projected = new Vector3();
  const measureTrees = () => {
    for (const tree of trees) {
      const box = new Box3().setFromObject(tree.holder);
      let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
      for (let index = 0; index < 8; index += 1) {
        projected
          .set(
            index & 1 ? box.max.x : box.min.x,
            index & 2 ? box.max.y : box.min.y,
            index & 4 ? box.max.z : box.min.z,
          )
          .project(camera);
        minX = Math.min(minX, projected.x);
        maxX = Math.max(maxX, projected.x);
        minY = Math.min(minY, projected.y);
        maxY = Math.max(maxY, projected.y);
      }
      // Only the canopy hides Pipo; shrink the box to its middle
      const shrinkX = (maxX - minX) * 0.15;
      tree.rect = {
        left: minX + shrinkX,
        bottom: minY + (maxY - minY) * 0.25,
        right: maxX - shrinkX,
        top: maxY,
      };
    }
  };
  const resize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    garden.position.y = 0;
    scene.updateMatrixWorld();
    fitGardenCamera(camera);
    measureTrees();
  };
  host.appendChild(canvas);
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(host);

  // --- Behaviour ---------------------------------------------------------------------------
  const context = {
    pathLength: pathLength(),
    stops: model.stops,
    reducedMotion: options.reducedMotion,
  };
  let pipoState: PipoState = initialPipo();
  let elapsed = 0;
  // Dragging sideways turns the island around its vertical axis; its tilt stays fixed
  let drag: { id: number; x: number; moved: number; time: number } | null = null;
  let spin = 0;
  let suppressClick = false;
  let turnedSinceMeasure = false;
  const turnBy = (radians: number) => {
    garden.rotation.y += radians;
    turnedSinceMeasure = true;
  };
  let petalClock = 0;
  const head = new Vector3();
  const walkers: { object: Object3D; depth: number }[] = [];
  /** How close a garden position is to the camera on the turned island (bigger is nearer). */
  const depthOf = (x: number, y: number) => {
    const yaw = garden.rotation.y;
    return -(x - ISLAND_ORIGIN.x) * Math.sin(yaw) + (y - ISLAND_ORIGIN.y) * Math.cos(yaw);
  };

  /** Scene coordinates (the 640×432 box) of a world point, for the speech bubble. */
  const toScene = (point: Vector3): Point => {
    const ndc = point.clone().project(camera);
    return { x: ((ndc.x + 1) / 2) * SCENE_WIDTH, y: ((1 - ndc.y) / 2) * SCENE_HEIGHT };
  };
  const speak = (events: PipoEvent[]) => {
    if (!events.includes("speak")) return;
    pipo.getWorldPosition(head);
    head.y += 54;
    options.onPipoSpeak(toScene(head));
  };
  const greetPipo = () => {
    const result = clickPipo(pipoState);
    pipoState = result.state;
    speak(result.events);
    if (options.reducedMotion) return;
    // A few feathers flutter down from the flapping wings
    for (let index = 0; index < 4; index += 1) {
      petFx.add(shapes.leaf(2.2, index % 2 === 0 ? 0xfce68a : 0xfff6cf), {
        x: pipo.position.x + (random() - 0.5) * 16,
        y: pipo.position.y + 20 + random() * 8,
        z: pipo.position.z + (random() - 0.5) * 10,
        vx: (random() - 0.5) * 30,
        vy: 10 + random() * 20,
        gravity: 30,
        drag: 0.4,
        spin: (random() - 0.5) * 8,
        life: 1.4,
        fadeAt: 0.5,
      });
    }
  };
  const triggerPetSkill = (petId: PetId) => {
    const view = pets.find((candidate) => candidate.id === petId);
    if (view?.triggerSkill(petWorld)) options.onPetSkill?.(petId);
  };

  /** Path point and direction at a distance, on the ground. */
  const placeAt = (distance: number) => {
    const at = pointAt(distance);
    const before = pointAt(distance - 2);
    const after = pointAt(distance + 2);
    const dx = after.x - before.x;
    const dz = after.y - before.y;
    const length = Math.hypot(dx, dz) || 1;
    const world = toWorld(at.x, at.y, GROUND_H);
    return {
      x: world.x,
      z: world.z,
      h: GROUND_H,
      tangentX: dx / length,
      tangentZ: dz / length,
      at,
    };
  };

  const update = (dt: number) => {
    elapsed += dt;
    if (moving) garden.position.y = Math.sin(elapsed * BOB_SPEED) * BOB_HEIGHT;
    // The island keeps spinning a little after a flick, slowing to a stop
    if (!drag && Math.abs(spin) > 0.01) {
      turnBy(spin * dt);
      spin *= SPIN_KEEP ** dt;
    } else if (!drag) {
      spin = 0;
    }
    if (turnedSinceMeasure) {
      turnedSinceMeasure = false;
      scene.updateMatrixWorld();
      measureTrees();
    }

    // Pipo
    const step = stepPipo(pipoState, dt, context, random);
    pipoState = step.state;
    speak(step.events);
    const place = placeAt(pipoState.distance);
    pipo.position.set(place.x, place.h, place.z);
    {
      // Like the clay pets: face where it walks (partly toward us), face us when it stops
      const toCamera = -garden.rotation.y;
      const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
      const heading = Math.atan2(
        place.tangentX * pipoState.direction,
        place.tangentZ * pipoState.direction,
      );
      const target =
        pipoState.mode === "walking" && moving
          ? toCamera + wrap(heading - toCamera) * WALK_TURN
          : toCamera;
      pipoYaw += wrap(target - pipoYaw) * Math.min(1, dt * TURN_SPEED);
      pipoTurn.rotation.y = pipoYaw;
    }
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
      torso.position.y = moving ? air * PIPO_GREET_JUMP : 0;
      torso.scale.set(
        (1 + crouch) * FIGURE_SCALE,
        (1 - crouch) * FIGURE_SCALE,
        (1 + crouch) * FIGURE_SCALE,
      );
      // A happy spin in the air instead of the 2D wing flaps
      pipoTurn.rotation.y += moving ? Math.min(1, progress * 1.25) * Math.PI * 2 : 0;
    } else {
      torso.position.y = lift * SCENE.pipoHopHeight;
      const sit = sitting ? 0.06 : 0;
      const wide = (1 + squash + sit + breath) * FIGURE_SCALE;
      torso.scale.set(wide, (1 - squash - sit - breath + lift * 0.06) * FIGURE_SCALE, wide);
    }
    const shadowSize = 30 * (1 - lift * 0.35);
    pipoShadow.scale.set(shadowSize, 1, shadowSize * 0.8);
    pipoShadow.material.opacity = 1 - lift * 0.4;

    // Pets wander, rest and use their skills; each species draws its own effect
    for (const view of pets) {
      const events = view.behaviour.update(dt, petWorld);
      if (events.includes("skill")) options.onPetSkill?.(view.id);
      view.render(dt, petWorld, placeAt(view.behaviour.distance), camera, garden.rotation.y);
    }
    // A tree standing in front of Pipo or a pet fades so they stay visible behind it
    walkers.length = 0;
    walkers.push({ object: pipo, depth: depthOf(place.at.x, place.at.y) });
    for (const view of pets) {
      const at = pointAt(view.behaviour.distance);
      walkers.push({ object: view.root, depth: depthOf(at.x, at.y) });
    }
    for (const tree of trees) {
      const { left, bottom, right, top } = tree.rect;
      const depth = depthOf(tree.x, tree.y);
      const covers = walkers.some((walker) => {
        if (depth <= walker.depth) return false;
        walker.object.getWorldPosition(head);
        head.y += 18;
        head.project(camera);
        return head.x > left && head.x < right && head.y > bottom && head.y < top;
      });
      if (covers === tree.faded) continue;
      tree.faded = covers;
      for (const material of tree.materials) {
        material.transparent = covers;
        material.opacity = covers ? OCCLUDING_ALPHA : 1;
        material.depthWrite = !covers;
        material.needsUpdate = true;
      }
    }

    petFx.update(dt);

    for (const card of cards) card.face(camera);

    // Koi swim slow ellipses around the pond
    koi.forEach((fish, index) => {
      if (!model.koi) return;
      const { center, orbit } = model.koi;
      const angle = (moving ? elapsed * 0.5 : 0) + index * Math.PI;
      const at = toWorld(
        center.x + Math.cos(angle) * orbit.x,
        center.y + Math.sin(angle) * orbit.y,
        center.h + 0.6,
      );
      fish.position.copy(at);
      fish.rotation.y = -(angle + Math.PI / 2);
    });

    if (!moving) return;

    // Petals fall from blooming sakura canopies
    petalClock += dt;
    if (
      petalMaterial &&
      model.petalSources.length > 0 &&
      petalClock > 0.5 &&
      petals.length < SCENE.maxPetals
    ) {
      petalClock = 0;
      const source = model.petalSources[Math.floor(random() * model.petalSources.length)];
      if (source) {
        const sprite = new Sprite(petalMaterial.clone());
        sprite.scale.setScalar(7);
        sprite.position.copy(
          toWorld(
            source.x + (random() - 0.5) * 50,
            source.y + (random() - 0.5) * 30,
            source.h + 50 + random() * 30,
          ),
        );
        garden.add(sprite);
        petals.push({ sprite, vx: 4 + random() * 6, vy: 10 + random() * 8, age: 0 });
      }
    }
    for (let index = petals.length - 1; index >= 0; index -= 1) {
      const petal = petals[index];
      if (!petal) continue;
      petal.age += dt;
      petal.sprite.position.x += (petal.vx + Math.sin(petal.age * 3) * 8) * dt;
      petal.sprite.position.y -= petal.vy * dt;
      petal.sprite.material.rotation += dt;
      if (petal.sprite.position.y < GROUND_H + 1) {
        petal.sprite.position.y = GROUND_H + 1;
        petal.sprite.material.opacity -= dt;
      }
      if (petal.sprite.material.opacity <= 0) {
        garden.remove(petal.sprite);
        petal.sprite.material.dispose();
        petals.splice(index, 1);
      }
    }
  };

  // --- Tapping ------------------------------------------------------------------------------
  const raycaster = new Raycaster();
  raycaster.layers = new Layers();
  raycaster.layers.set(PICK_LAYER);
  const pointer = new Vector2();
  const pickables: Object3D[] = [
    torso,
    ...pets.map((view) => view.root),
    ...trees.map((tree) => tree.holder),
  ];
  type Picked = { kind: "tree"; id: string } | { kind: "pet"; id: PetId } | { kind: "pipo" } | null;
  const pick = (event: PointerEvent | MouseEvent): Picked => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    for (const hit of raycaster.intersectObjects(pickables, true)) {
      for (let node: Object3D | null = hit.object; node; node = node.parent) {
        const { treeId, petId, pipo: isPipo } = node.userData;
        if (isPipo === true) return { kind: "pipo" };
        if (typeof treeId === "string") return { kind: "tree", id: treeId };
        const view =
          typeof petId === "string" ? pets.find((candidate) => candidate.id === petId) : undefined;
        if (view) return { kind: "pet", id: view.id };
      }
    }
    return null;
  };
  const onDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, moved: 0, time: performance.now() };
    spin = 0;
  };
  const onDragMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    drag.x = event.clientX;
    drag.moved += Math.abs(dx);
    if (drag.moved < DRAG_SLOP) return;
    if (!canvas.hasPointerCapture(event.pointerId)) {
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    }
    const now = performance.now();
    const seconds = Math.max((now - drag.time) / 1000, 0.001);
    drag.time = now;
    turnBy(dx * DRAG_TURN);
    // Remember how fast it was turning, for the spin after letting go
    spin = options.reducedMotion ? 0 : (dx * DRAG_TURN) / seconds;
  };
  const onUp = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    suppressClick = drag.moved >= DRAG_SLOP;
    if (performance.now() - drag.time > 80) spin = 0;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = "grab";
    drag = null;
  };
  const onClick = (event: MouseEvent) => {
    // The end of a drag is not a tap on whatever is under the pointer
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const picked = pick(event);
    if (picked?.kind === "tree") options.onTreeSelect(picked.id);
    else if (picked?.kind === "pipo") greetPipo();
    else if (picked?.kind === "pet") triggerPetSkill(picked.id);
  };
  let hoverQueued = false;
  const onMove = (event: PointerEvent) => {
    if (hoverQueued || drag || event.pointerType !== "mouse") return;
    hoverQueued = true;
    requestAnimationFrame(() => {
      hoverQueued = false;
      canvas.style.cursor = pick(event) ? "pointer" : "grab";
    });
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onDragMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  canvas.addEventListener("click", onClick);
  canvas.addEventListener("pointermove", onMove);

  // --- Loop ----------------------------------------------------------------------------------
  const clock = new Clock();
  let frame = 0;
  const loop = () => {
    update(Math.min(clock.getDelta(), 0.1));
    renderer.render(scene, camera);
    frame = requestAnimationFrame(loop);
  };
  update(0);
  loop();

  // Nothing animates in a hidden tab
  const onVisibility = () => {
    cancelAnimationFrame(frame);
    if (!document.hidden) {
      clock.getDelta();
      loop();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  const highlightSlot = (slot: number | null) => {
    highlight.visible = slot !== null;
    if (slot === null) return;
    const point = decorPoint(slot);
    highlight.position.copy(toWorld(point.x, point.y, point.h + 0.8));
  };

  return {
    greetPipo,
    usePetSkill: triggerPetSkill,
    highlightSlot,
    destroy: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onDragMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("pointermove", onMove);
      petFx.dispose();
      const textures = new Set<Texture>([...pictureById.values(), shadows]);
      scene.traverse((node) => {
        if (node instanceof Mesh || node instanceof Sprite) {
          node.geometry.dispose();
          const materials: Material[] = Array.isArray(node.material)
            ? node.material
            : [node.material];
          for (const material of materials) {
            for (const value of Object.values(material))
              if (value && typeof value === "object" && "isTexture" in value) textures.add(value);
            material.dispose();
          }
        }
      });
      for (const texture of textures) texture.dispose();
      petalMaterial?.dispose();
      shapes.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
