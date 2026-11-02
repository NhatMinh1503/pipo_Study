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
}

/** End of a review session (or nothing due): how each card was rated. */
export function ReviewSummary({ counts, total, isSaving = false }: ReviewSummaryProps) {
  const t = useTranslations("review");

  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 text-center">
      <CircleCheck className="size-10 text-emerald-500" aria-hidden />
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">{total > 0 ? t("doneTitle") : t("nothingDue")}</h2>
        <p className="text-sm text-muted-foreground">
          {total > 0 ? t("doneDescription", { count: total }) : t("nothingDueHint")}
        </p>
      </div>
      {total > 0 && (
        <dl className="grid w-full grid-cols-4 gap-2 text-sm">
          {RATINGS.map((rating) => (
            <div key={rating} className="rounded-lg bg-muted/60 p-2">
              <dt className="text-muted-foreground">{t(`rating.${rating}`)}</dt>
              <dd className="text-lg font-semibold tabular-nums">{counts[rating]}</dd>
            </div>
          ))}
        </dl>
      )}
      {isSaving ? (
        <p className="text-sm text-muted-foreground" role="status">
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
