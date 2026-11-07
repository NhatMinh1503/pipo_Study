"use client";

import { useTranslations } from "next-intl";

import type { SentenceXp } from "@/lib/schemas/translation";

/**
 * What this sentence earned. When the daily cap for the learner's own lessons cut it, say so
 * plainly (never a silent 0 XP) and that the streak still counts (xp-levels §3.6, §7).
 */
export function SentenceXpNote({ xp }: { xp: SentenceXp }) {
  const t = useTranslations("translate.xp");

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {xp.awarded > 0 && (
        <span className="pill text-success">{t("earned", { xp: xp.awarded })}</span>
      )}
      {xp.capped && (
        <span className="bg-tint-sand px-2 py-1">
          <span className="font-medium">{t("capped")}</span>
          <span className="text-muted-foreground"> · {t("streakKept")}</span>
        </span>
      )}
    </div>
  );
}
