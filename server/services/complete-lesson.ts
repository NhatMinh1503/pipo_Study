import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { scoreLesson, type LessonScore } from "@/lib/scoring";
import { getLessonWorkspace, toSentenceAttempts } from "@/server/queries/lesson-workspace";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export class CompleteLessonError extends Error {
  constructor(readonly code: "NOT_FOUND" | "NOT_FINISHED" | "INTERNAL") {
    super(code);
  }
}

export interface CompleteLessonParams {
  userClient: Client;
  adminClient: Client;
  userId: string;
  lessonId: string;
}

export function lessonRewardKey(lessonId: string) {
  return `lesson:${lessonId}`;
}

/**
 * Scores a finished lesson from its server-written attempts and pays the reward once.
 * Safe to call repeatedly: the wallet idempotency key blocks double payment.
 */
export async function completeLesson(params: CompleteLessonParams): Promise<LessonScore> {
  const { userClient, adminClient, userId, lessonId } = params;

  const workspace = await getLessonWorkspace(userClient, lessonId);
  if (!workspace) throw new CompleteLessonError("NOT_FOUND");
  if (!workspace.sentences.every((sentence) => sentence.completed)) {
    throw new CompleteLessonError("NOT_FINISHED");
  }

  const score = scoreLesson(toSentenceAttempts(workspace));

  const { error: rewardError } = await adminClient.rpc("wallet_apply", {
    p_user_id: userId,
    p_xp_delta: score.xp,
    p_coins_delta: score.coins,
    p_reason: "lesson_completed",
    p_idempotency_key: lessonRewardKey(lessonId),
    p_metadata: { lessonId, percent: score.percent },
  });
  if (rewardError) throw new CompleteLessonError("INTERNAL");

  if (!workspace.completedAt) {
    await adminClient
      .from("lessons")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", lessonId)
      .eq("user_id", userId);
  }

  return score;
}
