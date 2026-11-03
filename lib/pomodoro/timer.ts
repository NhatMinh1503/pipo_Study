export const FOCUS_OPTIONS = [25, 50] as const;
export type FocusMinutes = (typeof FOCUS_OPTIONS)[number];
export const BREAK_MINUTES = 5;

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
