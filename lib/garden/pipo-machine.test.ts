import { describe, expect, it } from "vitest";

import { clickPipo, initialPipo, stepPipo, type PipoContext } from "./pipo-machine";

const context: PipoContext = {
  pathLength: 200,
  stops: [
    { distance: 50, kind: "view" },
    { distance: 120, kind: "bench" },
  ],
  reducedMotion: false,
};

/** A random source that returns the given values in order, then repeats the last one. */
const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
};

// garden-scene spec §3.6 (test case #4)
describe("Pipo state machine", () => {
  it("walks along the path", () => {
    const { state } = stepPipo(initialPipo(), 1, context, sequence(0.99));
    expect(state.mode).toBe("walking");
    expect(state.distance).toBeCloseTo(28, 5);
  });

  it("turns around at the end of the path", () => {
    let state = { ...initialPipo(), distance: 195 };
    state = stepPipo(state, 1, context, sequence(0.99)).state;
    expect(state.direction).toBe(-1);
    expect(state.distance).toBeLessThanOrEqual(200);
  });

  it("stops to look at a tree when the dice say so, then walks on", () => {
    let state = { ...initialPipo(), distance: 40 };
    // 0.1 < 0.35: stop; 0.5 → look for 3 s; 0.9: no speech
    const step = stepPipo(state, 0.5, context, sequence(0.1, 0.5, 0.9));
    state = step.state;
    expect(state.mode).toBe("looking");
    expect(state.timer).toBeCloseTo(3, 5);
    state = stepPipo(state, 3.1, context, sequence(0.99)).state;
    expect(state.mode).toBe("walking");
  });

  it("walks past a stop when the dice say no, and does not reconsider it at once", () => {
    let state = { ...initialPipo(), distance: 40 };
    state = stepPipo(state, 0.5, context, sequence(0.9)).state;
    expect(state.mode).toBe("walking");
    expect(state.lastStop).toBe(0);
  });

  it("sits on the bench for 4–7 s", () => {
    const state = { ...initialPipo(), distance: 110 };
    const { state: next } = stepPipo(state, 0.5, context, sequence(0.2, 1, 0.9));
    expect(next.mode).toBe("sitting");
    expect(next.timer).toBeCloseTo(7, 5);
  });

  it("asks to speak when it stops and the dice say so", () => {
    const { events } = stepPipo(
      { ...initialPipo(), distance: 40 },
      0.5,
      context,
      sequence(0.1, 0.5, 0.2),
    );
    expect(events).toContain("speak");
  });

  it("reacts to a click for 1.2 s, speaks, then returns to what it was doing", () => {
    const sitting = { ...initialPipo(), mode: "sitting" as const, timer: 5 };
    const { state: reacting, events } = clickPipo(sitting);
    expect(reacting.mode).toBe("reacting");
    expect(events).toEqual(["speak"]);
    const { state: after } = stepPipo(reacting, 1.3, context, sequence(0.99));
    expect(after.mode).toBe("sitting");
    expect(after.timer).toBeCloseTo(5, 5);
  });

  it("stays still with reduced motion, but keeps blinking", () => {
    const still = { ...context, reducedMotion: true };
    let state = initialPipo();
    let blinked = false;
    for (let index = 0; index < 100; index += 1) {
      state = stepPipo(state, 0.1, still, sequence(0)).state;
      if (state.blinking > 0) blinked = true;
    }
    expect(state.distance).toBe(0);
    expect(state.mode).toBe("idle");
    expect(blinked).toBe(true);
  });
});
