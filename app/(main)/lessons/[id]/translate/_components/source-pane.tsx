"use client";

import { CircleCheck, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

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

/** Left pane: every source sentence as done (✓ + reference), current (highlighted) or locked. */
export function SourcePane({ sentences, language, statusOf, currentIndex }: SourcePaneProps) {
  const t = useTranslations("translate");
  const currentRef = useRef<HTMLLIElement>(null);

  // Keep the active sentence in view as the learner progresses
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentIndex]);

  return (
    <section aria-label={t("sourceLabel")} className="space-y-2">
      <ol className="space-y-2">
        {sentences.map((sentence, index) => {
          const status = statusOf(index);
          return (
            <li
              key={sentence.id}
              ref={status === "current" ? currentRef : undefined}
              aria-current={status === "current" ? "step" : undefined}
              className={cn(
                "rounded-xl border p-4 transition-all",
                status === "current" && "border-primary bg-primary/5 shadow-sm",
                status === "done" && "border-border bg-card",
                status === "locked" && "border-border opacity-40",
              )}
            >
              <div className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden>
                  {status === "done" ? (
                    <CircleCheck className="size-4 text-emerald-500" />
                  ) : status === "locked" ? (
                    <Lock className="size-4" />
                  ) : (
                    <span className="text-sm tabular-nums">{index + 1}</span>
                  )}
                </span>
                <div className="min-w-0 space-y-1">
                  <p lang={language} className={cn(status === "current" ? "text-lg" : "text-base")}>
                    {sentence.sourceText}
                  </p>
                  {status === "done" && sentence.referenceTranslation && (
                    <p className="text-sm text-muted-foreground">{sentence.referenceTranslation}</p>
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
