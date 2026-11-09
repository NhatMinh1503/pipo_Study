import { describe, expect, it } from "vitest";

import { COLS, project } from "./layout";
import { PATH_WAYPOINTS, pathLength, pointAt, waypointDistances } from "./path";

// garden-scene spec §3.4 (test case #3)
describe("garden path", () => {
  it("runs diagonally along the path row, from past one end of the map to past the other", () => {
    const first = PATH_WAYPOINTS[0];
    const last = PATH_WAYPOINTS.at(-1);
    expect(first).toEqual(project(-0.6, 2.5));
    expect(last).toEqual(project(COLS + 0.6, 2.5));
    // Every waypoint sits on the same isometric row: x − 2y is constant along +x
    const rowKey = (point: { x: number; y: number }) => point.x - 2 * point.y;
    for (const point of PATH_WAYPOINTS) expect(rowKey(point)).toBeCloseTo(rowKey(project(0, 2.5)));
  });

  it("passes through every waypoint", () => {
    PATH_WAYPOINTS.forEach((waypoint, index) => {
      const point = pointAt(waypointDistances[index] ?? 0);
      expect(point.x).toBeCloseTo(waypoint.x, 0);
      expect(point.y).toBeCloseTo(waypoint.y, 0);
    });
  });

  it("is continuous: small steps never jump", () => {
    const total = pathLength();
    let previous = pointAt(0);
    for (let distance = 1; distance <= total; distance += 1) {
      const point = pointAt(distance);
      expect(Math.hypot(point.x - previous.x, point.y - previous.y)).toBeLessThan(3);
      previous = point;
    }
  });

  it("clamps outside the path", () => {
    expect(pointAt(-50)).toEqual(pointAt(0));
    expect(pointAt(pathLength() + 50)).toEqual(pointAt(pathLength()));
  });
});
