"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { errorTagSchema, type ErrorTag } from "@/lib/ai/error-tags";
import type { LearningLanguage, ProficiencyLevel } from "@/lib/schemas/common";
import { canStartNode, computeTopicTree, parseSkillNode, TOPIC_PROMPTS } from "@/lib/skills/topics";
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

  return generateAndOpen({ userId: profile.user_id, language, level, ...parsed.data });
}

/**
 * Starts a skill-tree node: checks on the server that the node is open for this learner,
 * then generates a lesson on its topic at the node's level, tagged with the node.
 */
export async function startSkillNode(nodeId: unknown): Promise<ActionResult> {
  const id = z.string().max(40).safeParse(nodeId);
  if (!id.success) return { ok: false, error: "errors.unexpected" };

  const profile = await requireOnboardedProfile();
  const language = profile.learning_language;
  const level = profile.level;
  if (!language || !level) return { ok: false, error: "errors.unexpected" };

  const node = parseSkillNode(id.data, language);
  if (!node) return { ok: false, error: "errors.unexpected" };
  const supabase = await createClient();
  const { data: progress } = await supabase.rpc("skill_tree_progress");
  const tree = computeTopicTree(language, level, progress ?? []);
  if (!canStartNode(tree, id.data)) return { ok: false, error: "skills.tree.locked" };

  return generateAndOpen({
    userId: profile.user_id,
    language,
    level: node.level,
    topic: TOPIC_PROMPTS[node.topic],
    skillNode: id.data,
  });
}

interface GenerateParams {
  userId: string;
  language: LearningLanguage;
  level: ProficiencyLevel;
  topic?: string;
  focusTags?: ErrorTag[];
  skillNode?: string;
}

async function generateAndOpen({
  userId,
  skillNode,
  ...request
}: GenerateParams): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("rate_limit_hit", {
    p_key: "ai",
    p_limit: getServerEnv().AI_DAILY_LIMIT,
  });
  if (!allowed) return { ok: false, error: "translate.errors.rateLimited" };

  let lesson;
  try {
    lesson = await getLessonGenerator()(request);
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
      userId,
      title: lesson.title,
      language: request.language,
      level: request.level,
      sentences: lesson.sentences,
      skillNode,
    });
  } catch (error) {
    logger.error("saving generated lesson failed", {
      code: error instanceof CreateLessonError ? error.code : "INTERNAL",
    });
    return { ok: false, error: "errors.unexpected" };
  }

  revalidatePath("/lessons");
  revalidatePath("/skills");
  redirect(`/lessons/${lessonId}/translate`);
}
