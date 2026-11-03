import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { LessonSummary } from "@/server/queries/lessons";

interface LessonProgressCardProps {
  lesson: Pick<LessonSummary, "id" | "title" | "level" | "done" | "total" | "completedAt">;
  /** Extra controls (e.g. delete) rendered outside the link. */
  actions?: React.ReactNode;
}

/**
 * Lesson row with title, level and translation progress; links to the translate
 * page. Rows carry no edge of their own — the list owns the container and rules.
 */
export function LessonProgressCard({ lesson, actions }: LessonProgressCardProps) {
  const t = useTranslations("lessons");
  const percent = lesson.total ? (lesson.done / lesson.total) * 100 : 0;

  return (
    <div className="flex items-center gap-1 pr-1 transition-colors hover:bg-muted/40">
      <Link
        href={`/lessons/${lesson.id}/translate`}
        className="flex min-w-0 flex-1 items-center gap-4 px-3 py-3.5"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{lesson.level}</Badge>
            <span className="truncate font-medium">{lesson.title}</span>
            {lesson.completedAt && <Badge variant="outline">{t("completed")}</Badge>}
          </div>
          <div className="flex items-center gap-3">
            <Progress
              value={percent}
              className="h-1.5 max-w-52"
              aria-label={t("progress", { done: lesson.done, total: lesson.total })}
            />
            <span className="shrink-0 font-mono text-[0.6875rem] tracking-[0.06em] text-muted-foreground tabular-nums">
              {lesson.done}/{lesson.total}
            </span>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
      {actions}
    </div>
  );
}
