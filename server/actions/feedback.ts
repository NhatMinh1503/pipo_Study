"use server";

import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";

/**
 * The learner says the AI graded their attempt wrongly. Flags feed the AI accuracy KPI;
 * RLS only accepts a flag on the learner's own attempt.
 */
export async function flagAttempt(attemptId: unknown): Promise<ActionResult> {
  const id = z.uuid().safeParse(attemptId);
  if (!id.success) return { ok: false, error: "errors.unexpected" };
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("attempt_flags")
    .insert({ attempt_id: id.data, user_id: user.id });
  // Flagging twice is fine: the first flag stands
  if (error && error.code !== "23505") return { ok: false, error: "errors.unexpected" };
  return { ok: true };
}
