import { Clock, Sprout } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import { getCompletedSessions, getGardenScene } from "@/server/queries/garden";

import { GardenView } from "./garden-view";

export async function GardenContent() {
  const [scene, sessions, t] = await Promise.all([
    getGardenScene(),
    getCompletedSessions(),
    getTranslations("garden"),
  ]);
  const totalMinutes = sessions.reduce((sum, session) => sum + session.minutes, 0);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild>
            <Link href="/pomodoro">{t("plant")}</Link>
          </Button>
        }
      />
      <section
        aria-label={t("statsLabel")}
        className="grid grid-cols-2 divide-x divide-dashed divide-border/30 border-2 border-border bg-card"
      >
        <StatCard label={t("trees")} value={scene.totalTrees} icon={Sprout} />
        <StatCard
          label={t("focusTime")}
          value={t("minutes", { count: totalMinutes })}
          icon={Clock}
        />
      </section>

      <GardenView scene={scene} />

      {scene.totalTrees === 0 && (
        <EmptyState icon={Sprout} title={t("empty")} description={t("emptyHint")} />
      )}
    </>
  );
}
