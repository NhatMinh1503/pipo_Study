"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { useNow } from "@/hooks/use-now";
import { formatClock } from "@/lib/pomodoro/timer";
import { buildMatchPairs } from "@/lib/quiz/build-questions";
import { cn } from "@/lib/utils";
import type { VocabItem } from "@/lib/vocab/types";

import { QuizResult } from "./quiz-result";

const PAIR_COUNT = 6;

// Only called from event handlers and the lazy initial state, never during render
const currentTime = () => Date.now();

/** Tap a word, then its meaning. Wrong pairs flash red; the clock runs until all are matched. */
export function MatchQuiz({ items }: { items: VocabItem[] }) {
  const t = useTranslations("quiz");
  const now = useNow();
  const [pairs, setPairs] = useState(() => buildMatchPairs(items, PAIR_COUNT));
  const [startedAt, setStartedAt] = useState(() => currentTime());
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);

  const restart = () => {
    setPairs(buildMatchPairs(items, PAIR_COUNT));
    setStartedAt(currentTime());
    setSelected(null);
    setMatched(new Set());
    setMistakes(0);
    setFinishedAt(null);
  };

  const total = pairs.left.length;
  if (finishedAt !== null) {
    return (
      <QuizResult
        correct={total}
        total={total + mistakes}
        detail={t("matchTime", { time: formatClock(finishedAt - startedAt) })}
        onRestart={restart}
      />
    );
  }

  const chooseMeaning = (id: string) => {
    if (!selected || matched.has(id)) return;
    if (id === selected) {
      const next = new Set(matched).add(id);
      setMatched(next);
      setSelected(null);
      if (next.size === total) setFinishedAt(currentTime());
    } else {
      setMistakes((value) => value + 1);
      setWrongId(id);
      setTimeout(() => setWrongId(null), 500);
    }
  };

  const tile = (active: boolean, done: boolean, wrong = false) =>
    cn(
      "min-h-14 w-full border-2 px-3 py-2 text-left text-sm transition-colors",
      "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
      done && "border-border/30 text-muted-foreground opacity-40",
      !done && "border-border bg-card hover:bg-muted/40",
      active && "border-primary bg-primary/10",
      wrong && "border-destructive bg-destructive/10",
    );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="flex justify-between">
        <p className="mono-label">{t("matched", { done: matched.size, total })}</p>
        <p className="mono-value text-sm" role="timer">
          {now === null ? "00:00" : formatClock(now - startedAt)}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ul className="space-y-2" aria-label={t("words")}>
          {pairs.left.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                lang={item.language}
                disabled={matched.has(item.id)}
                aria-pressed={selected === item.id}
                onClick={() => setSelected(item.id)}
                className={cn(
                  tile(selected === item.id, matched.has(item.id)),
                  "font-heading text-lg font-semibold",
                )}
              >
                {item.term}
              </button>
            </li>
          ))}
        </ul>
        <ul className="space-y-2" aria-label={t("meanings")}>
          {pairs.right.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                disabled={matched.has(item.id) || !selected}
                onClick={() => chooseMeaning(item.id)}
                className={tile(false, matched.has(item.id), wrongId === item.id)}
              >
                {item.meaning}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
