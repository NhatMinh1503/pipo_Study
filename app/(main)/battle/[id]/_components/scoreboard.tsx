import { useTranslations } from "next-intl";

import { UserAvatar } from "@/components/common/user-avatar";
import type { BattlePlayer } from "@/lib/api/use-battle";
import { cn } from "@/lib/utils";

interface ScoreboardProps {
  me: BattlePlayer;
  opponent: BattlePlayer | null;
  opponentOnline: boolean;
  total: number;
}

export function Scoreboard({ me, opponent, opponentOnline, total }: ScoreboardProps) {
  const t = useTranslations("battle");

  const row = (player: BattlePlayer, label: string, online: boolean) => (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="relative">
        <UserAvatar name={player.name} url={player.avatarUrl} />
        <span
          className={cn(
            "absolute -right-0.5 -bottom-0.5 size-2.5 border border-card",
            online ? "bg-success" : "bg-muted-foreground",
          )}
          aria-hidden
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{player.name ?? label}</span>
        <span className="mono-label">
          {t("progress", { answered: player.answered, total })}
          {!online && ` · ${t("offline")}`}
        </span>
      </span>
      <span className="mono-value text-xl font-bold">{player.score}</span>
    </div>
  );

  return (
    <section
      aria-label={t("scoreboard")}
      className="sheet-flat grid divide-y divide-dashed divide-border/30 sm:grid-cols-2 sm:divide-x sm:divide-y-0"
    >
      {row(me, t("you"), true)}
      {opponent ? (
        row(opponent, t("opponent"), opponentOnline)
      ) : (
        <p className="mono-label px-4 py-3">{t("noOpponent")}</p>
      )}
    </section>
  );
}
