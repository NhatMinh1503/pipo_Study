import { Clock, Sprout, TreeDeciduous, TreePalm, TreePine, Trees } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import { getGardenTrees } from "@/server/queries/garden";

// A 50-minute session grows a bigger tree; the species varies so the garden looks alive
const SPECIES = [TreeDeciduous, TreePine, TreePalm, Trees] as const;

export async function GardenContent() {
  const [trees, t, format] = await Promise.all([
    getGardenTrees(),
    getTranslations("garden"),
    getFormatter(),
  ]);
  const totalMinutes = trees.reduce((sum, tree) => sum + tree.minutes, 0);

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
      <section aria-label={t("statsLabel")} className="grid grid-cols-2 gap-3">
        <StatCard label={t("trees")} value={trees.length} icon={Sprout} />
        <StatCard
          label={t("focusTime")}
          value={t("minutes", { count: totalMinutes })}
          icon={Clock}
        />
      </section>

      {trees.length === 0 ? (
        <EmptyState icon={Sprout} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <ul className="grid grid-cols-5 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-8">
          {trees.map((tree, index) => {
            const Tree = SPECIES[index % SPECIES.length] ?? TreeDeciduous;
            return (
              <li
                key={tree.id}
                className="flex aspect-square items-center justify-center rounded-xl bg-emerald-500/10"
                title={format.dateTime(new Date(tree.plantedAt), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              >
                <Tree
                  className={
                    tree.minutes >= 50 ? "size-9 text-emerald-600" : "size-6 text-emerald-500"
                  }
                  aria-label={t("treeLabel", { minutes: tree.minutes })}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
