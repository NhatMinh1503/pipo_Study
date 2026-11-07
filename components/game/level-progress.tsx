import { useTranslations } from "next-intl";

interface LevelProgressProps {
  level: number;
  stars: number;
  /** XP already earned inside the current level (or toward the next star at the cap). */
  xpIntoLevel: number;
  xpToNext: number;
}

/**
 * The learner's level and the progress toward the next one, as computed by the database
 * (wallet_summaries). The bar always has a text label, so it never relies on colour alone.
 */
export function LevelProgress({ level, stars, xpIntoLevel, xpToNext }: LevelProgressProps) {
  const t = useTranslations("game.level");
  const percent = xpToNext > 0 ? Math.min(100, Math.round((xpIntoLevel / xpToNext) * 100)) : 0;

  return (
    <div className="space-y-1.5">
      <p className="flex items-baseline justify-between gap-2 text-xs">
        <span className="mono-value font-semibold">
          {t("badge", { level })}
          {stars > 0 && <span className="ml-1.5 text-warning">{t("stars", { count: stars })}</span>}
        </span>
        <span className="mono-value text-muted-foreground">
          {t("progress", { into: xpIntoLevel, next: xpToNext })}
        </span>
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={xpToNext}
        aria-valuenow={xpIntoLevel}
        aria-label={t("label", { level, into: xpIntoLevel, next: xpToNext })}
        className="h-1.5 w-full overflow-hidden border border-border/60 bg-card"
      >
        <div className="h-full bg-success" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
