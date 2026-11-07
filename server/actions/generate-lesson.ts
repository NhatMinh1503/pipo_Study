"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { errorTagSchema } from "@/lib/ai/error-tags";
import { createClient } from "@/lib/supabase/server";
import { getLessonGenerator } from "@/server/ai/lesson-generator";
import { getServerEnv } from "@/server/env";
import { AiError } from "@/server/gemini";
import { logger } from "@/server/logger";
import { requireOnboardedProfile } from "@/server/profile";
import { CreateLessonError, createGeneratedLesson } from "@/server/services/create-lesson";
import { createAdminClient } from "@/server/supabase-admin";

const generateSchema = z
  .object({
    topic: z.string().trim().max(100).optional(),
    focusTags: z.array(errorTagSchema).max(3).optional(),
  })
  .refine((value) => Boolean(value.topic) || Boolean(value.focusTags?.length), {
    error: "validation.required",
    path: ["topic"],
  });

/**
 * Asks the AI for a passage at the learner's level (a topic, or weak points for a
 * micro-lesson), saves it as a lesson and opens the translate screen.
 */
export async function generateLesson(input: unknown): Promise<ActionResult> {
  const parsed = generateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: { topic: "validation.required" } };

  const profile = await requireOnboardedProfile();
  const language = profile.learning_language;
  const level = profile.level;
  if (!language || !level) return { ok: false, error: "errors.unexpected" };

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("rate_limit_hit", {
    p_key: "ai",
    p_limit: getServerEnv().AI_DAILY_LIMIT,
  });
  if (!allowed) return { ok: false, error: "translate.errors.rateLimited" };

  let lesson;
  try {
    lesson = await getLessonGenerator()({ language, level, ...parsed.data });
  } catch (error) {
    logger.warn("lesson generation failed", {
      code: error instanceof AiError ? error.code : "INTERNAL",
    });
    return { ok: false, error: "translate.errors.unavailable" };
  }

  let lessonId: string;
  try {
    // Only the server creates ai lessons (they are outside the daily XP cap for manual ones)
    lessonId = await createGeneratedLesson({
      adminClient: createAdminClient(),
      userId: profile.user_id,
      title: lesson.title,
      language,
      level,
      sentences: lesson.sentences,
    });
  } catch (error) {
    logger.error("saving generated lesson failed", {
      code: error instanceof CreateLessonError ? error.code : "INTERNAL",
    });
    return { ok: false, error: "errors.unexpected" };
  }

  revalidatePath("/lessons");
  redirect(`/lessons/${lessonId}/translate`);
}
