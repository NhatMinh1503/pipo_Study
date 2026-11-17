import { Snowflake } from "lucide-react";
import { getTranslations } from "next-intl/server";

interface StatusBandProps {
  streak: number;
  dueCards: number;
  goals: { done: number; total: number };
  /** Streak freezes held; each one covers a missed day. */
  freezes: number;
}

/** A dark ruled strip summarising today at a glance, like a ledger's status line. */
export async function StatusBand({ streak, dueCards, goals, freezes }: StatusBandProps) {
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
      {freezes > 0 && (
        <span className="mono-label flex items-center gap-1.5 text-band-foreground/75">
          <Snowflake className="size-3" aria-hidden />
          {t("freezes", { count: freezes })}
        </span>
      )}
      <span className="mono-label text-band-foreground/75">{t("due", { count: dueCards })}</span>
      <span className="mono-label text-band-foreground sm:ml-auto">
        {t("goals", { done: goals.done, total: goals.total })}
      </span>
    </section>
  );
}
