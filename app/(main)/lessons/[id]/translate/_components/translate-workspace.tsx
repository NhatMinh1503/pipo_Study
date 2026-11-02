"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { LessonWorkspace } from "@/lib/lessons/workspace";

import { useTranslateSession } from "../_hooks/use-translate-session";

import { FeedbackPanel } from "./feedback-panel";
import { FinishPanel } from "./finish-panel";
import { SourcePane } from "./source-pane";
import { TargetPane } from "./target-pane";

/**
 * Dual-pane translation screen. Both panes live inside one working sheet — the
 * source is the read-only side, the answer and its feedback the editable side.
 */
export function TranslateWorkspace({ workspace }: { workspace: LessonWorkspace }) {
  const t = useTranslations("translate");
  const session = useTranslateSession(workspace);
  const total = session.sentences.length;

  return (
    <div className="space-y-5">
      <div className="sheet-tight">
        <header className="flex flex-col gap-3 border-b border-dashed border-border/40 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <Badge variant="secondary">{workspace.level}</Badge>
            <h1 className="truncate font-heading text-lg leading-tight font-bold tracking-tight sm:text-xl">
              {workspace.title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Progress
              value={(session.doneCount / total) * 100}
              className="h-1.5 w-24 sm:w-32"
              aria-hidden
            />
            <span className="mono-value shrink-0 text-[0.6875rem] tracking-[0.06em] text-muted-foreground">
              {t("progress", { done: session.doneCount, total })}
            </span>
          </div>
        </header>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:divide-x lg:divide-dashed lg:divide-border/30">
          <div className="max-h-[45dvh] overflow-y-auto px-4 py-4 lg:max-h-[calc(100dvh-13rem)]">
            <SourcePane
              sentences={session.sentences}
              language={workspace.language}
              statusOf={session.statusOf}
              currentIndex={session.currentIndex}
            />
          </div>

          <div className="space-y-4 border-t border-dashed border-border/40 px-4 py-4 lg:border-t-0">
            {session.allDone ? (
              <FinishPanel lessonId={workspace.id} />
            ) : (
              session.current && (
                <>
                  <TargetPane
                    key={session.current.id}
                    sourceText={session.current.sourceText}
                    attemptCount={session.current.attempts.length}
                    isGrading={session.isGrading}
                    isReviewing={session.isReviewing}
                    onSubmit={session.submit}
                    onNext={session.goToNext}
                  />
                  <FeedbackPanel feedback={session.feedback} />
                </>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
