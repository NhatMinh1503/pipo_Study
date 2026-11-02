import { BookOpenText } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { LessonProgressCard } from "@/components/lessons/lesson-progress-card";
import { Button } from "@/components/ui/button";
import { listLessonsWithProgress } from "@/server/queries/lessons";

import { LessonRowActions } from "./lesson-row-actions";

export async function LessonsList() {
  const [lessons, t] = await Promise.all([listLessonsWithProgress(), getTranslations("lessons")]);

  if (lessons.length === 0) {
    return (
      <EmptyState
        icon={BookOpenText}
        title={t("empty")}
        description={t("emptyHint")}
        action={
          <Button asChild>
            <Link href="/lessons/new">{t("new")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="sheet-flat divide-y divide-dashed divide-border/30">
      {lessons.map((lesson) => (
        <li key={lesson.id}>
          <LessonProgressCard
            lesson={lesson}
            actions={<LessonRowActions lessonId={lesson.id} title={lesson.title} />}
          />
        </li>
      ))}
    </ul>
  );
}
