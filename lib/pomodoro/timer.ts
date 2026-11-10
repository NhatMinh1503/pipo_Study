import { GAME } from "@/lib/game/config";

export const FOCUS_PRESETS = GAME.pomodoro.focusPresets;
export const DEFAULT_FOCUS_MINUTES = GAME.pomodoro.defaultFocusMinutes;
export const BREAK_MINUTES = GAME.pomodoro.breakMinutes;
const { focusMinMinutes, focusMaxMinutes, focusStepMinutes } = GAME.pomodoro;
export const FOCUS_RANGE = {
  min: focusMinMinutes,
  max: focusMaxMinutes,
  step: focusStepMinutes,
} as const;

/** True for a session length the learner may pick: within the range, on a step. */
export function isFocusMinutes(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= focusMinMinutes &&
    value <= focusMaxMinutes &&
    (value - focusMinMinutes) % focusStepMinutes === 0
  );
}

/** Snaps any number to the nearest allowed session length. */
export function clampFocusMinutes(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_FOCUS_MINUTES;
  const stepped =
    focusMinMinutes + Math.round((value - focusMinMinutes) / focusStepMinutes) * focusStepMinutes;
  return Math.min(focusMaxMinutes, Math.max(focusMinMinutes, stepped));
}

const MINUTE_MS = 60_000;

/** Milliseconds left until `startedAt + minutes`, never negative. */
export function remainingMs(startedAt: string | number, minutes: number, now: number): number {
  const end = new Date(startedAt).getTime() + minutes * MINUTE_MS;
  return Math.max(0, end - now);
}

/** Fraction of the period already elapsed, 0–1. */
export function progress(startedAt: string | number, minutes: number, now: number): number {
  const total = minutes * MINUTE_MS;
  return total === 0 ? 1 : 1 - remainingMs(startedAt, minutes, now) / total;
}

/** "mm:ss", rounding up so the clock shows 00:01 until the very end. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
