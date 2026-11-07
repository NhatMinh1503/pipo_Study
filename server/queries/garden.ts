import "server-only";

import type { TreeSpecies } from "@/lib/garden/growth";
import { createClient } from "@/lib/supabase/server";

export interface GardenTree {
  id: string;
  minutes: number;
  plantedAt: string;
}

/** One tree per completed focus session, oldest first. RLS scopes rows to the user. */
export async function getGardenTrees(): Promise<GardenTree[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .select("id, planned_minutes, ended_at")
    .eq("status", "completed")
    .order("ended_at");
  if (error) throw error;

  return data.map((session) => ({
    id: session.id,
    minutes: session.planned_minutes,
    plantedAt: session.ended_at ?? "",
  }));
}

export interface GardenStatus {
  /** The one tree still growing, if any (garden-scene spec §3.1). */
  growing: { species: TreeSpecies; sessions: number } | null;
  /** Shop items the learner owns, for seed-unlocked species. */
  ownedItemIds: string[];
}

/** What the Pomodoro page needs to offer the right tree choice. RLS scopes to the user. */
export async function getGardenStatus(): Promise<GardenStatus> {
  const supabase = await createClient();
  const [growing, purchases] = await Promise.all([
    supabase.from("garden_trees").select("species, sessions").lt("sessions", 4).maybeSingle(),
    supabase.from("purchases").select("item_id"),
  ]);
  return {
    growing: growing.data
      ? { species: growing.data.species, sessions: growing.data.sessions }
      : null,
    ownedItemIds: (purchases.data ?? []).map((row) => row.item_id),
  };
}
