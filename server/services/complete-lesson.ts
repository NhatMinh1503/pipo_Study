import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { z } from "zod";

import { lessonRewards, scoreLesson, type LessonScore } from "@/lib/scoring";
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

/** Result of award_lesson_completion (xp-levels §3.2, §3.6). */
export const lessonRewardSchema = z.object({
  xp: z.number().int().min(0),
  coins: z.number().int().min(0),
  /** The daily cap for the learner's own lessons stopped the bonus (and so the coins). */
  capped: z.boolean(),
  /** Rewarded by the old whole-lesson rule before per-sentence XP. */
  legacy: z.boolean(),
});

export type LessonReward = z.infer<typeof lessonRewardSchema>;

/**
 * Scores a finished lesson from its server-written attempts and pays the completion reward
 * once (bonus XP + coins for lessons of 3+ sentences; sentence XP was paid as each sentence
 * was unlocked). Safe to call repeatedly: the database records the claim.
 */
export async function completeLesson(
  params: CompleteLessonParams,
): Promise<{ score: LessonScore; reward: LessonReward }> {
  const { userClient, adminClient, userId, lessonId } = params;

  const workspace = await getLessonWorkspace(userClient, lessonId);
  if (!workspace) throw new CompleteLessonError("NOT_FOUND");
  if (!workspace.sentences.every((sentence) => sentence.completed)) {
    throw new CompleteLessonError("NOT_FINISHED");
  }

  const score = scoreLesson(toSentenceAttempts(workspace));
  const rewards = lessonRewards({
    sentenceCount: workspace.sentences.length,
    points: score.points,
    perfect: score.perfect,
  });

  const { data, error: rewardError } = await adminClient.rpc("award_lesson_completion", {
    p_user_id: userId,
    p_lesson_id: lessonId,
    p_bonus_xp: rewards.bonusXp,
    p_coins: rewards.coins,
  });
  const reward = lessonRewardSchema.safeParse(data);
  if (rewardError || !reward.success) throw new CompleteLessonError("INTERNAL");

  if (!workspace.completedAt) {
    await adminClient
      .from("lessons")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", lessonId)
      .eq("user_id", userId);
  }

  return { score, reward: reward.data };
}
