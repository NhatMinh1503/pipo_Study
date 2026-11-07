"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { splitSentences } from "@/lib/nlp/split-sentences";
import { createLessonSchema, MAX_SENTENCES } from "@/lib/schemas/lesson";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { logger } from "@/server/logger";
import { CreateLessonError, createLessonForLearner } from "@/server/services/create-lesson";
import { createAdminClient } from "@/server/supabase-admin";

const log = logger.child({ module: "lessons-actions" });

export async function createLesson(input: unknown): Promise<ActionResult> {
  const parsed = createLessonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "errors.unexpected" };

  const { title, language, level, text, newsUrl } = parsed.data;
  const sentences = splitSentences(text, language);
  if (sentences.length === 0) {
    return { ok: false, fieldErrors: { text: "validation.required" } };
  }
  if (sentences.length > MAX_SENTENCES) {
    return { ok: false, fieldErrors: { text: "lessons.form.tooManySentences" } };
  }

  let lessonId: string;
  try {
    // The server decides the source: only an unchanged news rewrite is a news lesson
    lessonId = await createLessonForLearner({
      userClient: await createClient(),
      adminClient: createAdminClient(),
      userId: (await requireUser()).id,
      title,
      language,
      level,
      text,
      sentences,
      ...(newsUrl ? { newsUrl } : {}),
    });
  } catch (error) {
    log.error("create lesson failed", {
      code: error instanceof CreateLessonError ? error.code : "INTERNAL",
    });
    return { ok: false, error: "errors.unexpected" };
  }

  revalidatePath("/lessons");
  redirect(`/lessons/${lessonId}/translate`);
}

export async function deleteLesson(lessonId: unknown): Promise<ActionResult> {
  const id = z.uuid().safeParse(lessonId);
  if (!id.success) return { ok: false, error: "errors.unexpected" };

  // RLS ensures only the owner's row can be deleted; sentences cascade
  const supabase = await createClient();
  const { error } = await supabase.from("lessons").delete().eq("id", id.data);
  if (error) {
    log.error("delete lesson failed", { code: error.code });
    return { ok: false, error: "errors.unexpected" };
  }

  revalidatePath("/lessons");
  revalidatePath("/dashboard");
  return { ok: true };
}
