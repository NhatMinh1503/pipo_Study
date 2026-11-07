import "server-only";

import { dayKey } from "@/lib/dashboard/days";
import { GAME } from "@/lib/game/config";
import type { TreeSpecies } from "@/lib/garden/growth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/profile";

export interface CompletedSession {
  id: string;
  minutes: number;
  endedAt: string;
}

/** Completed focus sessions, oldest first (focus time stats). RLS scopes rows to the user. */
export async function getCompletedSessions(): Promise<CompletedSession[]> {
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
    endedAt: session.ended_at ?? "",
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

export interface GardenTree {
  id: string;
  plot: number;
  species: TreeSpecies;
  sessions: number;
  plantedAt: string;
  maturedAt: string | null;
  legacy: boolean;
}

export interface GardenScene {
  gardenIndex: number;
  /** How many gardens the learner has (a full garden opens the next one). */
  gardenCount: number;
  /** Trees of the garden shown. */
  trees: GardenTree[];
  /** Trees across every garden. */
  totalTrees: number;
  growing: { species: TreeSpecies; sessions: number } | null;
  hasPond: boolean;
  hasCat: boolean;
  /** Today had study activity, in the learner's time zone: mature sakura bloom. */
  studiedToday: boolean;
}

/** Everything the garden scene needs for one garden. RLS scopes every query to the user. */
export async function getGardenScene(gardenIndex = 1): Promise<GardenScene> {
  const supabase = await createClient();
  const [trees, purchases, wallet, profile] = await Promise.all([
    supabase
      .from("garden_trees")
      .select("id, garden_index, plot_index, species, sessions, planted_at, matured_at, legacy")
      .order("garden_index")
      .order("plot_index"),
    supabase.from("purchases").select("item_id"),
    supabase.from("wallets").select("last_active_date").maybeSingle(),
    getCurrentProfile(),
  ]);
  const rows = trees.data ?? [];
  const owned = new Set((purchases.data ?? []).map((row) => row.item_id));
  const growing = rows.find((row) => row.sessions < GAME.garden.matureAtSessions);
  // createClient() already opted out of prerendering, so reading the clock is safe here
  const today = dayKey(new Date(), profile?.timezone ?? "UTC");

  return {
    gardenIndex,
    gardenCount: Math.max(1, ...rows.map((row) => row.garden_index)),
    trees: rows
      .filter((row) => row.garden_index === gardenIndex)
      .map((row) => ({
        id: row.id,
        plot: row.plot_index,
        species: row.species,
        sessions: row.sessions,
        plantedAt: row.planted_at,
        maturedAt: row.matured_at,
        legacy: row.legacy,
      })),
    totalTrees: rows.length,
    growing: growing ? { species: growing.species, sessions: growing.sessions } : null,
    hasPond: owned.has("deco-pond"),
    hasCat: owned.has("deco-cat"),
    studiedToday: wallet.data?.last_active_date === today,
  };
}
