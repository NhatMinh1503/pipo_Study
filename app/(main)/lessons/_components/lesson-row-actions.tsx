import { Headphones, Puzzle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import { DeleteLessonButton } from "./delete-lesson-button";

/** Practice shortcuts (dictation, cloze) and delete for one lesson row. */
export function LessonRowActions({ lessonId, title }: { lessonId: string; title: string }) {
  const t = useTranslations("lessons");

  return (
    <div className="flex shrink-0">
      <Button asChild variant="ghost" size="icon-sm">
        <Link href={`/lessons/${lessonId}/dictation`} aria-label={t("dictationAria", { title })}>
          <Headphones aria-hidden />
        </Link>
      </Button>
      <Button asChild variant="ghost" size="icon-sm">
        <Link href={`/lessons/${lessonId}/cloze`} aria-label={t("clozeAria", { title })}>
          <Puzzle aria-hidden />
        </Link>
      </Button>
      <DeleteLessonButton lessonId={lessonId} title={title} />
    </div>
  );
}
