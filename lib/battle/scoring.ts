import { GAME } from "@/lib/game/config";
import type { Verdict } from "@/lib/schemas/translation";

const BASE_POINTS: Record<Verdict, number> = { ...GAME.translation.points, incorrect: 0 };

/** Seconds within which a correct answer earns the full speed bonus. */
export const FAST_ANSWER_SECONDS = GAME.battle.fastAnswerSeconds;
export const MAX_SPEED_BONUS = GAME.battle.maxSpeedBonus;

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

export interface BattleDecision {
  /** Winner's user id, or null for a draw. */
  winnerId: string | null;
}

/**
 * Higher score wins; equal scores are a draw. Speed already earns points, so finishing first
 * must not break a tie a second time (audit §11). Null until both players are done.
 */
export function decideWinner(players: readonly BattleStanding[]): BattleDecision | null {
  if (players.length !== 2 || players.some((player) => player.finishedAt === null)) return null;
  const [a, b] = players;
  if (!a || !b) return null;
  if (a.score === b.score) return { winnerId: null };
  return { winnerId: a.score > b.score ? a.userId : b.userId };
}

/**
 * Result against a recorded run (ghost mode). The ghost's final score is known in advance; a
 * loss records the ghost's author as winner so history reads "lost" like a live battle.
 */
export function decideAgainstGhost(
  me: { userId: string; score: number },
  ghost: { userId: string; score: number },
): BattleDecision {
  if (me.score === ghost.score) return { winnerId: null };
  return { winnerId: me.score > ghost.score ? me.userId : ghost.userId };
}

/**
 * Where a recorded run stands after `elapsedSeconds`: answers it had given by then, in order.
 * `offsets` are seconds from the recorded battle's start to each answer.
 */
export function ghostProgress(
  answers: ReadonlyArray<{ offsetSeconds: number; points: number }>,
  elapsedSeconds: number,
): { answered: number; score: number } {
  const given = answers.filter((answer) => answer.offsetSeconds <= elapsedSeconds);
  return { answered: given.length, score: given.reduce((sum, answer) => sum + answer.points, 0) };
}
