import type { LearningLanguage } from "@/lib/schemas/common";

/**
 * Longest run copied word-for-word from the source. Japanese is compared by characters
 * (no spaces between words), English by words; whitespace and punctuation are ignored so
 * reformatting cannot hide a copied sentence.
 */
export function longestCopiedRun(
  source: string,
  output: string,
  language: LearningLanguage,
): number {
  const units = (text: string) =>
    language === "ja"
      ? Array.from(text.normalize("NFKC").replace(/[\s\p{P}\p{S}]/gu, ""))
      : (text
          .normalize("NFKC")
          .toLowerCase()
          .match(/[\p{L}\p{N}']+/gu) ?? []);
  const a = units(source);
  const b = units(output);

  // Classic longest-common-substring DP with one rolling row: O(|a|·|b|) time, O(|b|) memory
  let best = 0;
  let previous = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const current = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        const run = (previous[j - 1] ?? 0) + 1;
        current[j] = run;
        if (run > best) best = run;
      }
    }
    previous = current;
  }
  return best;
}

/** Longest copied run allowed: names and set phrases fit, whole copied clauses do not. */
export const MAX_COPIED_RUN: Record<LearningLanguage, number> = { ja: 20, en: 8 };

export function copiesSource(source: string, output: string, language: LearningLanguage): boolean {
  return longestCopiedRun(source, output, language) >= MAX_COPIED_RUN[language];
}
