import { Swords } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { listRecentBattles } from "@/server/queries/battles";

import { FindBattleButton } from "./find-battle-button";

export async function BattleLobby() {
  const [battles, t, format] = await Promise.all([
    listRecentBattles(),
    getTranslations("battle"),
    getFormatter(),
  ]);

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<FindBattleButton />}
      />
      <section className="space-y-3">
        <h2 className="mono-label">{t("history")}</h2>
        {battles.length === 0 ? (
          <EmptyState icon={Swords} title={t("noHistory")} />
        ) : (
          <ul className="sheet-flat divide-y divide-dashed divide-border/30">
            {battles.map((battle) => (
              <li key={battle.id}>
                <Link
                  href={`/battle/${battle.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/60"
                >
                  <span className="truncate">
                    {t(`outcome.${battle.outcome}`)}
                    {battle.opponentName && (
                      <span className="text-muted-foreground"> · {battle.opponentName}</span>
                    )}
                  </span>
                  <span className="mono-label shrink-0">
                    {format.dateTime(new Date(battle.createdAt), { dateStyle: "medium" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
