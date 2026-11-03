import { z } from "zod";

import { errorTagSchema } from "@/lib/ai/error-tags";

export const verifyTranslationRequestSchema = z.object({
  sentenceId: z.uuid(),
  userTranslation: z.string().trim().min(1).max(2000),
});

export const verifyTranslationResponseSchema = z.object({
  verdict: z.enum(["exact", "acceptable", "incorrect"]),
  feedback: z.string(),
  hint: z.string().nullable(),
  errorTags: z.array(errorTagSchema),
  referenceTranslation: z.string().nullable(),
  attemptId: z.uuid(),
  sentenceCompleted: z.boolean(),
});

export type VerifyTranslationRequest = z.infer<typeof verifyTranslationRequestSchema>;
export type VerifyTranslationResponse = z.infer<typeof verifyTranslationResponseSchema>;
export type Verdict = VerifyTranslationResponse["verdict"];
