"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

export const levelUpsKey = ["level-ups", "unseen"] as const;

/** A level-up moment recorded by wallet_apply (xp-levels §3.9), not yet shown. */
export interface LevelUpEvent {
  id: string;
  kind: "level" | "star";
  fromLevel: number;
  toLevel: number;
  fromStars: number;
  toStars: number;
  xpTotal: number;
  xpIntoLevel: number;
  xpToNext: number;
  sourceReason: string;
}

async function fetchUnseenLevelUps(): Promise<LevelUpEvent[]> {
  const { data, error } = await createClient()
    .from("level_ups")
    .select(
      "id, kind, from_level, to_level, from_stars, to_stars, xp_total, xp_into_level, xp_to_next, source_reason",
    )
    .is("seen_at", null)
    .order("created_at");
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    kind: row.kind === "star" ? "star" : "level",
    fromLevel: row.from_level,
    toLevel: row.to_level,
    fromStars: row.from_stars,
    toStars: row.to_stars,
    xpTotal: row.xp_total,
    xpIntoLevel: row.xp_into_level,
    xpToNext: row.xp_to_next,
    sourceReason: row.source_reason,
  }));
}

/** The learner's level-up events that have not been shown yet (RLS: own rows only). */
export function useUnseenLevelUps() {
  return useQuery({ queryKey: levelUpsKey, queryFn: fetchUnseenLevelUps });
}

/** Marks events as shown, so they appear once even across devices. */
export async function markLevelUpsSeen(ids: string[]): Promise<void> {
  const { error } = await createClient().rpc("mark_level_ups_seen", { p_ids: ids });
  if (error) throw error;
}
