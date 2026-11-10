"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useLevelSummary } from "@/lib/api/use-level-summary";

/**
 * The level bar filling up by what this sentence earned: it starts where the learner was
 * before the award and slides to where they are now. If the award crossed a level, it fills
 * from empty in the new level (the level-up moment tells the rest).
 */
export function XpGainBar({ awarded }: { awarded: number }) {
  const t = useTranslations("game.level");
  const { data: summary, isFetching } = useLevelSummary();
  const [filled, setFilled] = useState(false);

  const ready = summary !== undefined && summary !== null && !isFetching;
  useEffect(() => {
    if (!ready) return;
    // Next frame, so the browser paints the "before" width and transitions to "after"
    const frame = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  if (!ready || summary.xpToNext <= 0) return null;
  const { level, xpIntoLevel, xpToNext } = summary;
  const before = Math.max(0, xpIntoLevel - awarded);
  const percent = (value: number) => `${Math.min(100, (value / xpToNext) * 100)}%`;

  return (
    <div className="space-y-1">
      <p className="mono-value flex justify-between text-xs font-semibold">
        <span>{t("badge", { level })}</span>
        <span className="text-muted-foreground">
          {t("progress", { into: xpIntoLevel, next: xpToNext })}
        </span>
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={xpToNext}
        aria-valuenow={xpIntoLevel}
        aria-label={t("label", { level, into: xpIntoLevel, next: xpToNext })}
        className="h-4 w-full border-[3px] border-[#17150f] bg-white"
      >
        {/* gold fill slides from where the learner was to where they are now */}
        <div
          className="h-full border-r-[3px] border-[#17150f] bg-[#f2b731] transition-[width] delay-300 duration-1000 ease-out motion-reduce:transition-none"
          style={{ width: percent(filled ? xpIntoLevel : before) }}
        />
      </div>
    </div>
  );
}
