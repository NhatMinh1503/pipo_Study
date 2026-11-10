import { describe, expect, it } from "vitest";

import { PATH_ROUTE, project } from "./layout";
import { PATH_WAYPOINTS, pathLength, pointAt, waypointDistances } from "./path";

// garden-scene spec §3.4 (test case #3)
describe("garden path", () => {
  it("winds through every path tile, from past one edge of the map to past the other", () => {
    expect(PATH_WAYPOINTS[0]).toEqual(project(0.5 - 1.1, 4.5));
    expect(PATH_WAYPOINTS.at(-1)).toEqual(project(8.5 + 1.1, 1.5));
    expect(PATH_WAYPOINTS).toHaveLength(PATH_ROUTE.length + 2);
    PATH_ROUTE.forEach((tile, index) => {
      expect(PATH_WAYPOINTS[index + 1]).toEqual(project(tile.x + 0.5, tile.y + 0.5));
    });
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
