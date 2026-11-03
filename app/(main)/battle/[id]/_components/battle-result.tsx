import { Trophy } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { BattleState } from "@/lib/api/use-battle";

/** End screen: who won, final scores, and a way back to the lobby. */
export function BattleResult({ state, userId }: { state: BattleState; userId: string }) {
  const t = useTranslations("battle");
  const outcome = !state.winnerId ? "draw" : state.winnerId === userId ? "won" : "lost";

  return (
    <section className="sheet space-y-5 p-6 text-center" aria-live="polite">
      <Trophy className="mx-auto size-10 text-primary" aria-hidden />
      <h2 className="font-heading text-2xl font-bold">{t(`outcome.${outcome}`)}</h2>
      <ul className="mx-auto max-w-xs divide-y divide-dashed divide-border/30">
        {state.players.map((player) => (
          <li key={player.userId} className="flex justify-between gap-3 py-2">
            <span className="truncate">
              {player.userId === userId ? t("you") : (player.name ?? t("opponent"))}
            </span>
            <span className="mono-value font-semibold">{player.score}</span>
          </li>
        ))}
      </ul>
      <Button asChild>
        <Link href="/battle">{t("backToLobby")}</Link>
      </Button>
    </section>
  );
}
