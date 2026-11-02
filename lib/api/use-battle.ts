"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { avatarUrl } from "@/lib/avatar";
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
}

export interface BattleState {
  id: string;
  status: BattleStatus;
  language: LearningLanguage;
  sentences: string[];
  winnerId: string | null;
  players: BattlePlayer[];
}

export const battleKey = (battleId: string) => ["battles", battleId] as const;

async function fetchBattle(battleId: string): Promise<BattleState | null> {
  const supabase = createClient();
  const { data: battle } = await supabase
    .from("battles")
    .select(
      "id, status, language, sentences, winner_id, battle_players(user_id, score, answered, finished_at)",
    )
    .eq("id", battleId)
    .maybeSingle();
  if (!battle) return null;

  const { data: cards } = await supabase
    .from("profile_cards")
    .select("user_id, display_name, avatar_path")
    .in(
      "user_id",
      battle.battle_players.map((player) => player.user_id),
    );

  return {
    id: battle.id,
    status: battle.status,
    language: battle.language,
    sentences: battle.sentences,
    winnerId: battle.winner_id,
    players: battle.battle_players.map((player) => {
      const card = cards?.find((row) => row.user_id === player.user_id);
      return {
        userId: player.user_id,
        name: card?.display_name ?? null,
        avatarUrl: avatarUrl(card?.avatar_path),
        score: player.score,
        answered: player.answered,
        finished: player.finished_at !== null,
      };
    }),
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
