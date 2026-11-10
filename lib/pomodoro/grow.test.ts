import { describe, expect, it } from "vitest";

import { growthFrame } from "./grow";

describe("growthFrame", () => {
  it("pops a sprout out of the soil at the start of the session", () => {
    expect(growthFrame(0)).toEqual({ stage: "sprout", opacity: 0, scale: 0.7 });
    expect(growthFrame(0.04).opacity).toBe(1);
  });

  it("goes through all three stages in one session", () => {
    expect(growthFrame(0.2).stage).toBe("sprout");
    expect(growthFrame(0.34).stage).toBe("sapling");
    expect(growthFrame(0.5).stage).toBe("sapling");
    expect(growthFrame(0.7).stage).toBe("mature");
    expect(growthFrame(1)).toEqual({ stage: "mature", opacity: 1, scale: 1 });
  });

  it("keeps growing within a stage, and never blends two pictures", () => {
    expect(growthFrame(0.4).scale).toBeLessThan(growthFrame(0.6).scale);
    for (const p of [0.1, 0.3, 0.35, 0.6, 0.67, 0.9]) expect(growthFrame(p).opacity).toBe(1);
  });

  it("clamps progress it cannot use", () => {
    expect(growthFrame(-1).scale).toBe(0.7);
    expect(growthFrame(2)).toEqual({ stage: "mature", opacity: 1, scale: 1 });
  });
});
