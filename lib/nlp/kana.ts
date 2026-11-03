const KATAKANA_START = 0x30a1; // ァ
const KATAKANA_END = 0x30f6; // ヶ
const KANA_OFFSET = 0x60; // distance between katakana and hiragana blocks

/** Converts katakana to hiragana; other characters (ー, kanji, latin) are kept. */
export function toHiragana(text: string): string {
  return Array.from(text, (char) => {
    const code = char.codePointAt(0) ?? 0;
    return code >= KATAKANA_START && code <= KATAKANA_END
      ? String.fromCodePoint(code - KANA_OFFSET)
      : char;
  }).join("");
}

/** True if the text contains at least one kanji, i.e. a reading is worth showing. */
export function hasKanji(text: string): boolean {
  return /[一-鿿㐀-䶿々]/.test(text);
}
