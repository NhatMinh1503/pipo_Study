import { SCENE } from "./config";

export type PipoMode = "walking" | "looking" | "sitting" | "reacting" | "idle";

export interface PipoState {
  mode: PipoMode;
  /** Distance along the path. */
  distance: number;
  direction: 1 | -1;
  /** Seconds left in the current timed mode (looking, sitting, reacting). */
  timer: number;
  /** Index of the stop handled last, so a stop is not reconsidered right away. */
  lastStop: number;
  resumeMode: PipoMode | null;
  resumeTimer: number;
  blinkIn: number;
  /** Seconds left with the eyes closed. */
  blinking: number;
}

export interface PipoStop {
  distance: number;
  /** Next to a mature tree, or at a placed bench. */
  kind: "view" | "bench";
}

export interface PipoContext {
  pathLength: number;
  stops: readonly PipoStop[];
  reducedMotion: boolean;
}

export type PipoEvent = "speak";

export function initialPipo(): PipoState {
  return {
    mode: "walking",
    distance: 0,
    direction: 1,
    timer: 0,
    lastStop: -1,
    resumeMode: null,
    resumeTimer: 0,
    blinkIn: 3,
    blinking: 0,
  };
}

const between = (min: number, max: number, roll: number) => min + (max - min) * roll;

function blink(state: PipoState, dt: number, random: () => number): PipoState {
  if (state.blinking > 0) return { ...state, blinking: Math.max(0, state.blinking - dt) };
  const blinkIn = state.blinkIn - dt;
  if (blinkIn > 0) return { ...state, blinkIn };
  return {
    ...state,
    blinking: SCENE.blinkDuration,
    blinkIn: between(SCENE.blinkSeconds.min, SCENE.blinkSeconds.max, random()),
  };
}

function walk(
  state: PipoState,
  dt: number,
  context: PipoContext,
  random: () => number,
): { state: PipoState; events: PipoEvent[] } {
  const previous = state.distance;
  let direction = state.direction;
  let distance = previous + SCENE.pipoSpeed * dt * direction;
  if (distance >= context.pathLength) {
    distance = context.pathLength - (distance - context.pathLength);
    direction = -1;
  } else if (distance <= 0) {
    distance = -distance;
    direction = 1;
  }
  const low = Math.min(previous, distance);
  const high = Math.max(previous, distance);

  for (const [index, stop] of context.stops.entries()) {
    if (index === state.lastStop || stop.distance < low || stop.distance > high) continue;
    const view = stop.kind === "view";
    if (random() >= (view ? SCENE.lookChance : SCENE.sitChance)) {
      return {
        state: { ...state, mode: "walking", distance, direction, lastStop: index },
        events: [],
      };
    }
    const range = view ? SCENE.lookSeconds : SCENE.sitSeconds;
    const timer = between(range.min, range.max, random());
    const events: PipoEvent[] = random() < SCENE.speakChance ? ["speak"] : [];
    return {
      state: {
        ...state,
        mode: view ? "looking" : "sitting",
        distance: stop.distance,
        direction,
        timer,
        lastStop: index,
      },
      events,
    };
  }
  return { state: { ...state, mode: "walking", distance, direction }, events: [] };
}

/**
 * Advances Pipo by dt seconds (garden-scene spec §3.6). Pure: randomness comes from
 * `random`, so the scene and the tests drive it the same way.
 */
export function stepPipo(
  state: PipoState,
  dt: number,
  context: PipoContext,
  random: () => number,
): { state: PipoState; events: PipoEvent[] } {
  if (context.reducedMotion) {
    return { state: blink({ ...state, mode: "idle" }, dt, random), events: [] };
  }

  let next: { state: PipoState; events: PipoEvent[] };
  switch (state.mode) {
    case "reacting": {
      const timer = state.timer - dt;
      next = {
        state:
          timer > 0
            ? { ...state, timer }
            : {
                ...state,
                mode: state.resumeMode ?? "walking",
                timer: state.resumeTimer,
                resumeMode: null,
              },
        events: [],
      };
      break;
    }
    case "looking":
    case "sitting": {
      const timer = state.timer - dt;
      next = {
        state: timer > 0 ? { ...state, timer } : { ...state, mode: "walking", timer: 0 },
        events: [],
      };
      break;
    }
    default:
      next = walk(state, dt, context, random);
  }
  return { state: blink(next.state, dt, random), events: next.events };
}

/** Pipo was clicked: a short hop and wing flap, a line, then back to what it was doing. */
export function clickPipo(state: PipoState): { state: PipoState; events: PipoEvent[] } {
  const reacting = state.mode === "reacting";
  return {
    state: {
      ...state,
      mode: "reacting",
      timer: SCENE.reactSeconds,
      resumeMode: reacting ? state.resumeMode : state.mode,
      resumeTimer: reacting ? state.resumeTimer : state.timer,
    },
    events: ["speak"],
  };
}
