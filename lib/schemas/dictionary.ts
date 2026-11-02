import { z } from "zod";

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

export const wordExplanationSchema = z.object({
  meaning: z.string(),
  partOfSpeech: z.string().nullable(),
  note: z.string().nullable(),
});

export const dictionaryLookupResponseSchema = z.object({
  entries: z.array(dictionaryEntrySchema),
  /** Cached AI explanation in the user's display language, if someone asked before. */
  explanation: wordExplanationSchema.nullable(),
});

export const explainWordRequestSchema = z.object({
  term: z.string().trim().min(1).max(100),
  reading: z.string().trim().max(100).default(""),
  language: learningLanguageSchema,
  sentence: z.string().trim().min(1).max(1000),
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
export type WordExplanation = z.infer<typeof wordExplanationSchema>;
export type DictionaryLookupResponse = z.infer<typeof dictionaryLookupResponseSchema>;
export type ExplainWordRequest = z.infer<typeof explainWordRequestSchema>;
export type AddToNotebookInput = z.infer<typeof addToNotebookSchema>;
