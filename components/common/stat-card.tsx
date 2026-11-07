import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Small text under the value, e.g. "best: 12". */
  hint?: string;
  /** Background wash for the cell, e.g. "bg-tint-mint". */
  className?: string;
  /** Extra content under the figure, e.g. a level progress bar. */
  footer?: ReactNode;
}

/**
 * One cell of a ledger strip: no box of its own, just an ink rule and the
 * figure. The parent places several cells in a single ruled container.
 */
export function StatCard({ label, value, icon: Icon, hint, className, footer }: StatCardProps) {
  return (
    <div className={cn("flex flex-col gap-2 px-4 py-4", className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="mono-label">{label}</span>
      </div>
      <p className="mono-value text-2xl leading-none font-semibold text-foreground sm:text-[1.75rem]">
        {value}
      </p>
      {hint && <p className="text-xs leading-snug text-muted-foreground">{hint}</p>}
      {footer}
    </div>
  );
}
