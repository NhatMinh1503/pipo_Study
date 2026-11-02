"use client";

import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

interface QuizResultProps {
  correct: number;
  total: number;
  /** Extra line, e.g. the time for the matching game. */
  detail?: string;
  onRestart: () => void;
}

export function QuizResult({ correct, total, detail, onRestart }: QuizResultProps) {
  const t = useTranslations("quiz");
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);

  return (
    <section
      className="sheet mx-auto flex w-full max-w-md flex-col items-center gap-5 p-8 text-center"
      role="status"
    >
      <Trophy className="size-8 text-amber-500" aria-hidden />
      <p className="mono-label">{t("resultLabel")}</p>
      <p className="mono-value text-5xl font-bold">{percent}%</p>
      <p className="text-sm text-muted-foreground">{t("resultSummary", { correct, total })}</p>
      {detail && <p className="mono-label">{detail}</p>}
      <Button onClick={onRestart} className="w-full">
        {t("restart")}
      </Button>
    </section>
  );
}
