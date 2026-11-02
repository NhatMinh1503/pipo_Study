import { BookOpenText, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import type { LessonProgress } from "../_lib/get-dashboard-data";

export async function ContinueLessons({ lessons }: { lessons: LessonProgress[] }) {
  const t = await getTranslations("dashboard");

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">{t("continueTitle")}</h2>
      {lessons.length === 0 ? (
        <EmptyState
          icon={BookOpenText}
          title={t("continueEmpty")}
          action={
            <Button asChild variant="outline">
              <Link href="/lessons/new">{t("newLesson")}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link
                href={`/lessons/${lesson.id}/translate`}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{lesson.level}</Badge>
                    <span className="truncate font-medium">{lesson.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={lesson.total ? (lesson.done / lesson.total) * 100 : 0}
                      className="h-1.5"
                      aria-label={t("progress", { done: lesson.done, total: lesson.total })}
                    />
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {lesson.done}/{lesson.total}
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
