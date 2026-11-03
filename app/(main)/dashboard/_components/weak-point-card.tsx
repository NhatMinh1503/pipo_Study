"use client";

import { Crosshair, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { FormAlert } from "@/components/common/form-alert";
import { Button } from "@/components/ui/button";
import { usePractiseWeakPoints } from "@/hooks/use-practise-weak-points";
import type { ErrorTag } from "@/lib/ai/error-tags";

interface WeakPointCardProps {
  weakPoint: { tag: ErrorTag; count: number } | null;
}

/** The mistake made most often lately, with a one-click micro-lesson. */
export function WeakPointCard({ weakPoint }: WeakPointCardProps) {
  const t = useTranslations();
  const { practise, isPending, error } = usePractiseWeakPoints(weakPoint ? [weakPoint.tag] : []);

  return (
    <section className="sheet-flat flex flex-col gap-3 p-5" aria-labelledby="weak-point-heading">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Crosshair className="size-3.5" aria-hidden />
        <h2 id="weak-point-heading" className="mono-label">
          {t("dashboard.weak.title")}
        </h2>
      </div>
      {weakPoint ? (
        <>
          <p>
            <span className="font-heading text-lg font-bold">
              {t(`analytics.tags.${weakPoint.tag}`)}
            </span>
            <span className="mono-label ml-2">
              {t("dashboard.weak.count", { count: weakPoint.count })}
            </span>
          </p>
          <FormAlert messageKey={error} />
          <div className="mt-auto flex flex-wrap gap-2">
            <Button size="sm" onClick={practise} disabled={isPending}>
              <Sparkles aria-hidden />
              {isPending ? t("analytics.generating") : t("dashboard.weak.practise")}
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/analytics">{t("dashboard.weak.details")}</Link>
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("dashboard.weak.none")}</p>
      )}
    </section>
  );
}
