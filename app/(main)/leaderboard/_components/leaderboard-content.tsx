import { Medal, Trophy } from "lucide-react";
import { z } from "zod";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { UserAvatar } from "@/components/common/user-avatar";
import { avatarUrl } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth";

const METRICS = ["xp", "streak", "focus"] as const;
const PERIODS = ["week", "month"] as const;

const personalBestsSchema = z.object({
  bestWeekXp: z.number(),
  bestWeekFocus: z.number(),
  bestStreak: z.number(),
});

interface LeaderboardContentProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function LeaderboardContent({ searchParams }: LeaderboardContentProps) {
  const [query, user, t] = await Promise.all([
    searchParams,
    requireUser(),
    getTranslations("leaderboard"),
  ]);
  const metric = METRICS.find((value) => value === query.metric) ?? "xp";
  const period = PERIODS.find((value) => value === query.period) ?? "week";

  const supabase = await createClient();
  const args = { p_metric: metric, p_period: period };
  const [{ data: rows }, { data: mine }, { data: bests }] = await Promise.all([
    supabase.rpc("leaderboard", args),
    supabase.rpc("my_leaderboard_rank", args),
    supabase.rpc("leaderboard_personal_bests"),
  ]);
  const myRank = mine?.[0];
  const best = personalBestsSchema.safeParse(bests).data;
  const bestValue =
    metric === "xp"
      ? best?.bestWeekXp
      : metric === "focus"
        ? best?.bestWeekFocus
        : best?.bestStreak;

  const tab = (active: boolean) =>
    cn(
      "border-r border-dashed border-border/35 px-3 py-2 font-mono text-[0.6875rem] font-semibold tracking-[0.1em] uppercase last:border-r-0",
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60",
    );

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <div className="flex flex-wrap gap-3">
        <nav className="flex border-2 border-border bg-card" aria-label={t("metricLabel")}>
          {METRICS.map((value) => (
            <Link
              key={value}
              href={`/leaderboard?metric=${value}&period=${period}`}
              aria-current={value === metric ? "page" : undefined}
              className={tab(value === metric)}
            >
              {t(`metric.${value}`)}
            </Link>
          ))}
        </nav>
        {metric !== "streak" && (
          <nav className="flex border-2 border-border bg-card" aria-label={t("periodLabel")}>
            {PERIODS.map((value) => (
              <Link
                key={value}
                href={`/leaderboard?metric=${metric}&period=${value}`}
                aria-current={value === period ? "page" : undefined}
                className={tab(value === period)}
              >
                {t(`period.${value}`)}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <p className="mono-label">{metric === "streak" ? t("resetStreak") : t(`reset.${period}`)}</p>

      <section
        aria-label={t("mine.label")}
        className="sheet-flat grid grid-cols-2 divide-x divide-dashed divide-border/30 bg-tint-sand"
      >
        <div className="px-4 py-3">
          <p className="mono-label">{t("mine.rank")}</p>
          <p className="mono-value text-xl font-bold">
            {myRank?.rank ? t("mine.position", { rank: myRank.rank, total: myRank.total }) : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(`unit.${metric}`, { count: Number(myRank?.value ?? 0) })}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="mono-label flex items-center gap-1.5">
            <Medal className="size-3.5" aria-hidden />
            {t(`mine.best.${metric}`)}
          </p>
          <p className="mono-value text-xl font-bold">
            {t(`unit.${metric}`, { count: Number(bestValue ?? 0) })}
          </p>
        </div>
      </section>

      {!rows?.length ? (
        <EmptyState icon={Trophy} title={t("empty")} />
      ) : (
        <ol className="sheet-flat divide-y divide-dashed divide-border/30">
          {rows.map((row) => {
            const me = row.user_id === user.id;
            return (
              <li
                key={row.user_id}
                aria-current={me ? "true" : undefined}
                className={cn("flex items-center gap-3 px-4 py-3", me && "bg-primary/10")}
              >
                <span className="mono-value w-8 text-right font-bold">{row.rank}</span>
                <UserAvatar name={row.display_name} url={avatarUrl(row.avatar_path)} />
                <span className="flex-1 truncate">
                  {row.display_name ?? t("anonymous")}
                  {me && <span className="mono-label ml-2">{t("you")}</span>}
                </span>
                <span className="mono-value font-semibold">
                  {t(`unit.${metric}`, { count: Number(row.value) })}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {rows?.length && !rows.some((row) => row.user_id === user.id) ? (
        <p className="mono-label text-center">{t("notRanked")}</p>
      ) : null}
    </>
  );
}
