"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { RATINGS } from "@/lib/srs/schedule";

import type { RatingCounts } from "../_hooks/use-review-session";

interface ReviewSummaryProps {
  counts: RatingCounts;
  total: number;
  /** True while the last ratings are still being saved; leaving now would lose them. */
  isSaving?: boolean;
  /** XP from clearing today's due queue, when this session earned it. */
  clearBonusXp?: number;
}

/** End of a review session (or nothing due): how each card was rated. */
export function ReviewSummary({
  counts,
  total,
  isSaving = false,
  clearBonusXp = 0,
}: ReviewSummaryProps) {
  const t = useTranslations("review");

  return (
    <section className="sheet-tight mx-auto flex w-full max-w-md flex-col items-center gap-6 p-8 text-center">
      <span className="flex size-12 items-center justify-center border border-border/35 text-success">
        <CircleCheck className="size-5" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <h2 className="font-heading text-xl leading-tight font-bold tracking-tight">
          {total > 0 ? t("doneTitle") : t("nothingDue")}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {total > 0 ? t("doneDescription", { count: total }) : t("nothingDueHint")}
        </p>
      </div>
      {total > 0 && (
        <dl className="grid w-full grid-cols-4 divide-x divide-dashed divide-border/30 border-2 border-border">
          {RATINGS.map((rating) => (
            <div key={rating} className="px-1.5 py-2.5">
              <dt className="mono-label text-[0.5625rem]">{t(`rating.${rating}`)}</dt>
              <dd className="mono-value mt-1 text-lg font-semibold">{counts[rating]}</dd>
            </div>
          ))}
        </dl>
      )}
      {clearBonusXp > 0 && (
        <p className="pill text-success" role="status">
          {t("clearBonus", { xp: clearBonusXp })}
        </p>
      )}
      {isSaving ? (
        <p className="mono-label" role="status">
          {t("saving")}
        </p>
      ) : (
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href="/lessons">{t("toLessons")}</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/dashboard">{t("toDashboard")}</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
