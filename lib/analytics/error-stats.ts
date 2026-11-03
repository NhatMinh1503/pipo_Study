import { ERROR_TAGS, type ErrorTag } from "@/lib/ai/error-tags";

export interface ErrorLogRow {
  tag: string;
  createdAt: string;
}

export interface TagCount {
  tag: ErrorTag;
  count: number;
}

export interface WeekCount {
  /** Monday of the week, YYYY-MM-DD (UTC). */
  weekStart: string;
  count: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const isErrorTag = (tag: string): tag is ErrorTag =>
  (ERROR_TAGS as readonly string[]).includes(tag);

/** Mistakes per tag, most frequent first (ties keep the taxonomy order). Unknown tags are ignored. */
export function countByTag(rows: readonly ErrorLogRow[]): TagCount[] {
  const counts = new Map<ErrorTag, number>();
  for (const row of rows) {
    if (isErrorTag(row.tag)) counts.set(row.tag, (counts.get(row.tag) ?? 0) + 1);
  }
  return ERROR_TAGS.filter((tag) => counts.has(tag))
    .map((tag) => ({ tag, count: counts.get(tag) ?? 0 }))
    .sort((a, b) => b.count - a.count);
}

function mondayOf(date: Date): Date {
  const day = (date.getUTCDay() + 6) % 7; // 0 = Monday
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day));
}

/** Mistakes per week for the last `weeks` weeks (oldest first), including empty weeks. */
export function countByWeek(rows: readonly ErrorLogRow[], weeks: number, now: Date): WeekCount[] {
  const thisWeek = mondayOf(now).getTime();
  const buckets = Array.from({ length: weeks }, (_, index) => ({
    weekStart: new Date(thisWeek - (weeks - 1 - index) * 7 * DAY_MS).toISOString().slice(0, 10),
    count: 0,
  }));
  const byStart = new Map(buckets.map((bucket) => [bucket.weekStart, bucket]));

  for (const row of rows) {
    const key = mondayOf(new Date(row.createdAt)).toISOString().slice(0, 10);
    const bucket = byStart.get(key);
    if (bucket) bucket.count += 1;
  }
  return buckets;
}
