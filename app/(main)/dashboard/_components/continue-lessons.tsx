import { BookOpenText } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { LessonProgressCard } from "@/components/lessons/lesson-progress-card";
import { Button } from "@/components/ui/button";
import type { LessonSummary } from "@/server/queries/lessons";

export async function ContinueLessons({ lessons }: { lessons: LessonSummary[] }) {
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
              <LessonProgressCard lesson={lesson} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
