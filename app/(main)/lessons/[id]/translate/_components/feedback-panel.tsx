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
      className="space-y-3 border-2 border-border bg-card p-4 shadow-[3px_3px_0_0_var(--shadow-ink)]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-dashed border-border/40 pb-2.5">
        <VerdictBadge verdict={result.verdict} />
        <span className="mono-label">{t("feedbackLabel")}</span>
      </div>
      <p className="text-sm leading-relaxed">{result.feedback}</p>
      {result.hint && (
        <p className="flex gap-2 bg-warning/[0.09] px-2.5 py-2 text-sm leading-relaxed">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <span>
            <span className="font-semibold">{t("hint")}: </span>
            {result.hint}
          </span>
        </p>
      )}
      {result.referenceTranslation && (
        <p className="border-t border-dashed border-border/40 pt-2.5 text-sm leading-relaxed text-muted-foreground">
          <span className="mono-label mr-2">{t("reference")}</span>
          {result.referenceTranslation}
        </p>
      )}
    </section>
  );
}
