import { z } from "zod";

import {
  isLevelForLanguage,
  learningLanguageSchema,
  LEVEL_MISMATCH_MESSAGE,
  proficiencyLevelSchema,
} from "./common";

export const LESSON_TITLE_MAX = 120;
export const LESSON_TEXT_MAX = 5000;
/** Matches the limit enforced by the create_lesson RPC. */
export const MAX_SENTENCES = 200;

/** Input of the "create lesson" form: a pasted passage that is later split into sentences. */
export const createLessonSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { error: "validation.required" })
      .max(LESSON_TITLE_MAX, { error: "lessons.form.titleTooLong" }),
    language: learningLanguageSchema,
    level: proficiencyLevelSchema,
    text: z
      .string()
      .trim()
      .min(1, { error: "validation.required" })
      .max(LESSON_TEXT_MAX, { error: "lessons.form.textTooLong" }),
  })
  .refine((value) => isLevelForLanguage(value.language, value.level), {
    message: LEVEL_MISMATCH_MESSAGE,
    path: ["level"],
  });

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
