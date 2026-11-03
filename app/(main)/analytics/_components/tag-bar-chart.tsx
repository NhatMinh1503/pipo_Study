import { useTranslations } from "next-intl";

import type { TagCount } from "@/lib/analytics/error-stats";

/**
 * Horizontal bars, one per mistake type, longest first. Single series: one hue, no legend;
 * every bar carries its value as text so identity never depends on color.
 */
export function TagBarChart({ data }: { data: TagCount[] }) {
  const t = useTranslations("analytics");
  const max = Math.max(1, ...data.map((item) => item.count));

  return (
    <figure className="sheet-flat space-y-3 p-5">
      <figcaption className="mono-label">{t("byTypeTitle")}</figcaption>
      <ul className="space-y-2.5">
        {data.map((item) => (
          <li
            key={item.tag}
            className="group grid grid-cols-[minmax(7rem,10rem)_1fr_2.5rem] items-center gap-3"
            title={t("barTooltip", { label: t(`tags.${item.tag}`), count: item.count })}
          >
            <span className="truncate text-sm">{t(`tags.${item.tag}`)}</span>
            <span className="h-4 bg-muted/40" aria-hidden>
              <span
                className="block h-full bg-primary transition-opacity group-hover:opacity-80"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </span>
            <span className="mono-value text-right text-sm text-muted-foreground">
              {item.count}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
