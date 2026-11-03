"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { FormAlert } from "@/components/common/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildFillQuestions } from "@/lib/quiz/build-questions";
import { isCorrectAnswer } from "@/lib/quiz/normalize";
import { makeCloze } from "@/lib/srs/cloze";
import type { VocabItem } from "@/lib/vocab/types";

import { QuizResult } from "./quiz-result";

const QUESTION_COUNT = 10;

/** Type the hidden word back into its example sentence (the reading is accepted too). */
export function FillQuiz({ items }: { items: VocabItem[] }) {
  const t = useTranslations("quiz");
  const [questions, setQuestions] = useState(() => buildFillQuestions(items, QUESTION_COUNT));
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [correct, setCorrect] = useState(0);

  const item = questions[index];

  const restart = () => {
    setQuestions(buildFillQuestions(items, QUESTION_COUNT));
    setIndex(0);
    setAnswer("");
    setResult(null);
    setCorrect(0);
  };

  if (!item) return <QuizResult correct={correct} total={questions.length} onRestart={restart} />;

  const submit = () => {
    if (result !== null) {
      setIndex((value) => value + 1);
      setAnswer("");
      setResult(null);
      return;
    }
    if (!answer.trim()) return;
    const ok = isCorrectAnswer(answer, item.term, item.reading);
    setResult(ok ? "correct" : "wrong");
    if (ok) setCorrect((value) => value + 1);
  };

  return (
    <form
      className="mx-auto w-full max-w-xl space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <p className="mono-label text-center">
        {t("progress", { current: index + 1, total: questions.length })}
      </p>
      <div className="sheet space-y-3 p-8 text-center">
        <p lang={item.language} className="text-xl leading-relaxed">
          {makeCloze(item.contextSentence ?? "", item.term).text}
        </p>
        <p className="text-sm text-muted-foreground">{item.meaning}</p>
      </div>
      <Input
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        disabled={result !== null}
        lang={item.language}
        aria-label={t("typeWord")}
        placeholder={t("typeWord")}
        autoFocus
      />
      {result === "correct" && <FormAlert variant="success" messageKey="quiz.correct" />}
      {result === "wrong" && (
        <p className="border-2 border-destructive/40 bg-destructive/10 p-3 text-sm" role="alert">
          {t("answerWas")} <strong lang={item.language}>{item.term}</strong>
          {item.reading && ` (${item.reading})`}
        </p>
      )}
      <Button type="submit" className="w-full">
        {result === null ? t("check") : t("next")}
      </Button>
    </form>
  );
}
