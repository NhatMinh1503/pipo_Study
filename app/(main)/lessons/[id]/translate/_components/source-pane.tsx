"use client";

import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { TokenizedSentence } from "@/components/dictionary/tokenized-sentence";
import type { LearningLanguage } from "@/lib/schemas/common";
import { cn } from "@/lib/utils";
import type { WorkspaceSentence } from "@/lib/lessons/workspace";

import type { SentenceStatus } from "../_hooks/use-translate-session";

interface SourcePaneProps {
  sentences: WorkspaceSentence[];
  language: LearningLanguage;
  statusOf: (index: number) => SentenceStatus;
  currentIndex: number;
}

/**
 * Left pane: every source sentence as done (tick + reference), current (paper
 * lifted out of the ruled list) or still waiting. Rows are separated by rules,
 * not boxes, so the passage reads as one text.
 */
export function SourcePane({ sentences, language, statusOf, currentIndex }: SourcePaneProps) {
  const t = useTranslations("translate");
  const currentRef = useRef<HTMLLIElement>(null);

  // Keep the active sentence in view as the learner progresses
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentIndex]);

  return (
    <section aria-label={t("sourceLabel")}>
      <ol className="divide-y divide-dashed divide-border/25">
        {sentences.map((sentence, index) => {
          const status = statusOf(index);
          const current = status === "current";

          return (
            <li
              key={sentence.id}
              ref={current ? currentRef : undefined}
              aria-current={current ? "step" : undefined}
              className={cn(
                "px-2 py-3.5 transition-colors first:pt-0 last:pb-0",
                current && "bg-primary/[0.07]",
              )}
            >
              <div className="flex gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
                  {current ? (
                    <span className="mono-value flex size-5 items-center justify-center bg-primary text-[0.625rem] font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                  ) : status === "done" ? (
                    <CircleCheck className="size-4 text-success" aria-hidden />
                  ) : (
                    <span className="mono-value text-[0.6875rem] text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  )}
                </span>
                <div className="min-w-0 space-y-1.5">
                  {/* Locked sentences stay plain text so the learner focuses on the current one */}
                  {sentence.tokens && status !== "locked" ? (
                    <TokenizedSentence
                      tokens={sentence.tokens}
                      language={language}
                      className={cn(
                        "leading-[1.85]",
                        current ? "text-lg" : "text-base",
                        !current && "text-muted-foreground",
                      )}
                      context={{
                        language,
                        sentence: sentence.sourceText,
                        sentenceTranslation: sentence.referenceTranslation,
                        sentenceId: sentence.id,
                      }}
                    />
                  ) : (
                    <p
                      lang={language}
                      className={cn(
                        "leading-[1.85]",
                        current ? "text-lg" : "text-base text-muted-foreground",
                      )}
                    >
                      {sentence.sourceText}
                    </p>
                  )}
                  {status === "done" && sentence.referenceTranslation && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {sentence.referenceTranslation}
                    </p>
                  )}
                  <span className="sr-only">{t(`status.${status}`)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
