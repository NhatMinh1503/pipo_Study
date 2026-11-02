import { useFormatter, useTranslations } from "next-intl";

import type { WeekCount } from "@/lib/analytics/error-stats";

/** Mistakes per week as columns on one baseline; hover shows the exact count. */
export function WeeklyChart({ data }: { data: WeekCount[] }) {
  const t = useTranslations("analytics");
  const format = useFormatter();
  const max = Math.max(1, ...data.map((week) => week.count));

  return (
    <figure className="sheet-flat space-y-3 p-5">
      <figcaption className="mono-label">{t("byWeekTitle")}</figcaption>
      <ol className="flex h-36 items-end gap-2 border-b border-border/40">
        {data.map((week) => {
          const label = format.dateTime(new Date(week.weekStart), {
            month: "numeric",
            day: "numeric",
          });
          return (
            <li
              key={week.weekStart}
              className="group flex h-full flex-1 flex-col justify-end"
              title={t("weekTooltip", { week: label, count: week.count })}
            >
              <span
                className="block w-full bg-primary/80 transition-opacity group-hover:bg-primary"
                style={{ height: `${(week.count / max) * 100}%`, minHeight: week.count ? 2 : 0 }}
              />
              <span className="sr-only">
                {t("weekTooltip", { week: label, count: week.count })}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="flex gap-2" aria-hidden>
        {data.map((week) => (
          <span
            key={week.weekStart}
            className="mono-value flex-1 text-center text-[0.625rem] text-muted-foreground"
          >
            {format.dateTime(new Date(week.weekStart), { month: "numeric", day: "numeric" })}
          </span>
        ))}
      </div>
    </figure>
  );
}
