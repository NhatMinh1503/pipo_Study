import { createClient } from "@/lib/supabase/server";

export type AppHealth =
  | { connected: true; status: string; message: string; checkedAt: string }
  | { connected: false; error: string };

/** Reads the connectivity row seeded in `app_health` to prove the app can reach Supabase. */
export async function getAppHealth(): Promise<AppHealth> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_health")
    .select("status, message, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) return { connected: false, error: error.message };
  if (!data) return { connected: false, error: "No row in app_health — run the seed." };

  return {
    connected: true,
    status: data.status,
    message: data.message,
    checkedAt: data.updated_at,
  };
}
