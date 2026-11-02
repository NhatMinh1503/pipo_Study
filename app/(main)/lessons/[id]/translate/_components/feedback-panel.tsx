"use client";

import { Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";

import { FormAlert } from "@/components/common/form-alert";
import { VerdictBadge } from "@/components/lessons/verdict-badge";

import type { Feedback } from "../_hooks/use-translate-session";

/** AI result for the current sentence: verdict, comment, hint (when wrong), reference (when right). */
export function FeedbackPanel({ feedback }: { feedback: Feedback | null }) {
  const t = useTranslations("translate");
  if (!feedback) return null;

  if (feedback.kind === "error") return <FormAlert messageKey={feedback.messageKey} />;

  const { result } = feedback;
  return (
    <section
      aria-live="polite"
      aria-label={t("feedbackLabel")}
      className="space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <VerdictBadge verdict={result.verdict} />
      <p className="text-sm">{result.feedback}</p>
      {result.hint && (
        <p className="flex gap-2 rounded-lg bg-muted/60 p-3 text-sm">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
          <span>
            <span className="font-medium">{t("hint")}: </span>
            {result.hint}
          </span>
        </p>
      )}
      {result.referenceTranslation && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{t("reference")}: </span>
          {result.referenceTranslation}
        </p>
      )}
    </section>
  );
}
