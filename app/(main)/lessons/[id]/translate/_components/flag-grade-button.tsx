"use client";

import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { flagAttempt } from "@/server/actions/feedback";

/** "The AI got this wrong": one tap, counted for the AI accuracy KPI. */
export function FlagGradeButton({ attemptId }: { attemptId: string }) {
  const t = useTranslations("translate.flag");
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  if (sent) return <p className="mono-label text-muted-foreground">{t("thanks")}</p>;

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await flagAttempt(attemptId);
          if (result.ok) setSent(true);
        })
      }
    >
      <Flag aria-hidden />
      {t("button")}
    </Button>
  );
}
