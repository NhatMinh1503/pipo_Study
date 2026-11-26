import { describe, expect, it } from "vitest";

import { GAME } from "@/lib/game/config";

import {
  DECOR_SLOTS,
  GROUND_H,
  PATH_POINTS,
  PLOTS,
  POND,
  ISLAND_SIZE,
  decorPoint,
  distanceToPolyline,
  plotPoint,
} from "./layout";

// garden-scene spec §3.4 (test case #2), measured on the 3D island
describe("island layout", () => {
  it("has one plot per garden plot and one spot per decoration slot", () => {
    expect(PLOTS).toHaveLength(GAME.garden.plotsPerGarden);
    expect(PLOTS).toHaveLength(26);
    expect(DECOR_SLOTS).toHaveLength(GAME.garden.decorSlots);
  });

  it("keeps everything on the island", () => {
    for (const point of [...PLOTS, ...DECOR_SLOTS, ...PATH_POINTS, POND]) {
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(ISLAND_SIZE.x);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(ISLAND_SIZE.y);
    }
  });

  it("numbers plots in reading order, back row first", () => {
    expect(plotPoint(0).y).toBeLessThan(plotPoint(7).y);
    expect(plotPoint(0).x).toBeLessThan(plotPoint(1).x);
    expect(plotPoint(25).y).toBeGreaterThan(plotPoint(12).y);
  });

  it("raises the soil of the plots a little above the grass", () => {
    for (const plot of PLOTS) expect(plot.h).toBeGreaterThan(GROUND_H);
  });

  it("keeps plots apart from each other and decorations off the plots and the path", () => {
    PLOTS.forEach((a, i) =>
      PLOTS.slice(i + 1).forEach((b) =>
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(40),
      ),
    );
    for (const slot of DECOR_SLOTS) {
      expect(distanceToPolyline(slot, PATH_POINTS)).toBeGreaterThan(20);
      for (const plot of PLOTS)
        expect(Math.hypot(slot.x - plot.x, slot.y - plot.y)).toBeGreaterThan(30);
    }
  });

  it("runs the path from the left edge of the island to the right edge", () => {
    expect(PATH_POINTS[0]?.x).toBeLessThan(60);
    expect(PATH_POINTS.at(-1)?.x).toBeGreaterThan(580);
  });

  it("rejects plots and slots that do not exist", () => {
    expect(() => plotPoint(26)).toThrow();
    expect(() => plotPoint(-1)).toThrow();
    expect(() => decorPoint(5)).toThrow();
  });

  it("measures the distance to a polyline", () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(distanceToPolyline({ x: 5, y: 3 }, line)).toBeCloseTo(3);
    expect(distanceToPolyline({ x: 14, y: 3 }, line)).toBeCloseTo(5);
  });
});
