/**
 * Calendar days as the learner sees them: "today" and "the last 7 days" follow the time zone
 * saved in their profile, not the server's or UTC.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    try {
      // en-CA formats as YYYY-MM-DD
      formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      // Unknown zone name in the profile: fall back to UTC rather than failing the page
      formatter = formatterFor("UTC");
    }
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** YYYY-MM-DD of `date` in `timeZone`. */
export function dayKey(date: Date, timeZone: string): string {
  return formatterFor(timeZone).format(date);
}

/** The last `count` day keys ending today in `timeZone`, oldest first. */
export function lastDayKeys(now: Date, timeZone: string, count: number): string[] {
  const [year, month, day] = dayKey(now, timeZone).split("-").map(Number);
  // Pure calendar arithmetic on the local date, so DST changes cannot skip or repeat a day
  return Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) - (count - 1 - index)))
      .toISOString()
      .slice(0, 10),
  );
}

export interface DayTotal {
  day: string;
  total: number;
}

/** Sums values per local day over `days` (which keeps its order); rows outside are ignored. */
export function sumByDay(
  rows: readonly { at: string; value: number }[],
  days: readonly string[],
  timeZone: string,
): DayTotal[] {
  const totals = new Map(days.map((day) => [day, 0]));
  for (const row of rows) {
    const key = dayKey(new Date(row.at), timeZone);
    const current = totals.get(key);
    if (current !== undefined) totals.set(key, current + row.value);
  }
  return days.map((day) => ({ day, total: totals.get(day) ?? 0 }));
}
