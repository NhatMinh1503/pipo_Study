import "server-only";

import { getServerEnv } from "@/server/env";
import { generateWithFallback } from "@/server/ai/llm";
import {
  buildGradePrompt,
  gradeResponseSchema,
  PROMPT_VERSION,
  sanitizeGrade,
  SYSTEM_INSTRUCTION,
  type GradeInput,
  type GradeResponse,
} from "@/server/prompts/grade-translation.v1";

export type Grader = ((input: GradeInput) => Promise<GradeResponse>) & {
  /** Only real AI verdicts may enter the shared grading cache. */
  cacheable?: boolean;
};

/** Grades with the configured AI providers (primary first, then fallback). */
export const aiGrader: Grader = Object.assign(
  async (input: GradeInput) => {
    const { data } = await generateWithFallback({
      systemInstruction: SYSTEM_INSTRUCTION,
      prompt: buildGradePrompt(input),
      schema: gradeResponseSchema,
      promptVersion: PROMPT_VERSION,
    });
    return sanitizeGrade(data);
  },
  { cacheable: true },
);

const normalize = (text: string) =>
  text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\s.,!?。、！？]/g, "");

/**
 * Deterministic grader for automated tests only (AI_PROVIDER=fake, never in production):
 * exact if the answer matches the reference, incorrect if it contains "sai", else acceptable.
 */
export const fakeGrader: Grader = async (input) => {
  const reference = input.referenceTranslation ?? "";
  if (reference && normalize(input.userTranslation) === normalize(reference)) {
    return {
      verdict: "exact",
      feedback: "Chính xác.",
      hint: null,
      errorTags: [],
      referenceTranslation: reference,
    };
  }
  if (normalize(input.userTranslation).includes("sai")) {
    return {
      verdict: "incorrect",
      feedback: "Nghĩa chưa đúng.",
      hint: "Xem lại động từ chính.",
      errorTags: ["meaning"],
      referenceTranslation: null,
    };
  }
  return {
    verdict: "acceptable",
    feedback: "Đúng ý nhưng chưa tự nhiên.",
    hint: null,
    errorTags: ["naturalness"],
    referenceTranslation: reference || input.userTranslation,
  };
};

export function getGrader(): Grader {
  const useFake = process.env.AI_PROVIDER === "fake" && getServerEnv().NODE_ENV !== "production";
  return useFake ? fakeGrader : aiGrader;
}
