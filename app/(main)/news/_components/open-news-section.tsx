import { ExternalLink, Newspaper, Sparkles } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { OPEN_SOURCE_BY_LANGUAGE } from "@/lib/news/open-sources";
import type { LearningLanguage } from "@/lib/schemas/common";
import { getOpenNews } from "@/server/queries/open-news";

/** Articles from openly licensed sources; "Make a lesson" rewrites one at the learner's level. */
export async function OpenNewsSection({ language }: { language: LearningLanguage }) {
  const [items, t, format] = await Promise.all([
    getOpenNews(language),
    getTranslations("news"),
    getFormatter(),
  ]);
  const source = OPEN_SOURCE_BY_LANGUAGE[language];

  return (
    <section className="space-y-3" aria-labelledby="open-news-heading">
      <div className="space-y-1">
        <h2 id="open-news-heading" className="font-heading text-lg font-bold">
          {t("open.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("open.description", { source: source.name, license: source.license })}
        </p>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Newspaper} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <ul className="sheet-flat divide-y divide-dashed divide-border/30">
          {items.map((item) => (
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
                {item.publishedAt && (
                  <p className="mono-label">
                    {format.dateTime(new Date(item.publishedAt), { dateStyle: "medium" })}
                  </p>
                )}
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
          ))}
        </ul>
      )}
    </section>
  );
}
