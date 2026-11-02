"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { buildChoiceQuestions } from "@/lib/quiz/build-questions";
import { cn } from "@/lib/utils";
import type { VocabItem } from "@/lib/vocab/types";

import { QuizResult } from "./quiz-result";

const QUESTION_COUNT = 10;

/** Show a word, pick its meaning from four options (keys 1–4 also work). */
export function ChoiceQuiz({ items }: { items: VocabItem[] }) {
  const t = useTranslations("quiz");
  const [questions, setQuestions] = useState(() => buildChoiceQuestions(items, QUESTION_COUNT));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);

  const question = questions[index];

  const pick = (choice: string) => {
    if (!question || picked !== null) return;
    setPicked(choice);
    if (choice === question.answer) setCorrect((value) => value + 1);
  };
  const next = () => {
    setPicked(null);
    setIndex((value) => value + 1);
  };
  const restart = () => {
    setQuestions(buildChoiceQuestions(items, QUESTION_COUNT));
    setIndex(0);
    setPicked(null);
    setCorrect(0);
  };

  useHotkeys(
    {
      "1": () => question?.choices[0] && pick(question.choices[0]),
      "2": () => question?.choices[1] && pick(question.choices[1]),
      "3": () => question?.choices[2] && pick(question.choices[2]),
      "4": () => question?.choices[3] && pick(question.choices[3]),
      Enter: () => picked !== null && next(),
    },
    Boolean(question),
  );

  if (!question)
    return <QuizResult correct={correct} total={questions.length} onRestart={restart} />;

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <p className="mono-label text-center">
        {t("progress", { current: index + 1, total: questions.length })}
      </p>
      <div className="sheet p-8 text-center">
        <p lang={question.item.language} className="font-heading text-4xl font-bold">
          {question.item.term}
        </p>
        {question.item.reading && (
          <p className="mt-2 text-muted-foreground">{question.item.reading}</p>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={t("chooseMeaning")}>
        {question.choices.map((choice, choiceIndex) => {
          const isAnswer = choice === question.answer;
          const isPicked = choice === picked;
          return (
            <button
              key={choice}
              type="button"
              disabled={picked !== null}
              onClick={() => pick(choice)}
              className={cn(
                "flex items-center gap-3 border-2 border-border bg-card px-4 py-3 text-left transition-colors",
                "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none enabled:hover:bg-muted/40",
                picked !== null && isAnswer && "border-emerald-500 bg-emerald-500/10",
                isPicked && !isAnswer && "border-destructive bg-destructive/10",
              )}
            >
              <kbd className="mono-label">{choiceIndex + 1}</kbd>
              <span className="flex-1">{choice}</span>
              {picked !== null && isAnswer && (
                <Check className="size-4 text-emerald-500" aria-label={t("correct")} />
              )}
              {isPicked && !isAnswer && (
                <X className="size-4 text-destructive" aria-label={t("wrong")} />
              )}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <Button className="w-full" onClick={next} autoFocus>
          {t("next")}
        </Button>
      )}
    </div>
  );
}
