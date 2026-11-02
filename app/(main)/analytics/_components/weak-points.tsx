"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { FormAlert } from "@/components/common/form-alert";
import { Button } from "@/components/ui/button";
import type { TagCount } from "@/lib/analytics/error-stats";
import { generateLesson } from "@/server/actions/generate-lesson";

/** Top 3 mistake types and a button that turns them into a 3–5 minute micro-lesson. */
export function WeakPoints({ top }: { top: TagCount[] }) {
  const t = useTranslations("analytics");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const practise = () =>
    startTransition(async () => {
      const result = await generateLesson({ focusTags: top.map((item) => item.tag) });
      // Success redirects to the new lesson
      if (result && !result.ok) setError(result.error);
    });

  return (
    <section className="sheet space-y-4 p-5">
      <h2 className="mono-label">{t("weakTitle")}</h2>
      <ol className="space-y-2">
        {top.map((item, index) => (
          <li key={item.tag} className="flex items-baseline gap-3">
            <span className="mono-value text-muted-foreground">{index + 1}</span>
            <span className="flex-1 font-medium">{t(`tags.${item.tag}`)}</span>
            <span className="mono-value text-sm text-muted-foreground">
              {t("times", { count: item.count })}
            </span>
          </li>
        ))}
      </ol>
      <FormAlert messageKey={error} />
      <Button onClick={practise} disabled={isPending} className="w-full">
        <Sparkles aria-hidden />
        {isPending ? t("generating") : t("practise")}
      </Button>
    </section>
  );
}
