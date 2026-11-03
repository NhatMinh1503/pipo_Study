"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { PlayButton } from "@/components/audio/play-button";
import { Button } from "@/components/ui/button";
import type { Blank } from "@/lib/cloze/blanks";
import type { LessonWorkspace } from "@/lib/lessons/workspace";
import { isCorrectAnswer } from "@/lib/quiz/normalize";
import { cn } from "@/lib/utils";

import { PracticeSummary } from "../../_components/practice-summary";

const key = (blank: Blank) => `${blank.sentenceId}:${blank.tokenIndex}`;

/** Listen and fill every blank, then check all at once. */
export function ClozeSession({
  workspace,
  blanks,
}: {
  workspace: LessonWorkspace;
  blanks: Blank[];
}) {
  const t = useTranslations("cloze");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [finished, setFinished] = useState(false);
  const blankKeys = new Set(blanks.map(key));

  const tokenAt = (blank: Blank) =>
    workspace.sentences.find((sentence) => sentence.id === blank.sentenceId)?.tokens?.[
      blank.tokenIndex
    ];
  const correctCount = blanks.filter((blank) => {
    const token = tokenAt(blank);
    return token ? isCorrectAnswer(answers[key(blank)] ?? "", token.surface, token.reading) : false;
  }).length;

  if (finished) {
    return (
      <PracticeSummary
        lessonId={workspace.id}
        percent={Math.round((correctCount / blanks.length) * 100)}
        detail={t("summary", { correct: correctCount, total: blanks.length })}
      />
    );
  }

  return (
    <form
      className="mx-auto w-full max-w-2xl space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (checked) setFinished(true);
        else setChecked(true);
      }}
    >
      <ol className="sheet-flat divide-y divide-dashed divide-border/30">
        {workspace.sentences.map((sentence) => (
          <li key={sentence.id} className="flex items-start gap-3 p-4">
            <PlayButton
              text={sentence.sourceText}
              language={workspace.language}
              className="shrink-0"
            />
            <p lang={workspace.language} className="flex-1 text-lg leading-loose">
              {(sentence.tokens ?? []).map((token, tokenIndex) => {
                const id = `${sentence.id}:${tokenIndex}`;
                if (!blankKeys.has(id)) return <span key={tokenIndex}>{token.surface}</span>;
                const right = isCorrectAnswer(answers[id] ?? "", token.surface, token.reading);
                return (
                  <span key={tokenIndex} className="inline-flex flex-col align-middle">
                    <input
                      value={answers[id] ?? ""}
                      onChange={(event) =>
                        setAnswers((previous) => ({ ...previous, [id]: event.target.value }))
                      }
                      disabled={checked}
                      aria-label={t("blankLabel")}
                      style={{ width: `${Math.max(3, token.surface.length * 1.6)}em` }}
                      className={cn(
                        "mx-1 border-b-2 bg-transparent px-1 text-center outline-none focus:border-primary",
                        !checked && "border-border",
                        checked &&
                          (right
                            ? "border-emerald-500 text-emerald-600"
                            : "border-destructive text-destructive"),
                      )}
                    />
                    {checked && !right && (
                      <span className="text-center text-xs text-muted-foreground">
                        {token.surface}
                      </span>
                    )}
                  </span>
                );
              })}
            </p>
          </li>
        ))}
      </ol>
      {checked && (
        <p className="mono-label text-center" role="status">
          {t("summary", { correct: correctCount, total: blanks.length })}
        </p>
      )}
      <Button type="submit" className="w-full">
        {checked ? t("finish") : t("check")}
      </Button>
    </form>
  );
}
