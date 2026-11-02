import "server-only";

import { connection } from "next/server";

import { createClient } from "@/lib/supabase/server";

export interface LessonProgress {
  id: string;
  title: string;
  level: string;
  done: number;
  total: number;
}

export interface DashboardData {
  xp: number;
  coins: number;
  streakCurrent: number;
  streakBest: number;
  dueCards: number;
  inProgress: LessonProgress[];
}

/** Everything the dashboard shows, fetched in parallel. RLS scopes every query to the user. */
export async function getDashboardData(): Promise<DashboardData> {
  // "Due now" depends on the request time, so opt out of prerendering before reading the clock
  await connection();
  const now = new Date();
  const supabase = await createClient();

  const [wallet, due, lessons] = await Promise.all([
    supabase.from("wallets").select("xp, coins, streak_current, streak_best").maybeSingle(),
    supabase
      .from("flashcards")
      .select("id", { count: "exact", head: true })
      .lte("due_date", now.toISOString()),
    supabase
      .from("lessons")
      .select("id, title, level, sentences(completed_at)")
      .is("completed_at", null)
      .order("updated_at", { ascending: false })
      .limit(3),
  ]);

  return {
    xp: wallet.data?.xp ?? 0,
    coins: wallet.data?.coins ?? 0,
    streakCurrent: wallet.data?.streak_current ?? 0,
    streakBest: wallet.data?.streak_best ?? 0,
    dueCards: due.count ?? 0,
    inProgress: (lessons.data ?? []).map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      level: lesson.level,
      done: lesson.sentences.filter((sentence) => sentence.completed_at !== null).length,
      total: lesson.sentences.length,
    })),
  };
}
