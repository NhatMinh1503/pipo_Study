"use client";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

export const levelSummaryKey = ["wallet-summary", "level"] as const;

/** The learner's level and progress, as computed by the database (wallet_summaries). */
export interface LevelSummary {
  level: number;
  stars: number;
  xpIntoLevel: number;
  xpToNext: number;
}

async function fetchLevelSummary(): Promise<LevelSummary | null> {
  const { data, error } = await createClient()
    .from("wallet_summaries")
    .select("level, stars, xp_into_level, xp_to_next")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    level: data.level ?? 1,
    stars: data.stars ?? 0,
    xpIntoLevel: data.xp_into_level ?? 0,
    xpToNext: data.xp_to_next ?? 0,
  };
}

/**
 * Level progress fetched fresh each time a component mounts, so a reward animation starts
 * from the real numbers after the award (RLS: the view shows the learner's own wallet).
 */
export function useLevelSummary() {
  return useQuery({
    queryKey: levelSummaryKey,
    queryFn: fetchLevelSummary,
    refetchOnMount: "always",
  });
}
