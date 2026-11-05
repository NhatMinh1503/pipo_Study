import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Grader } from "@/server/ai/grader";
import { readCachedGrade, storeGrade } from "@/server/services/grading-cache";
import type { GradeResponse } from "@/server/prompts/grade-translation.v1";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export class ServiceError extends Error {
  constructor(readonly code: "NOT_FOUND" | "RATE_LIMITED" | "INTERNAL") {
    super(code);
  }
}

export interface VerifyTranslationParams {
  /** Client acting as the user — every read goes through RLS. */
  userClient: Client;
  /** Secret-key client for writes the user may not make directly (attempts, logs). */
  adminClient: Client;
  userId: string;
  sentenceId: string;
  userTranslation: string;
  grade: Grader;
  dailyLimit: number;
}

export interface VerifyTranslationResult extends GradeResponse {
  attemptId: string;
  sentenceCompleted: boolean;
}

/**
 * Grades one sentence translation: loads context through RLS, enforces the daily AI quota,
 * asks the grader, then records the attempt (and marks the sentence done when correct).
 */
export async function verifyTranslation(
  params: VerifyTranslationParams,
): Promise<VerifyTranslationResult> {
  const { userClient, adminClient, userId, sentenceId, userTranslation, grade, dailyLimit } =
    params;

  const { data: sentence } = await userClient
    .from("sentences")
    .select(
      "id, lesson_id, position, source_text, reference_translation, completed_at, lessons(language, level)",
    )
    .eq("id", sentenceId)
    .maybeSingle();
  // RLS hides other users' sentences, so "not yours" and "does not exist" look the same
  if (!sentence?.lessons) throw new ServiceError("NOT_FOUND");

  const [neighbors, profile] = await Promise.all([
    userClient
      .from("sentences")
      .select("position, source_text")
      .eq("lesson_id", sentence.lesson_id)
      .in("position", [sentence.position - 1, sentence.position + 1]),
    userClient.from("profiles").select("display_language").eq("user_id", userId).maybeSingle(),
  ]);

  const neighbor = (position: number) =>
    neighbors.data?.find((row) => row.position === position)?.source_text ?? null;

  const gradeInput = {
    source: sentence.source_text,
    userTranslation,
    sourceLanguage: sentence.lessons.language,
    level: sentence.lessons.level,
    targetLanguage: profile.data?.display_language ?? "vi",
    contextBefore: neighbor(sentence.position - 1),
    contextAfter: neighbor(sentence.position + 1),
    referenceTranslation: sentence.reference_translation,
  };

  // Someone already wrote exactly this: answer instantly, without spending AI quota
  const cached = await readCachedGrade(adminClient, gradeInput);
  if (!cached) {
    const { data: allowed, error: limitError } = await userClient.rpc("rate_limit_hit", {
      p_key: "ai",
      p_limit: dailyLimit,
    });
    if (limitError) throw new ServiceError("INTERNAL");
    if (!allowed) throw new ServiceError("RATE_LIMITED");
  }

  // AI failures throw AiError; nothing is recorded, so the learner's attempt count is untouched
  const result = cached ?? (await grade(gradeInput));
  if (!cached) await storeGrade(adminClient, grade, gradeInput, result);

  const { data: attempt, error: attemptError } = await adminClient
    .from("attempts")
    .insert({
      user_id: userId,
      sentence_id: sentence.id,
      user_translation: userTranslation,
      verdict: result.verdict,
      feedback: result.feedback,
      hint: result.hint,
      error_tags: result.errorTags,
    })
    .select("id")
    .single();
  if (attemptError) throw new ServiceError("INTERNAL");

  const followUps: PromiseLike<unknown>[] = [];
  if (result.errorTags.length > 0) {
    followUps.push(
      adminClient
        .from("error_logs")
        .insert(result.errorTags.map((tag) => ({ user_id: userId, attempt_id: attempt.id, tag }))),
    );
  }

  const sentenceCompleted = result.verdict !== "incorrect";
  // Unlocking a sentence for the first time is study activity: it keeps the streak (§3.5)
  if (sentenceCompleted && !sentence.completed_at) {
    followUps.push(adminClient.rpc("record_study_activity", { p_user_id: userId }));
  }
  if (sentenceCompleted) {
    followUps.push(
      adminClient
        .from("sentences")
        .update({
          completed_at: sentence.completed_at ?? new Date().toISOString(),
          // Keep the first good reference so later reviews and dictation can reuse it
          reference_translation: sentence.reference_translation ?? result.referenceTranslation,
        })
        .eq("id", sentence.id)
        .eq("user_id", userId),
    );
  }
  await Promise.all(followUps);

  return {
    ...result,
    referenceTranslation: sentenceCompleted
      ? (sentence.reference_translation ?? result.referenceTranslation)
      : null,
    attemptId: attempt.id,
    sentenceCompleted,
  };
}
