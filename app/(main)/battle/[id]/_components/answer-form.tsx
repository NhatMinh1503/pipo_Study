"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { SubmitButton } from "@/components/common/submit-button";
import { Textarea } from "@/components/ui/textarea";

interface AnswerFormProps {
  isSubmitting: boolean;
  onSubmit: (text: string) => void;
}

/** One answer box per sentence (the parent keys it by index). Enter submits. */
export function AnswerForm({ isSubmitting, onSubmit }: AnswerFormProps) {
  const t = useTranslations("battle");
  const [text, setText] = useState("");
  const inputId = useId();

  const submit = () => {
    if (text.trim() && !isSubmitting) onSubmit(text);
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor={inputId} className="mono-label block">
        {t("yourTranslation")}
      </label>
      <Textarea
        id={inputId}
        value={text}
        rows={3}
        autoFocus
        maxLength={1000}
        disabled={isSubmitting}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="mono-label">{t("keyboardHint")}</p>
        <SubmitButton isPending={isSubmitting} className="shrink-0">
          {isSubmitting ? t("grading") : t("submit")}
        </SubmitButton>
      </div>
    </form>
  );
}
