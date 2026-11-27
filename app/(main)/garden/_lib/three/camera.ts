import { PerspectiveCamera, Vector3 } from "three";

import {
  GROUND_H,
  ISLAND_BOUNDS,
  ISLAND_ORIGIN,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  type Point,
} from "@/lib/garden/layout";

/**
 * Where the garden camera stands. Pure three.js maths with no WebGL, so the e2e tests use it
 * too, to find where a plot shows up on screen.
 */

/** Looking down at the island from the front at a low angle, like the concept art. */
const CAMERA_FOV = 18;
const CAMERA_ELEVATION = (37 * Math.PI) / 180;
/**
 * The island starts turned a little, so it is seen corner-on like a diorama. The learner can
 * drag to turn it around its vertical axis; the camera's height and tilt never change.
 */
export const DEFAULT_YAW = (-30 * Math.PI) / 180;
/** Island turns sampled when framing, so it fits the view at any turn. */
const FRAME_TURNS = 24;
/** Share of the view the island may fill (NDC units, 1 = the edge). */
const FRAME_MARGIN = 0.95;
/** How much of the rock under the island stays in view, px below the grass. */
const ROCK_IN_VIEW = 100;
/** Corner radius of the island's rounded outline, px. */
const ISLAND_CORNER = 80;
/** Room above the ground for the tallest trees, px. */
const TREE_ROOM = 145;

const UP = new Vector3(0, 1, 0);

/** Logical garden position (x across, y back to front, h height) to a position on the island. */
export function toWorld(x: number, y: number, h: number): Vector3 {
  return new Vector3(x - ISLAND_ORIGIN.x, h, y - ISLAND_ORIGIN.y);
}

/** A position on the island after the island is turned by `yaw` (radians). */
export function turned(point: Vector3, yaw: number): Vector3 {
  return point.clone().applyAxisAngle(UP, yaw);
}

/** Rounded-rectangle outline of the island seen from above, inset by `inset` px. */
function outline(h: number, inset: number): Vector3[] {
  const { min, max } = ISLAND_BOUNDS;
  const halfX = (max.x - min.x) / 2 - inset;
  const halfZ = (max.z - min.z) / 2 - inset;
  const centreX = (max.x + min.x) / 2;
  const centreZ = (max.z + min.z) / 2;
  const radius = Math.min(ISLAND_CORNER, halfX, halfZ);
  const points: Vector3[] = [];
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ] as const) {
    const cx = centreX + sx * (halfX - radius);
    const cz = centreZ + sz * (halfZ - radius);
    for (let step = 0; step <= 4; step += 1) {
      const angle = Math.atan2(sz, sx) - Math.PI / 4 + (step / 4) * (Math.PI / 2);
      points.push(new Vector3(cx + Math.cos(angle) * radius, h, cz + Math.sin(angle) * radius));
    }
  }
  return points;
}

/**
 * Puts the camera so the island fills the view at any turn: the grass rim, the tree tops
 * above it and the rock below it, centred on screen.
 */
export function fitGardenCamera(camera: PerspectiveCamera): void {
  const shape = [
    ...outline(GROUND_H, 0),
    ...outline(GROUND_H + TREE_ROOM, 40),
    ...outline(GROUND_H - ROCK_IN_VIEW, 120),
  ];
  const points = Array.from(
    { length: FRAME_TURNS },
    (_, turn) => (turn / FRAME_TURNS) * Math.PI * 2,
  ).flatMap((yaw) => shape.map((point) => turned(point, yaw)));
  const back = new Vector3(0, Math.sin(CAMERA_ELEVATION), Math.cos(CAMERA_ELEVATION));
  const target = new Vector3(0, GROUND_H, 0);
  const place = (distance: number) => {
    camera.position.copy(target).addScaledVector(back, distance);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
  };
  const extent = () => {
    let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
    for (const point of points) {
      const ndc = point.clone().project(camera);
      minX = Math.min(minX, ndc.x);
      maxX = Math.max(maxX, ndc.x);
      minY = Math.min(minY, ndc.y);
      maxY = Math.max(maxY, ndc.y);
    }
    return { minX, maxX, minY, maxY };
  };
  const fit = () => {
    let near = 100;
    let far = 20000;
    for (let step = 0; step < 32; step += 1) {
      const middle = (near + far) / 2;
      place(middle);
      const { minX, maxX, minY, maxY } = extent();
      const inside = Math.max(-minX, maxX) <= FRAME_MARGIN && Math.max(-minY, maxY) <= FRAME_MARGIN;
      if (inside) far = middle;
      else near = middle;
    }
    place(far);
    return far;
  };
  // Fit, then slide the aim up or down so the island sits in the middle, and fit again
  for (let round = 0; round < 3; round += 1) {
    const distance = fit();
    const { minY, maxY } = extent();
    const halfHeight = distance * Math.tan((camera.fov * Math.PI) / 360);
    const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    target.addScaledVector(up, ((minY + maxY) / 2) * halfHeight);
  }
  const distance = fit();
  camera.near = distance / 10;
  camera.far = distance * 4;
  camera.updateProjectionMatrix();
}

export function gardenCamera(aspect: number): PerspectiveCamera {
  const camera = new PerspectiveCamera(CAMERA_FOV, aspect, 10, 10000);
  fitGardenCamera(camera);
  return camera;
}

/** Where a garden position shows up, in the 640×432 scene box (for bubbles and tests). */
export function sceneSpot(
  camera: PerspectiveCamera,
  x: number,
  y: number,
  h: number,
  yaw = DEFAULT_YAW,
): Point {
  const ndc = turned(toWorld(x, y, h), yaw).project(camera);
  return { x: ((ndc.x + 1) / 2) * SCENE_WIDTH, y: ((1 - ndc.y) / 2) * SCENE_HEIGHT };
}
