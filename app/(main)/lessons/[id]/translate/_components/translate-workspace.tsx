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

/** Dual-pane translation screen: source sentences on the left, answer + AI feedback on the right. */
export function TranslateWorkspace({ workspace }: { workspace: LessonWorkspace }) {
  const t = useTranslations("translate");
  const session = useTranslateSession(workspace);
  const total = session.sentences.length;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{workspace.level}</Badge>
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {workspace.title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={(session.doneCount / total) * 100} className="h-1.5" aria-hidden />
          <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
            {t("progress", { done: session.doneCount, total })}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="max-h-[45dvh] overflow-y-auto lg:max-h-[calc(100dvh-14rem)]">
          <SourcePane
            sentences={session.sentences}
            language={workspace.language}
            statusOf={session.statusOf}
            currentIndex={session.currentIndex}
          />
        </div>

        <div className="space-y-4 lg:sticky lg:top-20">
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
  );
}
