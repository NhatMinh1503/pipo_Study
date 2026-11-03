import "server-only";

import { connection } from "next/server";

import type { ErrorTag } from "@/lib/ai/error-tags";
import { countByTag } from "@/lib/analytics/error-stats";
import { dayKey, lastDayKeys, sumByDay, type DayTotal } from "@/lib/dashboard/days";
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

export interface TodayGoals {
  lessonsCompleted: number;
  focusSessions: number;
  cardsReviewed: number;
}

export interface DashboardData {
  xp: number;
  coins: number;
  streakCurrent: number;
  streakBest: number;
  dueCards: number;
  inProgress: LessonSummary[];
  /** XP earned per local day, oldest first, ending today. */
  activity: DayTotal[];
  today: TodayGoals;
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
  const todayKey = dayKey(now, timeZone);
  // One extra day back covers every time zone's "today" and the whole chart window
  const since = new Date(now.getTime() - (ACTIVITY_DAYS + 1) * DAY_MS).toISOString();
  const recentSince = new Date(now.getTime() - 2 * DAY_MS).toISOString();
  const isToday = (iso: string | null) =>
    iso !== null && dayKey(new Date(iso), timeZone) === todayKey;

  const [wallet, due, inProgress, xpRows, lessonsDone, focus, reviewed, words, errors] =
    await Promise.all([
      supabase.from("wallets").select("xp, coins, streak_current, streak_best").maybeSingle(),
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
      supabase.from("lessons").select("completed_at").gte("completed_at", recentSince),
      supabase
        .from("pomodoro_sessions")
        .select("ended_at")
        .eq("status", "completed")
        .gte("ended_at", recentSince),
      supabase.from("flashcards").select("last_reviewed_at").gte("last_reviewed_at", recentSince),
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
    coins: wallet.data?.coins ?? 0,
    streakCurrent: wallet.data?.streak_current ?? 0,
    streakBest: wallet.data?.streak_best ?? 0,
    dueCards: due.count ?? 0,
    inProgress,
    activity: sumByDay(
      (xpRows.data ?? []).map((row) => ({ at: row.created_at, value: row.xp_delta })),
      days,
      timeZone,
    ),
    today: {
      lessonsCompleted: (lessonsDone.data ?? []).filter((row) => isToday(row.completed_at)).length,
      focusSessions: (focus.data ?? []).filter((row) => isToday(row.ended_at)).length,
      cardsReviewed: (reviewed.data ?? []).filter((row) => isToday(row.last_reviewed_at)).length,
    },
    recentWords: words.data ?? [],
    weakPoint:
      countByTag(
        (errors.data ?? []).map((row) => ({ tag: row.tag, createdAt: row.created_at })),
      )[0] ?? null,
  };
}
