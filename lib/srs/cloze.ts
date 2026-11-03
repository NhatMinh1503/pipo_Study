export const CLOZE_BLANK = "＿＿＿";

export interface ClozeResult {
  /** Sentence with the word hidden, or the original sentence if it could not be found. */
  text: string;
  found: boolean;
}

/**
 * Hides the saved word in its example sentence for the card front.
 * Words are saved in dictionary form (食べる, 安い), but sentences use inflected forms
 * (食べました, 安かった), so we fall back to the stem when the full form is missing.
 */
export function makeCloze(sentence: string, term: string): ClozeResult {
  if (!term) return { text: sentence, found: false };

  const candidates = [term];
  // Japanese verbs/i-adjectives end in a kana that changes when inflected
  if (term.length >= 2 && /[぀-ゟ]$/.test(term)) candidates.push(term.slice(0, -1));

  for (const candidate of candidates) {
    const index = sentence.toLowerCase().indexOf(candidate.toLowerCase());
    if (index !== -1) {
      return {
        text: sentence.slice(0, index) + CLOZE_BLANK + sentence.slice(index + candidate.length),
        found: true,
      };
    }
  }
  return { text: sentence, found: false };
}
