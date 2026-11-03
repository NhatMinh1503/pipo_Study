import "server-only";

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
