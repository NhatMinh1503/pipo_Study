"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { avatarUrl } from "@/lib/avatar";
import { ghostProgress } from "@/lib/battle/scoring";
import { battleAnswerResponseSchema, type BattleAnswerRequest } from "@/lib/schemas/battle";
import type { LearningLanguage } from "@/lib/schemas/common";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

import { postJson } from "./http";

export type BattleStatus = Database["public"]["Enums"]["battle_status"];

export interface BattlePlayer {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  score: number;
  answered: number;
  finished: boolean;
  /** A recorded run replayed at its own pace (ghost mode), not a live player. */
  ghost?: boolean;
}

export interface BattleState {
  id: string;
  status: BattleStatus;
  language: LearningLanguage;
  sentences: string[];
  winnerId: string | null;
  /** True for a race against a recorded run. */
  isGhost: boolean;
  players: BattlePlayer[];
}

export const battleKey = (battleId: string) => ["battles", battleId] as const;

async function fetchBattle(battleId: string): Promise<BattleState | null> {
  const supabase = createClient();
  const { data: battle } = await supabase
    .from("battles")
    .select(
      "id, status, language, sentences, winner_id, started_at, ghost_user_id, battle_players(user_id, score, answered, finished_at)",
    )
    .eq("id", battleId)
    .maybeSingle();
  if (!battle) return null;

  const ids = battle.battle_players.map((player) => player.user_id);
  if (battle.ghost_user_id) ids.push(battle.ghost_user_id);
  const [{ data: cards }, ghost] = await Promise.all([
    supabase.from("profile_cards").select("user_id, display_name, avatar_path").in("user_id", ids),
    battle.ghost_user_id
      ? supabase.rpc("ghost_timeline", { p_battle_id: battleId })
      : Promise.resolve(null),
  ]);

  const players: BattlePlayer[] = battle.battle_players.map((player) => {
    const card = cards?.find((row) => row.user_id === player.user_id);
    return {
      userId: player.user_id,
      name: card?.display_name ?? null,
      avatarUrl: avatarUrl(card?.avatar_path),
      score: player.score,
      answered: player.answered,
      finished: player.finished_at !== null,
    };
  });

  if (battle.ghost_user_id && ghost) {
    const card = cards?.find((row) => row.user_id === battle.ghost_user_id);
    const answers = (ghost.data ?? []).map((row) => ({
      offsetSeconds: Number(row.offset_seconds),
      points: row.points,
    }));
    const live = battle.status === "active";
    const elapsed = battle.started_at
      ? (Date.now() - Date.parse(battle.started_at)) / 1000
      : Number.POSITIVE_INFINITY;
    const progress = ghostProgress(answers, live ? elapsed : Number.POSITIVE_INFINITY);
    players.push({
      userId: battle.ghost_user_id,
      name: card?.display_name ?? null,
      avatarUrl: avatarUrl(card?.avatar_path),
      score: progress.score,
      answered: progress.answered,
      finished: progress.answered >= battle.sentences.length,
      ghost: true,
    });
  }

  return {
    id: battle.id,
    status: battle.status,
    language: battle.language,
    sentences: battle.sentences,
    winnerId: battle.winner_id,
    isGhost: battle.ghost_user_id !== null,
    players,
  };
}

/**
 * Live battle state. Realtime broadcasts trigger refetches; polling while waiting is the
 * fallback so a lost broadcast can never leave a player stuck in the lobby.
 */
export function useBattle(battleId: string) {
  return useQuery({
    queryKey: battleKey(battleId),
    queryFn: () => fetchBattle(battleId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "waiting") return 3000;
      // A recorded run moves on its own clock: refresh often so its progress looks live
      if (status === "active" && query.state.data?.isGhost) return 2000;
      if (status === "active") return 10000;
      return false;
    },
  });
}

/** Sends the player's translation of the current sentence for grading. */
export function useBattleAnswer() {
  return useMutation({
    mutationFn: (request: BattleAnswerRequest) =>
      postJson("/api/battles/answer", request, battleAnswerResponseSchema),
  });
}
