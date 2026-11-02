"use client";

import { NotebookPen } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MIN_WORDS_FOR_QUIZ, quizzableItems } from "@/lib/quiz/build-questions";
import { cn } from "@/lib/utils";
import type { VocabItem } from "@/lib/vocab/types";

// Rounds are shuffled with Math.random / Date.now, so render them only in the browser
// (server and client would otherwise produce different orders and fail hydration)
const loading = () => <Skeleton className="mx-auto h-80 max-w-xl border-2 border-border" />;
const ChoiceQuiz = dynamic(() => import("./choice-quiz").then((m) => m.ChoiceQuiz), {
  ssr: false,
  loading,
});
const FillQuiz = dynamic(() => import("./fill-quiz").then((m) => m.FillQuiz), {
  ssr: false,
  loading,
});
const MatchQuiz = dynamic(() => import("./match-quiz").then((m) => m.MatchQuiz), {
  ssr: false,
  loading,
});

const MODES = ["choice", "fill", "match"] as const;
type Mode = (typeof MODES)[number];

export function QuizView({ items }: { items: VocabItem[] }) {
  const t = useTranslations("quiz");
  const [mode, setMode] = useState<Mode>("choice");

  if (quizzableItems(items).length < MIN_WORDS_FOR_QUIZ) {
    return (
      <EmptyState
        icon={NotebookPen}
        title={t("notEnough", { min: MIN_WORDS_FOR_QUIZ })}
        description={t("notEnoughHint")}
        action={
          <Button asChild variant="outline">
            <Link href="/lessons">{t("toLessons")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <div
        className="mx-auto flex w-fit border-2 border-border bg-card"
        role="tablist"
        aria-label={t("modeLabel")}
      >
        {MODES.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "border-r border-dashed border-border/35 px-4 py-2 font-mono text-[0.6875rem] font-semibold tracking-[0.1em] uppercase last:border-r-0",
              mode === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/60",
            )}
          >
            {t(`mode.${value}`)}
          </button>
        ))}
      </div>
      {/* Keyed by mode so switching starts a fresh round */}
      {mode === "choice" && <ChoiceQuiz key="choice" items={items} />}
      {mode === "fill" && <FillQuiz key="fill" items={items} />}
      {mode === "match" && <MatchQuiz key="match" items={items} />}
    </div>
  );
}
