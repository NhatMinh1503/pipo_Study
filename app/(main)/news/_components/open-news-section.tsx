import { Newspaper } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { OPEN_SOURCES_BY_LANGUAGE } from "@/lib/news/open-sources";
import type { LearningLanguage } from "@/lib/schemas/common";
import { getOpenNews } from "@/server/queries/open-news";

import { OpenNewsList } from "./open-news-list";

/** Articles from openly licensed sources; "Make a lesson" rewrites one at the learner's level. */
export async function OpenNewsSection({ language }: { language: LearningLanguage }) {
  const [items, t] = await Promise.all([getOpenNews(language), getTranslations("news")]);
  const sources = OPEN_SOURCES_BY_LANGUAGE[language].map(({ id, name, license }) => ({
    id,
    name,
    license,
  }));

  return (
    <section className="space-y-3" aria-labelledby="open-news-heading">
      <div className="space-y-1">
        <h2 id="open-news-heading" className="font-heading text-lg font-bold">
          {t("open.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("open.description", { sources: sources.map((source) => source.name).join(", ") })}
        </p>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Newspaper} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <OpenNewsList language={language} sources={sources} items={items} />
      )}
    </section>
  );
}
