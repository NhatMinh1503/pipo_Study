import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

interface PracticeSummaryProps {
  lessonId: string;
  percent: number;
  detail: string;
}

/** End screen shared by the dictation and cloze practice of a lesson. */
export function PracticeSummary({ lessonId, percent, detail }: PracticeSummaryProps) {
  const t = useTranslations("practice");

  return (
    <section
      className="sheet mx-auto flex w-full max-w-md flex-col items-center gap-4 p-8 text-center"
      role="status"
    >
      <CircleCheck className="size-8 text-emerald-500" aria-hidden />
      <p className="mono-label">{t("score")}</p>
      <p className="mono-value text-5xl font-bold">{percent}%</p>
      <p className="text-sm text-muted-foreground">{detail}</p>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Button asChild className="flex-1">
          <Link href={`/lessons/${lessonId}/translate`}>{t("backToLesson")}</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/lessons">{t("allLessons")}</Link>
        </Button>
      </div>
    </section>
  );
}
