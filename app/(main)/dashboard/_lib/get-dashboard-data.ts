import "server-only";

import { connection } from "next/server";

import type { ErrorTag } from "@/lib/ai/error-tags";
import { countByTag } from "@/lib/analytics/error-stats";
import { lastDayKeys, sumByDay, type DayTotal } from "@/lib/dashboard/days";
import { todayGoalsSchema, type TodayGoals } from "@/lib/schemas/goals";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/profile";
import { listLessonsWithProgress, type LessonSummary } from "@/server/queries/lessons";

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_DAYS = 7;
const WEAK_POINT_DAYS = 14;

export interface RecentWord {
  id: string;
  term: string;
  reading: string | null;
  meaning: string;
}

export interface DashboardData {
  xp: number;
  /** Level and progress, computed by the database (wallet_summaries). */
  level: { level: number; stars: number; xpIntoLevel: number; xpToNext: number };
  coins: number;
  streakCurrent: number;
  streakBest: number;
  /** Streak freezes held (each covers one missed day). */
  streakFreezes: number;
  dueCards: number;
  inProgress: LessonSummary[];
  /** XP earned per local day, oldest first, ending today. */
  activity: DayTotal[];
  /** Server-side daily goals; null only if the database could not answer. */
  today: TodayGoals | null;
  recentWords: RecentWord[];
  /** Most frequent mistake of the last two weeks, if any. */
  weakPoint: { tag: ErrorTag; count: number } | null;
}

/** Everything the dashboard shows, fetched in parallel. RLS scopes every query to the user. */
export async function getDashboardData(): Promise<DashboardData> {
  // "Due now" depends on the request time, so opt out of prerendering before reading the clock
  await connection();
  const now = new Date();
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const timeZone = profile?.timezone ?? "UTC";
  const days = lastDayKeys(now, timeZone, ACTIVITY_DAYS);
  // One extra day back covers every time zone's "today" and the whole chart window
  const since = new Date(now.getTime() - (ACTIVITY_DAYS + 1) * DAY_MS).toISOString();

  const [wallet, due, inProgress, xpRows, goals, words, errors] = await Promise.all([
    supabase
      .from("wallet_summaries")
      .select(
        "xp, coins, effective_streak, streak_best, streak_freezes, level, stars, xp_into_level, xp_to_next",
      )
      .maybeSingle(),
    supabase
      .from("flashcards")
      .select("id", { count: "exact", head: true })
      .lte("due_date", now.toISOString()),
    listLessonsWithProgress({ inProgressOnly: true, limit: 3 }),
    supabase
      .from("transactions")
      .select("xp_delta, created_at")
      .gt("xp_delta", 0)
      .gte("created_at", since),
    // Records goals reached so far and pays the daily bonus once (SQL today_goals)
    supabase.rpc("today_goals"),
    supabase
      .from("vocab_items")
      .select("id, term, reading, meaning")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("error_logs")
      .select("tag, created_at")
      .gte("created_at", new Date(now.getTime() - WEAK_POINT_DAYS * DAY_MS).toISOString())
      .limit(2000),
  ]);

  return {
    xp: wallet.data?.xp ?? 0,
    level: {
      level: wallet.data?.level ?? 1,
      stars: wallet.data?.stars ?? 0,
      xpIntoLevel: wallet.data?.xp_into_level ?? 0,
      xpToNext: wallet.data?.xp_to_next ?? 50,
    },
    coins: wallet.data?.coins ?? 0,
    // effective_streak (SQL) is the single source: a broken streak reads as 0
    streakCurrent: wallet.data?.effective_streak ?? 0,
    streakBest: wallet.data?.streak_best ?? 0,
    streakFreezes: wallet.data?.streak_freezes ?? 0,
    dueCards: due.count ?? 0,
    inProgress,
    activity: sumByDay(
      (xpRows.data ?? []).map((row) => ({ at: row.created_at, value: row.xp_delta })),
      days,
      timeZone,
    ),
    today: todayGoalsSchema.safeParse(goals.data).data ?? null,
    recentWords: words.data ?? [],
    weakPoint:
      countByTag(
        (errors.data ?? []).map((row) => ({ tag: row.tag, createdAt: row.created_at })),
      )[0] ?? null,
  };
}
