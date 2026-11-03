import { z } from "zod";

/**
 * Fixed taxonomy of translation mistakes. The AI may only return these tags, so
 * error analytics (S19) can group them reliably.
 */
export const ERROR_TAGS = [
  "particle", // は/が, を/に ...
  "verb_form", // conjugation, te-form, potential ...
  "tense", // past/present/aspect
  "politeness", // keigo vs casual register
  "word_choice", // wrong or unnatural word
  "word_order",
  "omission", // part of the meaning missing
  "addition", // meaning that is not in the source
  "meaning", // overall meaning wrong
  "grammar", // other grammar
  "spelling", // typos, wrong kana/kanji, accents
  "article", // a/an/the
  "preposition",
  "plural",
  "naturalness", // correct but awkward
] as const;

export const errorTagSchema = z.enum(ERROR_TAGS);
export type ErrorTag = z.infer<typeof errorTagSchema>;
