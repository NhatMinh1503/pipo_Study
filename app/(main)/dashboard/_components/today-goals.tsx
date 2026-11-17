import { CircleCheck, Circle, CircleMinus, Coins, Target } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { applicableGoals, type TodayGoals as TodayGoalsData } from "@/lib/schemas/goals";

interface TodayGoalsProps {
  goals: TodayGoalsData | null;
}

/** How many of today's goals that apply are done, and how many apply. */
export function countGoals(goals: TodayGoalsData | null): { done: number; total: number } {
  if (!goals) return { done: 0, total: 3 };
  const list = applicableGoals(goals);
  return { done: list.filter((goal) => goal.done).length, total: list.length };
}

/**
 * Three small daily habits (PRD engagement goal): translate, review, focus. The server records
 * each goal when it is reached, so a tick never disappears later in the day.
 */
export async function TodayGoals({ goals }: TodayGoalsProps) {
  const t = await getTranslations("dashboard.goals");
  if (!goals) return null;

  const rows = [
    {
      key: "translate",
      href: "/lessons",
      state: goals.translate.done ? "done" : "todo",
      detail: t("translateSentences", {
        count: goals.translate.count,
        target: goals.translate.target,
      }),
    },
    {
      key: "review",
      href: "/review",
      state: !goals.review.applicable ? "skip" : goals.review.done ? "done" : "todo",
      detail: goals.review.applicable
        ? t("reviewProgress", { count: goals.review.count, target: goals.review.target })
        : t("reviewNothing"),
    },
    {
      key: "focus",
      href: "/pomodoro",
      state: goals.focus.done ? "done" : "todo",
      detail: t("focusDetail", { count: goals.focus.count }),
    },
  ] as const;
  const { done, total } = countGoals(goals);

  return (
    <section className="sheet flex flex-col bg-tint-mint" aria-labelledby="today-goals-heading">
      <header className="flex items-center justify-between gap-3 border-b border-dashed border-border/40 px-5 py-3.5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Target className="size-3.5" aria-hidden />
          <h2 id="today-goals-heading" className="mono-label">
            {t("title")}
          </h2>
        </div>
        <span className={done === total ? "pill text-success" : "pill text-foreground"}>
          {t("progress", { done, total })}
        </span>
      </header>
      <ul className="divide-y divide-dashed divide-border/30">
        {rows.map((goal) => {
          const Icon =
            goal.state === "done" ? CircleCheck : goal.state === "skip" ? CircleMinus : Circle;
          const finished = goal.state !== "todo";
          return (
            <li key={goal.key}>
              <Link href={goal.href} className="flex items-center gap-3 px-5 py-3 hover:bg-card/50">
                <Icon
                  className={
                    goal.state === "done"
                      ? "size-5 shrink-0 text-success"
                      : "size-5 shrink-0 text-muted-foreground"
                  }
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={
                      finished
                        ? "block text-sm text-muted-foreground line-through"
                        : "block text-sm font-medium"
                    }
                  >
                    {t(goal.key === "translate" ? "translateGoal" : goal.key)}
                  </span>
                  <span className="block text-xs text-muted-foreground">{goal.detail}</span>
                </span>
                <span className="sr-only">
                  {goal.state === "done"
                    ? t("done")
                    : goal.state === "skip"
                      ? t("skip")
                      : t("todo")}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="flex items-center gap-1.5 border-t border-dashed border-border/40 px-5 py-2.5 text-xs text-muted-foreground">
        <Coins className="size-3.5" aria-hidden />
        {goals.rewarded
          ? t("bonusEarned", { coins: goals.bonusCoins })
          : t("bonusHint", { coins: goals.bonusCoins })}
      </p>
    </section>
  );
}
