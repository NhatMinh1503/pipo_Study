import "server-only";

import { getServerEnv } from "@/server/env";
import { generateWithFallback } from "@/server/ai/llm";
import {
  buildGenerateLessonPrompt,
  generatedLessonSchema,
  PROMPT_VERSION,
  SYSTEM_INSTRUCTION,
  type GeneratedLesson,
  type GenerateLessonInput,
} from "@/server/prompts/generate-lesson.v1";

export type LessonGenerator = (input: GenerateLessonInput) => Promise<GeneratedLesson>;

export const geminiLessonGenerator: LessonGenerator = async (input) => {
  const { data } = await generateWithFallback({
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt: buildGenerateLessonPrompt(input),
    schema: generatedLessonSchema,
    promptVersion: PROMPT_VERSION,
    temperature: 0.8,
  });
  return data;
};

/** Deterministic generator for automated tests only (AI_PROVIDER=fake, never in production). */
export const fakeLessonGenerator: LessonGenerator = async (input) =>
  input.language === "ja"
    ? {
        title: input.topic ?? "練習",
        sentences: ["今日は晴れです。", "公園に行きます。", "友達と話します。"],
      }
    : {
        title: input.topic ?? "Practice",
        sentences: ["It is sunny today.", "I go to the park.", "I talk with friends."],
      };

export function getLessonGenerator(): LessonGenerator {
  const useFake = process.env.AI_PROVIDER === "fake" && getServerEnv().NODE_ENV !== "production";
  return useFake ? fakeLessonGenerator : geminiLessonGenerator;
}
