"use client";

import { PartyPopper } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/common/form-alert";
import { Button } from "@/components/ui/button";

import { finishLesson } from "../../_lib/actions";

/** Shown once every sentence is translated: claims the reward and opens the summary. */
export function FinishPanel({ lessonId }: { lessonId: string }) {
  const t = useTranslations("translate");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const finish = () =>
    startTransition(async () => {
      const result = await finishLesson(lessonId);
      // Success redirects to the result page
      if (result && !result.ok) setError(result.error);
    });

  return (
    <section className="flex flex-col items-center gap-4 border-2 border-border bg-card p-6 text-center shadow-[3px_3px_0_0_var(--shadow-ink)]">
      <span className="flex size-12 items-center justify-center border border-border/35 text-success">
        <PartyPopper className="size-5" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <p className="font-heading text-base font-semibold tracking-tight">{t("allDoneTitle")}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("allDoneDescription")}</p>
      </div>
      <FormAlert messageKey={error} />
      <Button onClick={finish} disabled={isPending} className="w-full sm:w-auto">
        {t("finish")}
      </Button>
    </section>
  );
}
