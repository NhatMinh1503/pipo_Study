import { getTranslations } from "next-intl/server";

interface StatusBandProps {
  streak: number;
  dueCards: number;
  goalsDone: number;
}

/** A dark ruled strip summarising today at a glance, like a ledger's status line. */
export async function StatusBand({ streak, dueCards, goalsDone }: StatusBandProps) {
  const t = await getTranslations("dashboard.band");

  return (
    <section
      aria-label={t("label")}
      className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-2 border-border bg-band px-4 py-2.5 text-band-foreground"
    >
      <span className="mono-label flex items-center gap-2 text-band-foreground">
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
        {t("streak", { count: streak })}
      </span>
      <span className="mono-label text-band-foreground/75">{t("due", { count: dueCards })}</span>
      <span className="mono-label text-band-foreground sm:ml-auto">
        {t("goals", { done: goalsDone, total: 3 })}
      </span>
    </section>
  );
}
