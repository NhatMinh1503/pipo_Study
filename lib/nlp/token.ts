import { z } from "zod";

export const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "i-adjective",
  "na-adjective",
  "adjective",
  "adverb",
  "particle",
  "auxiliary",
  "conjunction",
  "interjection",
  "prenoun",
  "pronoun",
  "symbol",
  "other",
] as const;

export const tokenSchema = z.object({
  /** Text as it appears in the sentence. */
  surface: z.string(),
  /** Dictionary form used for lookups (食べた → 食べる, Running → running). */
  base: z.string(),
  /** Hiragana reading for Japanese; empty for English. */
  reading: z.string(),
  pos: z.enum(PARTS_OF_SPEECH),
  /** False for punctuation and spaces, which are not clickable. */
  isWord: z.boolean(),
});

export type Token = z.infer<typeof tokenSchema>;
export type PartOfSpeech = Token["pos"];
export const tokensSchema = z.array(tokenSchema);
