import type { Verdict } from "@/lib/schemas/translation";

const BASE_POINTS: Record<Verdict, number> = { exact: 10, acceptable: 7, incorrect: 0 };

/** Seconds within which a correct answer earns the full speed bonus. */
export const FAST_ANSWER_SECONDS = 20;
export const MAX_SPEED_BONUS = 5;

/**
 * Points for one battle answer: accuracy first, plus a speed bonus that shrinks by one point
 * every FAST_ANSWER_SECONDS. Wrong answers get nothing, however fast.
 */
export function battlePoints(verdict: Verdict, secondsTaken: number): number {
  const base = BASE_POINTS[verdict];
  if (base === 0) return 0;
  const steps = Math.floor(Math.max(0, secondsTaken) / FAST_ANSWER_SECONDS);
  return base + Math.max(0, MAX_SPEED_BONUS - steps);
}

export interface BattleStanding {
  userId: string;
  score: number;
  finishedAt: string | null;
}

/** Higher score wins; on a tie the player who finished first wins. Null until both are done. */
export function decideWinner(players: readonly BattleStanding[]): string | null {
  if (players.length !== 2 || players.some((player) => player.finishedAt === null)) return null;
  const [a, b] = players;
  if (!a || !b) return null;
  if (a.score !== b.score) return a.score > b.score ? a.userId : b.userId;
  return Date.parse(a.finishedAt ?? "") <= Date.parse(b.finishedAt ?? "") ? a.userId : b.userId;
}
