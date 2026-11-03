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
      <h2 className="mono-label">{t("title", { count: sentences.length })}</h2>
      {sentences.length === 0 ? (
        <p className="border border-dashed border-border/35 px-6 py-10 text-center text-sm leading-relaxed text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <ol className="max-h-[28rem] divide-y divide-dashed divide-border/25 overflow-y-auto border-y border-dashed border-border/35">
          {sentences.map((sentence, index) => (
            <li
              key={`${index}-${sentence}`}
              lang={language}
              className={cn(
                "flex gap-3 py-2.5 text-sm leading-relaxed",
                index >= MAX_SENTENCES && "opacity-40",
              )}
            >
              <span className="mono-value w-6 shrink-0 pt-0.5 text-[0.6875rem] text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">{sentence}</span>
            </li>
          ))}
        </ol>
      )}
      {tooMany && (
        <p className="text-sm leading-relaxed font-medium text-destructive">
          {t("tooMany", { max: MAX_SENTENCES })}
        </p>
      )}
    </aside>
  );
}
