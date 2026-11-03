import { useFormatter, useTranslations } from "next-intl";

import { ColumnChart } from "@/components/common/column-chart";
import type { WeekCount } from "@/lib/analytics/error-stats";

/** Mistakes per week as columns on one baseline; hover shows the exact count. */
export function WeeklyChart({ data }: { data: WeekCount[] }) {
  const t = useTranslations("analytics");
  const format = useFormatter();

  return (
    <ColumnChart
      caption={t("byWeekTitle")}
      data={data.map((week) => {
        const label = format.dateTime(new Date(week.weekStart), {
          month: "numeric",
          day: "numeric",
        });
        return {
          key: week.weekStart,
          label,
          value: week.count,
          description: t("weekTooltip", { week: label, count: week.count }),
        };
      })}
    />
  );
}
