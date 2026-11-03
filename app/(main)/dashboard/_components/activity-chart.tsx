import type { DateTimeFormatOptions } from "next-intl";
import { getFormatter, getTranslations } from "next-intl/server";

import { ColumnChart } from "@/components/common/column-chart";
import type { DayTotal } from "@/lib/dashboard/days";

/** XP earned on each of the last 7 days; today's column is emphasised. */
export async function ActivityChart({ activity }: { activity: DayTotal[] }) {
  const [t, format] = await Promise.all([getTranslations("dashboard.activity"), getFormatter()]);
  const total = activity.reduce((sum, day) => sum + day.total, 0);
  // Day keys are calendar dates; format them in UTC so the label never shifts a day
  const label = (day: string, options: DateTimeFormatOptions) =>
    format.dateTime(new Date(`${day}T00:00:00Z`), { ...options, timeZone: "UTC" });

  return (
    <ColumnChart
      caption={t("title", { total })}
      emptyMessage={t("empty")}
      highlightKey={activity.at(-1)?.day}
      data={activity.map((day) => ({
        key: day.day,
        label: label(day.day, { weekday: "short" }),
        value: day.total,
        description: t("tooltip", {
          day: label(day.day, { weekday: "long", month: "numeric", day: "numeric" }),
          xp: day.total,
        }),
      }))}
    />
  );
}
