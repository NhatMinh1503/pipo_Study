import "server-only";

import { connection } from "next/server";

import type { ErrorLogRow } from "@/lib/analytics/error-stats";
import { createClient } from "@/lib/supabase/server";

export const ANALYTICS_WEEKS = 8;

/** The user's error tags over the analytics window. RLS scopes rows to the user. */
export async function listRecentErrorLogs(): Promise<{ rows: ErrorLogRow[]; now: Date }> {
  await connection();
  const now = new Date();
  const since = new Date(now.getTime() - ANALYTICS_WEEKS * 7 * 24 * 60 * 60 * 1000);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("error_logs")
    .select("tag, created_at")
    .gte("created_at", since.toISOString())
    .limit(5000);
  if (error) throw error;

  return { rows: data.map((row) => ({ tag: row.tag, createdAt: row.created_at })), now };
}
