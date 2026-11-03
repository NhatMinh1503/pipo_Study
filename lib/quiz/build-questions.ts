import type { VocabItem } from "@/lib/vocab/types";

export type Random = () => number;

/** Fisher–Yates shuffle with an injectable random source (deterministic in tests). */
export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

export const CHOICES_PER_QUESTION = 4;
export const MIN_WORDS_FOR_QUIZ = CHOICES_PER_QUESTION;

export interface ChoiceQuestion {
  item: VocabItem;
  /** Meanings to pick from; exactly one belongs to `item`. */
  choices: string[];
  answer: string;
}

/** Only words with a meaning can be quizzed on their meaning. */
export function quizzableItems(items: readonly VocabItem[]): VocabItem[] {
  return items.filter((item) => item.meaning.trim() !== "");
}

/**
 * Multiple-choice questions: show a word, pick its meaning. Wrong options come from
 * words with the same part of speech first, so the choice is not obvious.
 */
export function buildChoiceQuestions(
  items: readonly VocabItem[],
  count: number,
  random: Random = Math.random,
): ChoiceQuestion[] {
  const pool = quizzableItems(items);
  if (pool.length < CHOICES_PER_QUESTION) return [];

  return shuffle(pool, random)
    .slice(0, count)
    .map((item) => {
      const others = pool.filter((other) => other.id !== item.id && other.meaning !== item.meaning);
      const samePos = shuffle(
        others.filter((other) => other.partOfSpeech && other.partOfSpeech === item.partOfSpeech),
        random,
      );
      const rest = shuffle(
        others.filter((other) => !samePos.includes(other)),
        random,
      );
      const distractors = [...new Set([...samePos, ...rest].map((other) => other.meaning))].slice(
        0,
        CHOICES_PER_QUESTION - 1,
      );
      return {
        item,
        answer: item.meaning,
        choices: shuffle([item.meaning, ...distractors], random),
      };
    });
}

/** Words for fill-in-the-blank: they need an example sentence to hide them in. */
export function buildFillQuestions(
  items: readonly VocabItem[],
  count: number,
  random: Random = Math.random,
): VocabItem[] {
  return shuffle(
    items.filter((item) => item.contextSentence),
    random,
  ).slice(0, count);
}

/** Pairs for the matching game: each word appears once on the left, its meaning once on the right. */
export function buildMatchPairs(
  items: readonly VocabItem[],
  count: number,
  random: Random = Math.random,
): { left: VocabItem[]; right: VocabItem[] } {
  const picked = shuffle(quizzableItems(items), random).slice(0, count);
  return { left: picked, right: shuffle(picked, random) };
}
