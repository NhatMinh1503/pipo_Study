import { z } from "zod";

export const RATINGS = ["again", "hard", "good", "easy"] as const;
export const ratingSchema = z.enum(RATINGS);
export type Rating = z.infer<typeof ratingSchema>;

/** Review ladder from the PRD: a new card climbs 1 → 3 → 7 → 14 → 30 days. */
export const LADDER_DAYS = [1, 3, 7, 14, 30] as const;
const LAST_STEP = LADDER_DAYS.length - 1;
const LADDER_TOP_DAYS = 30;

export const MIN_EASE = 1.3;
export const MAX_EASE = 5;
export const MAX_INTERVAL_DAYS = 365;
/** A forgotten card comes back in the same session. */
export const RELEARN_MINUTES = 10;

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export interface CardState {
  intervalDays: number;
  ease: number;
  repetitions: number;
  lapses: number;
}

export interface ScheduledCard extends CardState {
  dueDate: Date;
}

const clampEase = (ease: number) =>
  Math.min(MAX_EASE, Math.max(MIN_EASE, Math.round(ease * 100) / 100));

/** Index of the ladder step the card is on (-1 for a new or relearning card). */
function ladderStep(intervalDays: number): number {
  let step = -1;
  LADDER_DAYS.forEach((days, index) => {
    if (intervalDays >= days) step = index;
  });
  return step;
}

function nextInterval(card: CardState, rating: Exclude<Rating, "again">): number {
  const step = ladderStep(card.intervalDays);

  // Mature cards (at the top of the ladder) grow by their ease factor
  if (card.intervalDays >= LADDER_TOP_DAYS) {
    const factor = rating === "hard" ? 1.2 : rating === "good" ? card.ease : card.ease * 1.3;
    return Math.max(card.intervalDays + 1, Math.round(card.intervalDays * factor));
  }

  const target = rating === "hard" ? Math.max(step, 0) : rating === "good" ? step + 1 : step + 2;
  return LADDER_DAYS[Math.min(target, LAST_STEP)] ?? LADDER_TOP_DAYS;
}

/**
 * Next schedule for a card after the learner rates it.
 * - again: back to the start, due again in 10 minutes, ease -0.2
 * - hard: stay on the current step, ease -0.15
 * - good: next step
 * - easy: skip a step, ease +0.15
 */
export function scheduleReview(card: CardState, rating: Rating, now: Date): ScheduledCard {
  if (rating === "again") {
    return {
      intervalDays: 0,
      ease: clampEase(card.ease - 0.2),
      repetitions: 0,
      lapses: card.lapses + 1,
      dueDate: new Date(now.getTime() + RELEARN_MINUTES * MINUTE_MS),
    };
  }

  const easeChange = rating === "hard" ? -0.15 : rating === "easy" ? 0.15 : 0;
  const intervalDays = Math.min(MAX_INTERVAL_DAYS, nextInterval(card, rating));

  return {
    intervalDays,
    ease: clampEase(card.ease + easeChange),
    repetitions: card.repetitions + 1,
    lapses: card.lapses,
    dueDate: new Date(now.getTime() + intervalDays * DAY_MS),
  };
}

/** Cards whose due date has passed, oldest first. */
export function dueCards<T extends { dueDate: Date | string }>(
  cards: readonly T[],
  now: Date,
): T[] {
  const time = (card: T) => new Date(card.dueDate).getTime();
  return cards.filter((card) => time(card) <= now.getTime()).sort((a, b) => time(a) - time(b));
}
