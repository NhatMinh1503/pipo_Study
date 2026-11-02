import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Verdict } from "@/lib/schemas/translation";
import { cn } from "@/lib/utils";

const STYLES: Record<Verdict, { icon: typeof CircleCheck; className: string }> = {
  exact: {
    icon: CircleCheck,
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  acceptable: {
    icon: TriangleAlert,
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  incorrect: { icon: CircleX, className: "bg-destructive/15 text-destructive" },
};

/** Colored label for an AI verdict: exact / acceptable / incorrect. */
export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const t = useTranslations("translate.verdict");
  const { icon: Icon, className: tone } = STYLES[verdict];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {t(verdict)}
    </span>
  );
}
