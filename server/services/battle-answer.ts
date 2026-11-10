import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { battlePoints, decideWinner } from "@/lib/battle/scoring";
import type { BattleAnswerResponse } from "@/lib/schemas/battle";
import type { Grader } from "@/server/ai/grader";
import { readCachedGrade, storeGrade } from "@/server/services/grading-cache";
import type { Database } from "@/types/database";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";

type Client = SupabaseClient<Database>;

export class BattleError extends Error {
  constructor(readonly code: "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "INTERNAL") {
    super(code);
  }
}

export interface SubmitBattleAnswerParams {
  /** Acts as the user: RLS only shows battles they play in. */
  userClient: Client;
  /** Writes answers and scores, which players may not touch directly. */
  adminClient: Client;
  userId: string;
  battleId: string;
  sentenceIndex: number;
  translation: string;
  grade: Grader;
  dailyLimit: number;
  now?: () => Date;
}

/**
 * Grades the player's next sentence in an active battle. Answers go strictly in order,
 * one per sentence; the server times each one, so the client cannot claim a faster answer.
 * When the second player submits their last answer the battle is closed with a winner.
 */
export async function submitBattleAnswer(
  params: SubmitBattleAnswerParams,
): Promise<BattleAnswerResponse> {
  const { userClient, adminClient, userId, battleId, sentenceIndex, translation, grade } = params;
  const now = params.now ?? (() => new Date());

  const { data: battle } = await userClient
    .from("battles")
    .select(
      "id, status, language, level, sentences, started_at, battle_players(user_id, score, answered)",
    )
    .eq("id", battleId)
    .maybeSingle();
  if (!battle) throw new BattleError("NOT_FOUND");

  const me = battle.battle_players.find((player) => player.user_id === userId);
  const source = battle.sentences[sentenceIndex];
  if (battle.status !== "active" || !me || me.answered !== sentenceIndex || !source) {
    throw new BattleError("CONFLICT");
  }

  const [previous, profile] = await Promise.all([
    sentenceIndex === 0
      ? Promise.resolve(null)
      : userClient
          .from("battle_answers")
          .select("created_at")
          .eq("battle_id", battleId)
          .eq("user_id", userId)
          .eq("sentence_index", sentenceIndex - 1)
          .maybeSingle()
          .then(({ data }) => data?.created_at ?? null),
    userClient.from("profiles").select("display_language").eq("user_id", userId).maybeSingle(),
  ]);

  const gradeInput = {
    source,
    userTranslation: translation,
    sourceLanguage: battle.language,
    level: battle.level,
    targetLanguage: profile.data?.display_language ?? DEFAULT_LOCALE,
    contextBefore: battle.sentences[sentenceIndex - 1] ?? null,
    contextAfter: battle.sentences[sentenceIndex + 1] ?? null,
    referenceTranslation: null,
  };

  const cached = await readCachedGrade(adminClient, gradeInput);
  if (!cached) {
    const limit = await userClient.rpc("rate_limit_hit", {
      p_key: "ai",
      p_limit: params.dailyLimit,
    });
    if (limit.error) throw new BattleError("INTERNAL");
    if (!limit.data) throw new BattleError("RATE_LIMITED");
  }
  const result = cached ?? (await grade(gradeInput));
  if (!cached) await storeGrade(adminClient, grade, gradeInput, result);

  // Timed from the server's own clock: battle start, or this player's previous answer
  const answeredAt = now();
  const startedAt = Date.parse(previous ?? battle.started_at ?? answeredAt.toISOString());
  const points = battlePoints(result.verdict, (answeredAt.getTime() - startedAt) / 1000);

  const { error: answerError } = await adminClient.from("battle_answers").insert({
    battle_id: battleId,
    user_id: userId,
    sentence_index: sentenceIndex,
    translation,
    verdict: result.verdict,
    points,
    created_at: answeredAt.toISOString(),
  });
  // The primary key makes a double submit of the same sentence lose here
  if (answerError) throw new BattleError(answerError.code === "23505" ? "CONFLICT" : "INTERNAL");

  const isLast = sentenceIndex === battle.sentences.length - 1;
  const { error: playerError } = await adminClient
    .from("battle_players")
    .update({
      score: me.score + points,
      answered: sentenceIndex + 1,
      finished_at: isLast ? answeredAt.toISOString() : null,
    })
    .eq("battle_id", battleId)
    .eq("user_id", userId)
    .eq("answered", sentenceIndex);
  if (playerError) throw new BattleError("INTERNAL");

  const battleFinished = isLast ? await closeIfDone(adminClient, battleId, answeredAt) : false;
  return { verdict: result.verdict, feedback: result.feedback, points, battleFinished };
}

async function closeIfDone(adminClient: Client, battleId: string, at: Date): Promise<boolean> {
  const { data: players } = await adminClient
    .from("battle_players")
    .select("user_id, score, finished_at")
    .eq("battle_id", battleId);
  const winner = decideWinner(
    (players ?? []).map((player) => ({
      userId: player.user_id,
      score: player.score,
      finishedAt: player.finished_at,
    })),
  );
  if (!winner) return false;

  // Both finishers may race here; they compute the same winner and only one update matches
  await adminClient
    .from("battles")
    .update({ status: "finished", winner_id: winner, finished_at: at.toISOString() })
    .eq("id", battleId)
    .eq("status", "active");
  return true;
}
