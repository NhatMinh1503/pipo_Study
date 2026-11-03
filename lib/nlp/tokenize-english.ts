import type { Token } from "./token";

// Words (with inner apostrophes or hyphens: don't, well-known), numbers, or any other run
const TOKEN_PATTERN = /([A-Za-z]+(?:['’-][A-Za-z]+)*)|(\d+(?:[.,]\d+)*)|(\s+)|([^A-Za-z\d\s]+)/g;

/** Splits an English sentence into clickable words and non-clickable spacing/punctuation. */
export function tokenizeEnglish(text: string): Token[] {
  return Array.from(text.matchAll(TOKEN_PATTERN), ([surface, word, number]) => {
    if (word) {
      return {
        surface,
        base: word.toLowerCase().replace("’", "'"),
        reading: "",
        pos: "other",
        isWord: true,
      };
    }
    if (number) return { surface, base: surface, reading: "", pos: "other", isWord: false };
    return { surface, base: surface, reading: "", pos: "symbol", isWord: false };
  });
}
