"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { PlayButton } from "@/components/audio/play-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { diffDictation, type DiffResult } from "@/lib/diff";
import type { LessonWorkspace } from "@/lib/lessons/workspace";

import { DiffView } from "./diff-view";
import { PracticeSummary } from "../../_components/practice-summary";

/** Listen to each sentence, type it, compare character by character (JA) or word by word (EN). */
export function DictationSession({ workspace }: { workspace: LessonWorkspace }) {
  const t = useTranslations("dictation");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<DiffResult | null>(null);
  const [scores, setScores] = useState<number[]>([]);

  const sentence = workspace.sentences[index];
  if (!sentence) {
    const average = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    return (
      <PracticeSummary
        lessonId={workspace.id}
        percent={average}
        detail={t("summary", { count: scores.length })}
      />
    );
  }

  const check = () => {
    if (result) {
      setIndex((value) => value + 1);
      setAnswer("");
      setResult(null);
      return;
    }
    const diff = diffDictation(sentence.sourceText, answer, workspace.language);
    setResult(diff);
    setScores((previous) => [...previous, diff.score]);
  };

  return (
    <form
      className="mx-auto w-full max-w-2xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        check();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="mono-label">
          {t("progress", { current: index + 1, total: workspace.sentences.length })}
        </p>
        <PlayButton
          key={sentence.id}
          text={sentence.sourceText}
          language={workspace.language}
          showRate
        />
      </div>

      <Textarea
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        disabled={result !== null}
        rows={3}
        lang={workspace.language}
        placeholder={t("placeholder")}
        aria-label={t("placeholder")}
        autoFocus
      />

      {result && (
        <section className="sheet-tight space-y-3 p-4" aria-live="polite">
          <div className="flex items-baseline justify-between">
            <p className="mono-label">{t("result")}</p>
            <p className="mono-value text-2xl font-bold">{result.score}%</p>
          </div>
          <DiffView segments={result.segments} language={workspace.language} />
          <p
            lang={workspace.language}
            className="border-t border-dashed border-border/30 pt-3 text-sm text-muted-foreground"
          >
            {sentence.sourceText}
          </p>
        </section>
      )}

      <Button type="submit" className="w-full" disabled={!result && !answer.trim()}>
        {result ? t("next") : t("check")}
      </Button>
    </form>
  );
}
