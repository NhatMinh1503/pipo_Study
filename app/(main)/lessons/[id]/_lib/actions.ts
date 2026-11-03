"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { logger } from "@/server/logger";
import { completeLesson, CompleteLessonError } from "@/server/services/complete-lesson";
import { createAdminClient } from "@/server/supabase-admin";

export async function finishLesson(lessonId: unknown): Promise<ActionResult> {
  const id = z.uuid().safeParse(lessonId);
  if (!id.success) return { ok: false, error: "errors.unexpected" };

  const user = await requireUser();
  try {
    await completeLesson({
      userClient: await createClient(),
      adminClient: createAdminClient(),
      userId: user.id,
      lessonId: id.data,
    });
  } catch (error) {
    const code = error instanceof CompleteLessonError ? error.code : "INTERNAL";
    logger.error("finish lesson failed", { code, module: "lessons" });
    return { ok: false, error: "errors.unexpected" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/lessons");
  redirect(`/lessons/${id.data}/result`);
}
