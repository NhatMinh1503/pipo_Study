"use client";

import { ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { OpenSourceId } from "@/lib/news/open-sources";
import type { LearningLanguage } from "@/lib/schemas/common";
import { cn } from "@/lib/utils";

export interface OpenNewsListProps {
  language: LearningLanguage;
  sources: Array<{ id: OpenSourceId; name: string; license: string }>;
  items: Array<{
    sourceId: OpenSourceId;
    title: string;
    url: string;
    summary: string | null;
    publishedAt: string | null;
  }>;
}

/** Articles from every open source, with a filter by source and the source on each row. */
export function OpenNewsList({ language, sources, items }: OpenNewsListProps) {
  const t = useTranslations("news");
  const format = useFormatter();
  const [filter, setFilter] = useState<OpenSourceId | "all">("all");
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  // Only offer sources that currently have articles
  const available = sources.filter((source) => items.some((item) => item.sourceId === source.id));
  const visible = filter === "all" ? items : items.filter((item) => item.sourceId === filter);

  return (
    <div className="space-y-3">
      {available.length > 1 && (
        <div
          className="flex w-fit flex-wrap border-2 border-border bg-card"
          role="group"
          aria-label={t("open.filterLabel")}
        >
          {(["all", ...available.map((source) => source.id)] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "border-r border-dashed border-border/35 px-3 py-2 font-mono text-[0.625rem] font-semibold tracking-[0.1em] uppercase transition-colors last:border-r-0 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                filter === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {value === "all" ? t("open.all") : sourceById.get(value)?.name}
            </button>
          ))}
        </div>
      )}
      <ul className="sheet-flat divide-y divide-dashed divide-border/30">
        {visible.map((item) => {
          const source = sourceById.get(item.sourceId);
          return (
            <li key={item.url} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 space-y-1">
                <p lang={language} className="font-medium">
                  {item.title}
                </p>
                {item.summary && (
                  <p lang={language} className="line-clamp-2 text-sm text-muted-foreground">
                    {item.summary}
                  </p>
                )}
                <p className="mono-label">
                  {source && (
                    <span>
                      {source.name} · {source.license}
                    </span>
                  )}
                  {item.publishedAt && (
                    <span>
                      {" · "}
                      {format.dateTime(new Date(item.publishedAt), { dateStyle: "medium" })}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild variant="ghost" size="sm">
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden />
                    {t("read")}
                  </a>
                </Button>
                <Button asChild size="sm">
                  <Link href={`/lessons/new?${new URLSearchParams({ news: item.url }).toString()}`}>
                    <Sparkles aria-hidden />
                    {t("makeLesson")}
                  </Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
