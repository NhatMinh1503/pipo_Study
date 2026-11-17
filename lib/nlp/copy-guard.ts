const IGNORED = /[\s\p{P}\p{S}]/gu;

/** Width, case, spacing and punctuation never make a copied answer "different". */
export function normalizeForCopyCheck(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(IGNORED, "");
}

/** Levenshtein distance over code points (two-row DP, O(n·m) time, O(m) memory). */
function editDistance(a: string[], b: string[]): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

/**
 * Similarity of two texts after normalisation, 0 (nothing shared) to 1 (identical).
 * Uses edit distance so a copy with one particle swapped still scores close to 1.
 */
export function copySimilarity(source: string, answer: string): number {
  const a = Array.from(normalizeForCopyCheck(source));
  const b = Array.from(normalizeForCopyCheck(answer));
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - editDistance(a, b) / longest;
}

/**
 * Same-language rewording: changing one or two characters of the source is still a copy.
 * Translation into another language: only a (near-)verbatim paste of the source is a copy.
 */
export const COPY_THRESHOLD = { sameLanguage: 0.8, otherLanguage: 0.9 } as const;

/** Below this many characters a rewording cannot differ much, so only an exact copy is blocked. */
const SHORT_SOURCE = 4;

export interface CopyCheckInput {
  source: string;
  answer: string;
  /** True when the learner rewrites the sentence in the language it is written in. */
  sameLanguage: boolean;
}

/**
 * True when the answer is the source sentence handed back (pasted or barely changed).
 * Such an answer shows nothing about the learner and must never be graded as correct.
 */
export function isCopyOfSource({ source, answer, sameLanguage }: CopyCheckInput): boolean {
  const normalizedSource = normalizeForCopyCheck(source);
  const normalizedAnswer = normalizeForCopyCheck(answer);
  if (normalizedAnswer.length === 0) return false;
  if (normalizedSource === normalizedAnswer) return true;
  if (Array.from(normalizedSource).length < SHORT_SOURCE) return false;
  const threshold = sameLanguage ? COPY_THRESHOLD.sameLanguage : COPY_THRESHOLD.otherLanguage;
  return copySimilarity(source, answer) >= threshold;
}
