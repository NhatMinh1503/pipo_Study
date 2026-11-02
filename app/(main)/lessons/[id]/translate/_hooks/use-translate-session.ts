"use client";

import { useState } from "react";

import { ApiError } from "@/lib/api/http";
import { useVerifyTranslation } from "@/lib/api/use-verify-translation";
import type { VerifyTranslationResponse } from "@/lib/schemas/translation";
import type { LessonWorkspace, WorkspaceSentence } from "@/lib/lessons/workspace";

export type SentenceStatus = "done" | "current" | "locked";

/** Result shown under the input for the sentence being worked on. */
export type Feedback =
  { kind: "graded"; result: VerifyTranslationResponse } | { kind: "error"; messageKey: string };

const ERROR_KEYS: Record<string, string> = {
  RATE_LIMITED: "translate.errors.rateLimited",
  AI_NOT_CONFIGURED: "translate.errors.notConfigured",
  AI_UNAVAILABLE: "translate.errors.unavailable",
  AI_BAD_REQUEST: "translate.errors.unavailable",
  NETWORK: "translate.errors.network",
};

/**
 * Drives the translate screen: which sentence is active, grading via the API,
 * unlocking the next sentence after a correct answer, and resuming where the learner left off.
 */
export function useTranslateSession(workspace: LessonWorkspace) {
  const [sentences, setSentences] = useState<WorkspaceSentence[]>(workspace.sentences);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  // After a correct answer we stay on the sentence until the learner moves on
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const verify = useVerifyTranslation();

  const firstOpenIndex = sentences.findIndex((sentence) => !sentence.completed);
  const reviewingIndex = sentences.findIndex((sentence) => sentence.id === reviewingId);
  const currentIndex = reviewingIndex !== -1 ? reviewingIndex : firstOpenIndex;
  const current = currentIndex === -1 ? undefined : sentences[currentIndex];
  const allDone = firstOpenIndex === -1 && reviewingId === null;

  const statusOf = (index: number): SentenceStatus => {
    if (index === currentIndex) return "current";
    return sentences[index]?.completed ? "done" : "locked";
  };

  const submit = (userTranslation: string) => {
    if (!current || current.completed || verify.isPending) return;
    const text = userTranslation.trim();
    if (!text) return;

    verify.mutate(
      { sentenceId: current.id, userTranslation: text },
      {
        onSuccess: (result) => {
          setFeedback({ kind: "graded", result });
          setSentences((previous) =>
            previous.map((sentence) =>
              sentence.id === current.id
                ? {
                    ...sentence,
                    completed: result.sentenceCompleted,
                    referenceTranslation: result.referenceTranslation,
                    attempts: [
                      ...sentence.attempts,
                      {
                        verdict: result.verdict,
                        feedback: result.feedback,
                        hint: result.hint,
                        userTranslation: text,
                      },
                    ],
                  }
                : sentence,
            ),
          );
          if (result.sentenceCompleted) setReviewingId(current.id);
        },
        // AI failures are not counted as attempts; the learner just tries again
        onError: (error) => {
          const code = error instanceof ApiError ? error.code : "INTERNAL";
          setFeedback({ kind: "error", messageKey: ERROR_KEYS[code] ?? "errors.unexpected" });
        },
      },
    );
  };

  const goToNext = () => {
    setReviewingId(null);
    setFeedback(null);
  };

  return {
    sentences,
    current,
    currentIndex,
    statusOf,
    feedback,
    isReviewing: reviewingId !== null,
    isGrading: verify.isPending,
    allDone,
    doneCount: sentences.filter((sentence) => sentence.completed).length,
    submit,
    goToNext,
  };
}
