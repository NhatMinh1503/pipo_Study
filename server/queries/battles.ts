import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";

export type BattleOutcome = "won" | "lost" | "draw" | "waiting" | "active" | "cancelled";

export interface BattleSummary {
  id: string;
  createdAt: string;
  outcome: BattleOutcome;
  opponentName: string | null;
}

/** The current user's latest battles, newest first. */
export async function listRecentBattles(limit = 10): Promise<BattleSummary[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: battles } = await supabase
    .from("battles")
    .select("id, status, winner_id, created_at, battle_players(user_id)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!battles?.length) return [];

  const opponentIds = battles.flatMap((battle) =>
    battle.battle_players.filter((player) => player.user_id !== user.id).map((p) => p.user_id),
  );
  const { data: cards } = await supabase
    .from("profile_cards")
    .select("user_id, display_name")
    .in("user_id", opponentIds);

  return battles.map((battle) => {
    const opponentId = battle.battle_players.find((p) => p.user_id !== user.id)?.user_id;
    let outcome: BattleOutcome = battle.status === "finished" ? "draw" : battle.status;
    if (battle.status === "finished" && battle.winner_id) {
      outcome = battle.winner_id === user.id ? "won" : "lost";
    }
    return {
      id: battle.id,
      createdAt: battle.created_at,
      outcome,
      opponentName: cards?.find((card) => card.user_id === opponentId)?.display_name ?? null,
    };
  });
}
