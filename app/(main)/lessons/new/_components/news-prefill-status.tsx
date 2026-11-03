"use client";

import { LoaderCircle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { FormAlert } from "@/components/common/form-alert";
import { SourceAttribution } from "@/components/lessons/source-attribution";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/http";
import type { NewsRewriteResponse } from "@/lib/schemas/news";

interface NewsPrefillStatusProps {
  isPending: boolean;
  error: Error | null;
  data: NewsRewriteResponse | undefined;
  onRetry: () => void;
}

const ERROR_KEYS: Record<string, string> = {
  RATE_LIMITED: "lessons.news.rateLimited",
  NOT_FOUND: "lessons.news.unreadable",
  AI_BAD_REQUEST: "lessons.news.tooClose",
};

/** What happens to the news passage: being written, failed (with retry), or done (credit line). */
export function NewsPrefillStatus({ isPending, error, data, onRetry }: NewsPrefillStatusProps) {
  const t = useTranslations("lessons.news");

  if (isPending) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
        {t("writing")}
      </p>
    );
  }
  if (error) {
    const key = (error instanceof ApiError && ERROR_KEYS[error.code]) || "lessons.news.failed";
    return (
      <div className="space-y-2">
        <FormAlert messageKey={key} />
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw aria-hidden />
          {t("retry")}
        </Button>
      </div>
    );
  }
  if (!data) return null;
  return (
    <div className="space-y-1 border-l-2 border-primary/50 pl-3">
      <p className="text-sm">{t("ready")}</p>
      <SourceAttribution source={data.source} />
    </div>
  );
}
