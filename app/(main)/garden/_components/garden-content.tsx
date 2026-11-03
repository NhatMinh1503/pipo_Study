import { Clock, Sprout, TreeDeciduous, TreePalm, TreePine, Trees } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import { SHOP_ITEMS, isShopItemId } from "@/lib/shop/catalog";
import { getGardenTrees } from "@/server/queries/garden";
import { getOwnedItemIds } from "@/server/queries/shop";

// A 50-minute session grows a bigger tree; the species varies so the garden looks alive
const SPECIES = [TreeDeciduous, TreePine, TreePalm, Trees] as const;

export async function GardenContent() {
  const [trees, owned, t, format] = await Promise.all([
    getGardenTrees(),
    getOwnedItemIds(),
    getTranslations("garden"),
    getFormatter(),
  ]);
  const totalMinutes = trees.reduce((sum, tree) => sum + tree.minutes, 0);
  const decorations = owned.flatMap((id) => {
    const item = isShopItemId(id) ? SHOP_ITEMS[id] : null;
    return item && "emoji" in item ? [{ id, emoji: item.emoji }] : [];
  });

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
        <StatCard label={t("trees")} value={trees.length} icon={Sprout} />
        <StatCard
          label={t("focusTime")}
          value={t("minutes", { count: totalMinutes })}
          icon={Clock}
        />
      </section>

      {decorations.length > 0 && (
        <p className="flex gap-3 text-3xl" aria-label={t("decorations")}>
          {decorations.map((decoration) => (
            <span key={decoration.id} role="img" aria-label={decoration.id}>
              {decoration.emoji}
            </span>
          ))}
        </p>
      )}

      {trees.length === 0 ? (
        <EmptyState icon={Sprout} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <ul className="grid grid-cols-5 gap-2 border-2 border-border bg-card p-3 sm:grid-cols-8">
          {trees.map((tree, index) => {
            const Tree = SPECIES[index % SPECIES.length] ?? TreeDeciduous;
            return (
              <li
                key={tree.id}
                className="flex aspect-square items-center justify-center border border-dashed border-border/25 bg-success/[0.07] transition-colors hover:bg-success/[0.14]"
                title={format.dateTime(new Date(tree.plantedAt), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              >
                <Tree
                  className={tree.minutes >= 50 ? "size-9 text-success" : "size-6 text-success"}
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
