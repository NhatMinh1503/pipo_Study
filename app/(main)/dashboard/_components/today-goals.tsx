import { CircleCheck, Circle, Target } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { TodayGoals as TodayGoalsData } from "../_lib/get-dashboard-data";

interface TodayGoalsProps {
  today: TodayGoalsData;
  dueCards: number;
}

/** Three small daily habits (PRD engagement goal): translate, review, focus. */
export async function TodayGoals({ today, dueCards }: TodayGoalsProps) {
  const t = await getTranslations("dashboard.goals");
  const goals = [
    {
      key: "translate",
      href: "/lessons",
      done: today.lessonsCompleted > 0,
      detail: t("translateDetail", { count: today.lessonsCompleted }),
    },
    {
      key: "review",
      href: "/review",
      done: dueCards === 0,
      detail:
        dueCards > 0
          ? t("reviewLeft", { count: dueCards })
          : t("reviewDetail", { count: today.cardsReviewed }),
    },
    {
      key: "focus",
      href: "/pomodoro",
      done: today.focusSessions > 0,
      detail: t("focusDetail", { count: today.focusSessions }),
    },
  ] as const;
  const doneCount = goals.filter((goal) => goal.done).length;

  return (
    <section className="sheet-flat flex flex-col" aria-labelledby="today-goals-heading">
      <header className="flex items-center justify-between gap-3 border-b border-dashed border-border/40 px-5 py-3.5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Target className="size-3.5" aria-hidden />
          <h2 id="today-goals-heading" className="mono-label">
            {t("title")}
          </h2>
        </div>
        <span className="mono-value text-sm font-semibold">
          {t("progress", { done: doneCount, total: goals.length })}
        </span>
      </header>
      <ul className="divide-y divide-dashed divide-border/30">
        {goals.map((goal) => {
          const Icon = goal.done ? CircleCheck : Circle;
          return (
            <li key={goal.key}>
              <Link
                href={goal.href}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40"
              >
                <Icon
                  className={
                    goal.done
                      ? "size-5 shrink-0 text-success"
                      : "size-5 shrink-0 text-muted-foreground"
                  }
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={
                      goal.done
                        ? "block text-sm text-muted-foreground line-through"
                        : "block text-sm font-medium"
                    }
                  >
                    {t(goal.key)}
                  </span>
                  <span className="block text-xs text-muted-foreground">{goal.detail}</span>
                </span>
                <span className="sr-only">{goal.done ? t("done") : t("todo")}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
