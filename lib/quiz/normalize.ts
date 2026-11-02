import { toHiragana } from "@/lib/nlp/kana";

/**
 * Canonical form for comparing typed answers: full-width → half-width, lowercase,
 * katakana → hiragana, punctuation and spaces removed.
 */
export function normalizeAnswer(text: string): string {
  return toHiragana(text.normalize("NFKC").toLowerCase()).replace(/[\s\p{P}\p{S}]/gu, "");
}

/** True if `input` matches the term or its reading (so typing えき for 駅 counts). */
export function isCorrectAnswer(input: string, term: string, reading?: string | null): boolean {
  const answer = normalizeAnswer(input);
  if (!answer) return false;
  return (
    answer === normalizeAnswer(term) || (reading ? answer === normalizeAnswer(reading) : false)
  );
}
