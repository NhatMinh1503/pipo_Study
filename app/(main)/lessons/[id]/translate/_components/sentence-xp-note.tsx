"use client";

import { useTranslations } from "next-intl";

import type { SentenceXp } from "@/lib/schemas/translation";

import { XpGainBar } from "./xp-gain-bar";

/**
 * What this sentence earned: a "+N XP" badge pops up and floats away while the level bar
 * fills by the same amount. When the daily cap for the learner's own lessons cut it, say so
 * plainly (never a silent 0 XP) and that the streak still counts (xp-levels §3.6, §7).
 */
export function SentenceXpNote({ xp }: { xp: SentenceXp }) {
  const t = useTranslations("translate.xp");

  return (
    <div className="space-y-2">
      {xp.awarded > 0 && (
        <span
          aria-hidden
          className="anim-xp-float pointer-events-none absolute -top-7 right-5 border-[3px] border-[#17150f] bg-[#f2b731] px-3.5 py-0.5 font-display text-3xl text-[#17150f] shadow-[4px_4px_0_0_#17150f]"
        >
          {t("earned", { xp: xp.awarded })}
        </span>
      )}
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
      {xp.awarded > 0 && <XpGainBar awarded={xp.awarded} />}
    </div>
  );
}
