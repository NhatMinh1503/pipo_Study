import { z } from "zod";

import { errorTagSchema } from "@/lib/ai/error-tags";

export const verifyTranslationRequestSchema = z.object({
  sentenceId: z.uuid(),
  userTranslation: z.string().trim().min(1).max(2000),
});

/** Result of award_sentence_xp (xp-levels §3.1, §3.6). */
export const sentenceXpSchema = z.object({
  /** Points the sentence was worth before the daily cap. */
  points: z.number().int().min(0),
  /** XP actually paid. */
  awarded: z.number().int().min(0),
  /** True when the daily cap for the learner's own lessons cut the reward. */
  capped: z.boolean(),
});

export const verifyTranslationResponseSchema = z.object({
  verdict: z.enum(["exact", "acceptable", "incorrect"]),
  feedback: z.string(),
  hint: z.string().nullable(),
  errorTags: z.array(errorTagSchema),
  referenceTranslation: z.string().nullable(),
  attemptId: z.uuid(),
  sentenceCompleted: z.boolean(),
  /** What the server paid for this sentence; null unless it was unlocked just now. */
  xp: sentenceXpSchema.nullable(),
});

export type VerifyTranslationRequest = z.infer<typeof verifyTranslationRequestSchema>;
export type VerifyTranslationResponse = z.infer<typeof verifyTranslationResponseSchema>;
export type Verdict = VerifyTranslationResponse["verdict"];
export type SentenceXp = z.infer<typeof sentenceXpSchema>;
