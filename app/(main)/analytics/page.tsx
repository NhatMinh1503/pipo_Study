import { ChartNoAxesColumn } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { countByTag, countByWeek } from "@/lib/analytics/error-stats";
import { ANALYTICS_WEEKS, listRecentErrorLogs } from "@/server/queries/error-logs";

import { TagBarChart } from "./_components/tag-bar-chart";
import { WeakPoints } from "./_components/weak-points";
import { WeeklyChart } from "./_components/weekly-chart";

export const metadata: Metadata = { title: "Analytics" };

async function AnalyticsContent() {
  const [{ rows, now }, t] = await Promise.all([
    listRecentErrorLogs(),
    getTranslations("analytics"),
  ]);
  const byTag = countByTag(rows);

  return (
    <>
      <PageHeader title={t("title")} description={t("description", { weeks: ANALYTICS_WEEKS })} />
      {byTag.length === 0 ? (
        <EmptyState icon={ChartNoAxesColumn} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
          <div className="space-y-6">
            <TagBarChart data={byTag} />
            <WeeklyChart data={countByWeek(rows, ANALYTICS_WEEKS, now)} />
          </div>
          <WeakPoints top={byTag.slice(0, 3)} />
        </div>
      )}
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-80 border-2 border-border" />}>
        <AnalyticsContent />
      </Suspense>
    </PageContainer>
  );
}
