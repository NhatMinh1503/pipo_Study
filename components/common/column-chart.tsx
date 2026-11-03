import { cn } from "@/lib/utils";

export interface ColumnDatum {
  key: string;
  /** Short axis label under the column. */
  label: string;
  value: number;
  /** Full sentence for hover and screen readers, e.g. "Mon 3/11: 12 XP". */
  description: string;
}

interface ColumnChartProps {
  caption: string;
  data: readonly ColumnDatum[];
  /** Emphasise one column (e.g. today) with the full accent. */
  highlightKey?: string;
  /** Shown inside the plot when every value is zero, instead of an empty frame. */
  emptyMessage?: string;
  className?: string;
}

/** Single-series columns on one baseline; hover and screen readers get the exact value. */
export function ColumnChart({
  caption,
  data,
  highlightKey,
  emptyMessage,
  className,
}: ColumnChartProps) {
  const max = Math.max(1, ...data.map((datum) => datum.value));
  const isEmpty = data.every((datum) => datum.value === 0);

  return (
    <figure className={cn("sheet-flat space-y-3 p-5", className)}>
      <figcaption className="mono-label">{caption}</figcaption>
      <div className="relative">
        {isEmpty && emptyMessage && (
          <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-4 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        )}
        <ol className="flex h-36 items-end gap-2 border-b border-border/40">
          {data.map((datum) => (
            <li
              key={datum.key}
              className="group flex h-full flex-1 flex-col justify-end"
              title={datum.description}
            >
              <span
                className={cn(
                  "block w-full transition-colors group-hover:bg-primary",
                  datum.key === highlightKey ? "bg-primary" : "bg-primary/60",
                )}
                style={{ height: `${(datum.value / max) * 100}%`, minHeight: datum.value ? 2 : 0 }}
              />
              <span className="sr-only">{datum.description}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex gap-2" aria-hidden>
        {data.map((datum) => (
          <span
            key={datum.key}
            className="mono-value flex-1 text-center text-[0.625rem] text-muted-foreground"
          >
            {datum.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
