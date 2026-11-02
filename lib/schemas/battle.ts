import { z } from "zod";

import { verifyTranslationResponseSchema } from "@/lib/schemas/translation";

export const battleAnswerRequestSchema = z.object({
  battleId: z.uuid(),
  sentenceIndex: z.int().min(0).max(9),
  translation: z.string().trim().min(1).max(1000),
});

export const battleAnswerResponseSchema = z.object({
  verdict: verifyTranslationResponseSchema.shape.verdict,
  feedback: z.string(),
  points: z.int(),
  battleFinished: z.boolean(),
});

export type BattleAnswerRequest = z.infer<typeof battleAnswerRequestSchema>;
export type BattleAnswerResponse = z.infer<typeof battleAnswerResponseSchema>;
