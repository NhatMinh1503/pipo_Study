import { GAME } from "@/lib/game/config";
import type { Verdict } from "@/lib/schemas/translation";

export interface SentenceAttempts {
  /** Verdicts in the order they were given, e.g. ["incorrect", "acceptable"]. */
  verdicts: readonly Verdict[];
}

export interface SentenceScore {
  points: number;
  attempts: number;
  finalVerdict: Verdict | null;
}

export interface LessonScore {
  sentences: SentenceScore[];
  /** Sum of sentence points. */
  points: number;
  maxPoints: number;
  /** 0–100, rounded. */
  percent: number;
  perfect: boolean;
}

export interface LessonRewardsInput {
  sentenceCount: number;
  /** Sum of sentence points (before any daily cap). */
  points: number;
  perfect: boolean;
}

export interface LessonRewards {
  bonusXp: number;
  coins: number;
}

export const POINTS = GAME.translation.points;
const RETRY_PENALTY = GAME.translation.retryPenalty;
const MIN_POINTS = GAME.translation.minPoints;
const PERFECT_BONUS_COINS = GAME.translation.perfectBonusCoins;

/**
 * Points for one sentence: 10 for exact, 7 for acceptable, minus 2 for every failed
 * attempt before it (never below 2). A sentence never passed scores 0.
 */
export function scoreSentence({ verdicts }: SentenceAttempts): SentenceScore {
  const passIndex = verdicts.findIndex((verdict) => verdict !== "incorrect");
  if (passIndex === -1) {
    return { points: 0, attempts: verdicts.length, finalVerdict: verdicts.at(-1) ?? null };
  }

  const verdict = verdicts[passIndex] === "exact" ? "exact" : "acceptable";
  const points = Math.max(MIN_POINTS, POINTS[verdict] - passIndex * RETRY_PENALTY);
  return { points, attempts: passIndex + 1, finalVerdict: verdict };
}

/** Lesson total: points, percent and whether every sentence was exact on the first try. */
export function scoreLesson(sentences: readonly SentenceAttempts[]): LessonScore {
  const scored = sentences.map(scoreSentence);
  const points = scored.reduce((sum, sentence) => sum + sentence.points, 0);
  const maxPoints = sentences.length * POINTS.exact;
  const perfect =
    scored.length > 0 &&
    scored.every((sentence) => sentence.finalVerdict === "exact" && sentence.attempts === 1);

  return {
    sentences: scored,
    points,
    maxPoints,
    percent: maxPoints === 0 ? 0 : Math.round((points / maxPoints) * 100),
    perfect,
  };
}

/**
 * Completion rewards before any daily cap (xp-levels §4.2): lessons of at least
 * MIN_LESSON_SENTENCES earn the bonus XP and one coin per 10 points (+ a perfect bonus).
 * Sentence XP is paid separately, as each sentence is unlocked.
 */
export function lessonRewards({
  sentenceCount,
  points,
  perfect,
}: LessonRewardsInput): LessonRewards {
  if (sentenceCount < GAME.translation.minLessonSentences) return { bonusXp: 0, coins: 0 };
  return {
    bonusXp: GAME.translation.lessonBonusXp,
    coins: Math.floor(points / 10) + (perfect ? PERFECT_BONUS_COINS : 0),
  };
}
