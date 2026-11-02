import { useTranslations } from "next-intl";

import type { DiffSegment } from "@/lib/diff";
import type { LearningLanguage } from "@/lib/schemas/common";
import { cn } from "@/lib/utils";

const STYLE: Record<DiffSegment["kind"], string> = {
  equal: "text-emerald-700 dark:text-emerald-400",
  missing: "bg-amber-500/20 text-amber-800 underline decoration-dotted dark:text-amber-300",
  extra: "bg-destructive/15 text-destructive line-through",
};

/** Colored comparison: green = right, amber underline = missed, red strike = extra. */
export function DiffView({
  segments,
  language,
}: {
  segments: DiffSegment[];
  language: LearningLanguage;
}) {
  const t = useTranslations("dictation.legend");

  return (
    <div className="space-y-2">
      <p lang={language} className="text-lg leading-relaxed">
        {segments.map((segment, index) => (
          <span key={index} className={cn("px-0.5", STYLE[segment.kind])} title={t(segment.kind)}>
            {segment.text}
            {language === "en" ? " " : ""}
          </span>
        ))}
      </p>
      <p className="flex gap-4 text-xs text-muted-foreground">
        <span className={STYLE.equal}>{t("equal")}</span>
        <span className={STYLE.missing}>{t("missing")}</span>
        <span className={STYLE.extra}>{t("extra")}</span>
      </p>
    </div>
  );
}
