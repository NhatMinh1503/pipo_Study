"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { SubmitButton } from "@/components/common/submit-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TargetPaneProps {
  sourceText: string;
  attemptCount: number;
  isGrading: boolean;
  /** True after a correct answer: input is locked and "next" is offered. */
  isReviewing: boolean;
  onSubmit: (text: string) => void;
  onNext: () => void;
}

/**
 * Right pane: answer box. Enter checks, Shift+Enter adds a line break.
 * The parent keys this by sentence id, so a new sentence starts with an empty, focused box.
 */
export function TargetPane({
  sourceText,
  attemptCount,
  isGrading,
  isReviewing,
  onSubmit,
  onNext,
}: TargetPaneProps) {
  const t = useTranslations("translate");
  const [text, setText] = useState("");
  const inputId = useId();
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isReviewing) nextRef.current?.focus();
  }, [isReviewing]);

  const submit = () => {
    if (text.trim()) onSubmit(text);
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
        <span className="sr-only">: {sourceText}</span>
      </label>
      <Textarea
        id={inputId}
        value={text}
        rows={4}
        autoFocus
        disabled={isReviewing}
        placeholder={t("placeholder")}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[0.6875rem] leading-snug tracking-[0.04em] text-muted-foreground">
          {attemptCount > 0 ? t("attempts", { count: attemptCount }) : t("keyboardHint")}
        </p>
        {isReviewing ? (
          <Button ref={nextRef} type="button" onClick={onNext} className="shrink-0">
            {t("next")}
            <ArrowRight aria-hidden />
          </Button>
        ) : (
          <SubmitButton isPending={isGrading} disabled={!text.trim()} className="w-auto shrink-0">
            {t("check")}
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
