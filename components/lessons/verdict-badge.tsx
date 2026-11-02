import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Verdict } from "@/lib/schemas/translation";
import { cn } from "@/lib/utils";

const STYLES: Record<Verdict, { icon: typeof CircleCheck; className: string }> = {
  exact: { icon: CircleCheck, className: "border-success/45 bg-success/10 text-success" },
  acceptable: { icon: TriangleAlert, className: "border-warning/45 bg-warning/10 text-warning" },
  incorrect: {
    icon: CircleX,
    className: "border-destructive/45 bg-destructive/10 text-destructive",
  },
};

/** Stamped label for an AI verdict: exact / acceptable / incorrect. */
export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const t = useTranslations("translate.verdict");
  const { icon: Icon, className: tone } = STYLES[verdict];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-[0.1em] uppercase",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {t(verdict)}
    </span>
  );
}
