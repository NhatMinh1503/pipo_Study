import type { LearningLanguage } from "@/lib/schemas/common";

// Sentence-final marks for Japanese. A mark inside 「」-style brackets is quoted speech,
// not the end of the sentence, so bracket depth is tracked.
const JA_TERMINATORS = "。！？!?";
const JA_OPENERS = "「『（(【〈《";
const JA_CLOSERS = "」』）)】〉》";

// Abbreviations that end with a period but do not end a sentence
const EN_ABBREVIATIONS = /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|No|Fig|Inc|Ltd|Co)\.$/i;

/**
 * Splits a pasted passage into sentences for translation practice.
 * - Japanese: breaks after 。！？ outside brackets (「ありがとう。」と言った。 stays whole)
 * - English: Intl.Segmenter, then re-joins splits caused by abbreviations like "Mr."
 * - Line breaks always end a sentence; blank pieces are dropped and whitespace is trimmed.
 */
export function splitSentences(text: string, language: LearningLanguage): string[] {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const split = language === "ja" ? splitJapaneseLine : splitEnglishLine;
  return lines.flatMap(split);
}

function splitJapaneseLine(line: string): string[] {
  const sentences: string[] = [];
  let current = "";
  let depth = 0;

  for (let index = 0; index < line.length; index += 1) {
    const char = line.charAt(index);
    current += char;

    if (JA_OPENERS.includes(char)) depth += 1;
    else if (JA_CLOSERS.includes(char)) depth = Math.max(0, depth - 1);

    if (depth > 0 || !JA_TERMINATORS.includes(char)) continue;

    // Absorb consecutive terminators ("！？") so they end the same sentence
    while (index + 1 < line.length && JA_TERMINATORS.includes(line.charAt(index + 1))) {
      index += 1;
      current += line.charAt(index);
    }

    sentences.push(current.trim());
    current = "";
  }

  if (current.trim()) sentences.push(current.trim());
  return sentences.filter(Boolean);
}

function splitEnglishLine(line: string): string[] {
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  const pieces = Array.from(segmenter.segment(line), ({ segment }) => segment.trim()).filter(
    Boolean,
  );

  const sentences: string[] = [];
  for (const piece of pieces) {
    const previous = sentences.at(-1);
    if (previous !== undefined && EN_ABBREVIATIONS.test(previous)) {
      sentences[sentences.length - 1] = `${previous} ${piece}`;
    } else {
      sentences.push(piece);
    }
  }
  return sentences;
}
