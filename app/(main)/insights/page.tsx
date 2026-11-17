import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { z } from "zod";

import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Insights" };

const cohortSchema = z.object({ cohort: z.number(), returned: z.number() });
const kpiSchema = z.object({
  signups: z.number(),
  activeLearners: z.number(),
  d1: cohortSchema,
  d7: cohortSchema,
  translateSessionsPerActiveDay: z.number(),
  focusSessionsPerActiveDay: z.number(),
  gradingCalls: z.number(),
  gradingP50Ms: z.number().nullable(),
  gradingP95Ms: z.number().nullable(),
  gradingFailed: z.number(),
  gradedAttempts: z.number(),
  flaggedAttempts: z.number(),
});

/** PRD §3 targets. */
const TARGETS = { d7: 0.4, translate: 2, focus: 1, p95Ms: 1500, accuracy: 0.95 };

const percent = (part: number, whole: number) => (whole > 0 ? part / whole : null);

async function InsightsContent() {
  const supabase = await createClient();
  const [{ data: isStaff }, t] = await Promise.all([
    supabase.rpc("is_moderator"),
    getTranslations("insights"),
  ]);
  if (!isStaff) notFound();
  const { data } = await supabase.rpc("kpi_summary", { p_days: 30 });
  const kpi = kpiSchema.safeParse(data).data;
  if (!kpi) return <p className="text-sm text-destructive">{t("failed")}</p>;

  const d7 = percent(kpi.d7.returned, kpi.d7.cohort);
  const accuracy = kpi.gradedAttempts > 0 ? 1 - kpi.flaggedAttempts / kpi.gradedAttempts : null;
  const rows = [
    {
      key: "d7",
      value: d7 === null ? "—" : `${Math.round(d7 * 100)}% (${kpi.d7.returned}/${kpi.d7.cohort})`,
      met: d7 !== null && d7 > TARGETS.d7,
    },
    {
      key: "d1",
      value:
        kpi.d1.cohort === 0
          ? "—"
          : `${Math.round((kpi.d1.returned / kpi.d1.cohort) * 100)}% (${kpi.d1.returned}/${kpi.d1.cohort})`,
      met: null,
    },
    {
      key: "translate",
      value: String(kpi.translateSessionsPerActiveDay),
      met: kpi.translateSessionsPerActiveDay >= TARGETS.translate,
    },
    {
      key: "focus",
      value: String(kpi.focusSessionsPerActiveDay),
      met: kpi.focusSessionsPerActiveDay >= TARGETS.focus,
    },
    {
      key: "latency",
      value:
        kpi.gradingP95Ms === null
          ? "—"
          : `p50 ${Math.round(kpi.gradingP50Ms ?? 0)} ms · p95 ${Math.round(kpi.gradingP95Ms)} ms`,
      met: kpi.gradingP95Ms !== null && kpi.gradingP95Ms < TARGETS.p95Ms,
    },
    {
      key: "accuracy",
      value:
        accuracy === null
          ? "—"
          : `${(accuracy * 100).toFixed(1)}% (${kpi.flaggedAttempts}/${kpi.gradedAttempts})`,
      met: accuracy !== null && accuracy > TARGETS.accuracy,
    },
  ] as const;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <p className="mono-label">
        {t("summary", {
          signups: kpi.signups,
          active: kpi.activeLearners,
          calls: kpi.gradingCalls,
          failed: kpi.gradingFailed,
        })}
      </p>
      <dl className="sheet-flat divide-y divide-dashed divide-border/30">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <dt className="min-w-0 flex-1">
              <p className="font-medium">{t(`rows.${row.key}.label`)}</p>
              <p className="text-xs text-muted-foreground">{t(`rows.${row.key}.target`)}</p>
            </dt>
            <dd className="mono-value font-semibold">{row.value}</dd>
            {row.met !== null && (
              <span className={cn("pill", row.met ? "text-success" : "text-destructive")}>
                {row.met ? t("met") : t("notMet")}
              </span>
            )}
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">{t("note")}</p>
    </>
  );
}

export default function InsightsPage() {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-96 border-2 border-border" />}>
        <InsightsContent />
      </Suspense>
    </PageContainer>
  );
}
