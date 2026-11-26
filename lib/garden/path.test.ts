import { describe, expect, it } from "vitest";

import { PATH_POINTS } from "./layout";
import { PATH_WAYPOINTS, closestOnPath, pathLength, pointAt, waypointDistances } from "./path";

// garden-scene spec §3.4 (test case #3)
describe("garden path", () => {
  it("follows the island's sandy path", () => {
    expect(PATH_WAYPOINTS).toEqual(PATH_POINTS.map(({ x, y }) => ({ x, y })));
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

  it("finds the closest spot on the path", () => {
    const middle = pointAt(300);
    const onPath = closestOnPath(middle);
    expect(onPath.distance).toBeCloseTo(300, -1);
    expect(onPath.gap).toBeLessThan(2);
    expect(closestOnPath({ x: middle.x, y: middle.y - 200 }).gap).toBeGreaterThan(100);
  });
});
