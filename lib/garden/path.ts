import { COLS, project, type Point } from "./layout";

/** Path row (row 2 of the layout), crossing the map diagonally down-right. */
const PATH_ROW = 2.5;

/**
 * Waypoints: both ends of the path (just outside the map, where the path tiles continue)
 * plus the centre of each path tile, so stop k + 1 sits in column k.
 */
export const PATH_WAYPOINTS: Point[] = [
  -0.6,
  ...Array.from({ length: COLS }, (_, column) => column + 0.5),
  COLS + 0.6,
].map((gridX) => project(gridX, PATH_ROW));

const SAMPLES_PER_SEGMENT = 24;

function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  const axis = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: axis(p0.x, p1.x, p2.x, p3.x), y: axis(p0.y, p1.y, p2.y, p3.y) };
}

/** Dense polyline along a Catmull-Rom curve through every waypoint, with arc lengths. */
const samples: { point: Point; distance: number }[] = [];
const distancesAtWaypoints: number[] = [0];
{
  let distance = 0;
  let previous: Point | null = null;
  for (let index = 0; index < PATH_WAYPOINTS.length - 1; index += 1) {
    const p1 = PATH_WAYPOINTS[index];
    const p2 = PATH_WAYPOINTS[index + 1];
    if (!p1 || !p2) continue;
    const p0 = PATH_WAYPOINTS[index - 1] ?? p1;
    const p3 = PATH_WAYPOINTS[index + 2] ?? p2;
    for (let step = index === 0 ? 0 : 1; step <= SAMPLES_PER_SEGMENT; step += 1) {
      const point = catmullRom(p0, p1, p2, p3, step / SAMPLES_PER_SEGMENT);
      if (previous) distance += Math.hypot(point.x - previous.x, point.y - previous.y);
      samples.push({ point, distance });
      previous = point;
    }
    distancesAtWaypoints.push(distance);
  }
}

/** Arc length along the path at each waypoint. */
export const waypointDistances: readonly number[] = distancesAtWaypoints;

export function pathLength(): number {
  return samples.at(-1)?.distance ?? 0;
}

/** Point at a distance along the path (clamped to both ends). */
export function pointAt(distance: number): Point {
  const first = samples[0];
  const last = samples.at(-1);
  if (!first || !last) return { x: 0, y: 0 };
  if (distance <= 0) return first.point;
  if (distance >= last.distance) return last.point;
  let low = 0;
  let high = samples.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if ((samples[middle]?.distance ?? 0) < distance) low = middle;
    else high = middle;
  }
  const a = samples[low];
  const b = samples[high];
  if (!a || !b) return last.point;
  const span = b.distance - a.distance || 1;
  const t = (distance - a.distance) / span;
  return { x: a.point.x + (b.point.x - a.point.x) * t, y: a.point.y + (b.point.y - a.point.y) * t };
}
