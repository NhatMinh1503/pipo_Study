import { z } from "zod";

import { ENGLISH_INFLECTIONS, ENGLISH_POS } from "@/lib/dictionary/english";

import { learningLanguageSchema } from "./common";

export const dictionaryLookupQuerySchema = z.object({
  term: z.string().trim().min(1).max(100),
  reading: z.string().trim().max(100).default(""),
  language: learningLanguageSchema,
});

export const dictionaryEntrySchema = z.object({
  id: z.string(),
  kanji: z.array(z.string()),
  kana: z.array(z.string()),
  senses: z.array(z.object({ pos: z.array(z.string()), glosses: z.array(z.string()) })),
});

export const englishSenseSchema = z.object({
  pos: z.enum(ENGLISH_POS),
  gloss: z.string(),
  example: z.string().nullable(),
});

export const englishEntrySchema = z.object({
  word: z.string(),
  ipa: z.string().nullable(),
  senses: z.array(englishSenseSchema),
  oxford: z.boolean(),
  /** How the clicked word relates to this entry (`went` → past of `go`); null for the word itself. */
  inflection: z.enum(ENGLISH_INFLECTIONS).nullable(),
});

export const wordExplanationSchema = z.object({
  meaning: z.string(),
  partOfSpeech: z.string().nullable(),
  note: z.string().nullable(),
});

export const dictionaryLookupResponseSchema = z.object({
  entries: z.array(dictionaryEntrySchema),
  /** Offline English entries, lemma first when the clicked word is an inflected form. */
  english: z.array(englishEntrySchema).default([]),
  /** IPA of the clicked English word itself (also for forms like "went"). */
  ipa: z.string().nullable().default(null),
  /** Cached AI explanation in the user's display language, if someone asked before. */
  explanation: wordExplanationSchema.nullable(),
});

export const explainWordRequestSchema = z.object({
  term: z.string().trim().min(1).max(100),
  reading: z.string().trim().max(100).default(""),
  language: learningLanguageSchema,
  sentence: z.string().trim().min(1).max(1000),
});

export const warmVocabularyRequestSchema = z.object({ lessonId: z.uuid() });

export const warmVocabularyResponseSchema = z.object({
  explained: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  limited: z.boolean(),
});

export const addToNotebookSchema = z.object({
  language: learningLanguageSchema,
  term: z.string().trim().min(1).max(100),
  reading: z.string().trim().max(100).optional(),
  partOfSpeech: z.string().max(40).optional(),
  meaning: z.string().trim().max(500).default(""),
  contextSentence: z.string().trim().max(1000).optional(),
  contextTranslation: z.string().trim().max(1000).optional(),
  sentenceId: z.uuid().optional(),
});

export type DictionaryEntry = z.infer<typeof dictionaryEntrySchema>;
export type EnglishEntry = z.infer<typeof englishEntrySchema>;
export type WordExplanation = z.infer<typeof wordExplanationSchema>;
export type DictionaryLookupResponse = z.infer<typeof dictionaryLookupResponseSchema>;
export type ExplainWordRequest = z.infer<typeof explainWordRequestSchema>;
export type WarmVocabularyResponse = z.infer<typeof warmVocabularyResponseSchema>;
export type AddToNotebookInput = z.infer<typeof addToNotebookSchema>;
