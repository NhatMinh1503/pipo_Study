import { Coins, Flame, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { StatCard } from "@/components/common/stat-card";

import { getDashboardData } from "../_lib/get-dashboard-data";

import { ActivityChart } from "./activity-chart";
import { ContinueLessons } from "./continue-lessons";
import { QuickLinks } from "./quick-links";
import { RecentWords } from "./recent-words";
import { StatusBand } from "./status-band";
import { ReviewDueCard } from "./review-due-card";
import { countGoalsDone, TodayGoals } from "./today-goals";
import { WeakPointCard } from "./weak-point-card";

export async function DashboardContent() {
  const [data, t] = await Promise.all([getDashboardData(), getTranslations("dashboard")]);

  return (
    <>
      <StatusBand
        streak={data.streakCurrent}
        dueCards={data.dueCards}
        goalsDone={countGoalsDone(data.today, data.dueCards)}
      />
      {/* One ruled strip, three figures — not three separate tiles */}
      <section
        aria-label={t("statsLabel")}
        className="sheet grid grid-cols-3 divide-x divide-dashed divide-border/30"
      >
        <StatCard label={t("xp")} value={data.xp} icon={Sparkles} className="bg-tint-mint" />
        <StatCard label={t("coins")} value={data.coins} icon={Coins} className="bg-tint-sand" />
        <StatCard
          label={t("streak")}
          value={data.streakCurrent}
          icon={Flame}
          className="bg-tint-blush"
          hint={t("streakBest", { count: data.streakBest })}
        />
      </section>
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr] lg:items-start">
        <ReviewDueCard count={data.dueCards} />
        <ContinueLessons lessons={data.inProgress} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr] lg:items-start">
        <TodayGoals today={data.today} dueCards={data.dueCards} />
        <ActivityChart activity={data.activity} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <RecentWords words={data.recentWords} />
        <WeakPointCard weakPoint={data.weakPoint} />
      </div>
      <QuickLinks />
    </>
  );
}
