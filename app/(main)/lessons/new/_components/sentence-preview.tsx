"use client";

import { useTranslations } from "next-intl";
import { useDeferredValue, useMemo } from "react";

import { splitSentences } from "@/lib/nlp/split-sentences";
import type { LearningLanguage } from "@/lib/schemas/common";
import { MAX_SENTENCES } from "@/lib/schemas/lesson";
import { cn } from "@/lib/utils";

interface SentencePreviewProps {
  text: string;
  language: LearningLanguage;
}

/** Live preview of how the pasted text will be split — same function the server uses. */
export function SentencePreview({ text, language }: SentencePreviewProps) {
  const t = useTranslations("lessons.preview");
  // Splitting long passages on every keystroke is wasted work; let typing stay responsive
  const deferredText = useDeferredValue(text);
  const sentences = useMemo(() => splitSentences(deferredText, language), [deferredText, language]);
  const tooMany = sentences.length > MAX_SENTENCES;

  return (
    <aside className="space-y-3" aria-live="polite">
      <h2 className="text-sm font-medium text-muted-foreground">
        {t("title", { count: sentences.length })}
      </h2>
      {sentences.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <ol className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {sentences.map((sentence, index) => (
            <li
              key={`${index}-${sentence}`}
              lang={language}
              className={cn(
                "flex gap-3 rounded-lg border border-border bg-card p-3 text-sm",
                index >= MAX_SENTENCES && "opacity-40",
              )}
            >
              <span className="text-muted-foreground tabular-nums">{index + 1}</span>
              <span>{sentence}</span>
            </li>
          ))}
        </ol>
      )}
      {tooMany && (
        <p className="text-sm text-destructive">{t("tooMany", { max: MAX_SENTENCES })}</p>
      )}
    </aside>
  );
}
