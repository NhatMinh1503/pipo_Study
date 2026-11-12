import type { Token } from "@/lib/nlp/token";

export interface LessonWord {
  term: string;
  reading: string;
  /** First sentence the word appears in, used as context for the AI meaning. */
  sentence: string;
}

const MAX_TERM_LENGTH = 100;

/**
 * Unique clickable words of a lesson in reading order, keyed like the explanation cache
 * (dictionary form + reading). Sentences that are not tokenized yet are skipped.
 */
export function collectLessonWords(
  sentences: ReadonlyArray<{ sourceText: string; tokens: Token[] | null }>,
): LessonWord[] {
  const seen = new Set<string>();
  const words: LessonWord[] = [];
  for (const sentence of sentences) {
    for (const token of sentence.tokens ?? []) {
      const term = token.base.trim();
      if (!token.isWord || !term || term.length > MAX_TERM_LENGTH) continue;
      const key = `${term}\u0000${token.reading}`;
      if (seen.has(key)) continue;
      seen.add(key);
      words.push({ term, reading: token.reading, sentence: sentence.sourceText });
    }
  }
  return words;
}
