import { Box3, PerspectiveCamera, Vector3 } from "three";

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
const CAMERA_ELEVATION = (36 * Math.PI) / 180;
/**
 * The island starts turned a little, so it is seen corner-on like a diorama. The learner can
 * drag to turn it around its vertical axis; the camera's height and tilt never change.
 */
export const DEFAULT_YAW = (-40 * Math.PI) / 180;
/** Island turns sampled when framing, so it fits the view at any turn. */
const FRAME_TURNS = 24;
/** Share of the view the island may fill (NDC units, 1 = the edge). */
const FRAME_MARGIN = 0.98;
/** How much of the rock under the island stays in view, px below the grass. */
const ROCK_IN_VIEW = 110;
/** Room above the ground for the tallest trees, px. */
const TREE_ROOM = 100;

const UP = new Vector3(0, 1, 0);

/** Logical garden position (x across, y back to front, h height) to a position on the island. */
export function toWorld(x: number, y: number, h: number): Vector3 {
  return new Vector3(x - ISLAND_ORIGIN.x, h, y - ISLAND_ORIGIN.y);
}

/** A position on the island after the island is turned by `yaw` (radians). */
export function turned(point: Vector3, yaw: number): Vector3 {
  return point.clone().applyAxisAngle(UP, yaw);
}

function frameBox(): Box3 {
  const { min, max } = ISLAND_BOUNDS;
  return new Box3(
    new Vector3(min.x, Math.max(min.y, GROUND_H - ROCK_IN_VIEW), min.z),
    new Vector3(max.x, Math.max(max.y, GROUND_H + TREE_ROOM), max.z),
  );
}

/** Moves the camera back until every corner of the island (with its trees) fits in view. */
export function fitGardenCamera(camera: PerspectiveCamera): void {
  const box = frameBox();
  const target = box.getCenter(new Vector3());
  const back = new Vector3(0, Math.sin(CAMERA_ELEVATION), Math.cos(CAMERA_ELEVATION));
  // The island's corners at every turn the learner can drag it to
  const corners = Array.from(
    { length: FRAME_TURNS },
    (_, turn) => (turn / FRAME_TURNS) * Math.PI * 2,
  ).flatMap((yaw) =>
    [0, 1, 2, 3, 4, 5, 6, 7].map((index) =>
      turned(
        new Vector3(
          index & 1 ? box.max.x : box.min.x,
          index & 2 ? box.max.y : box.min.y,
          index & 4 ? box.max.z : box.min.z,
        ),
        yaw,
      ),
    ),
  );
  const fits = (distance: number) => {
    camera.position.copy(target).addScaledVector(back, distance);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    return corners.every((corner) => {
      const ndc = corner.clone().project(camera);
      return Math.abs(ndc.x) <= FRAME_MARGIN && Math.abs(ndc.y) <= FRAME_MARGIN;
    });
  };
  let near = 100;
  let far = 20000;
  for (let step = 0; step < 32; step += 1) {
    const middle = (near + far) / 2;
    if (fits(middle)) far = middle;
    else near = middle;
  }
  camera.near = far / 10;
  camera.far = far * 4;
  fits(far);
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
