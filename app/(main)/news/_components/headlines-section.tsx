import { ExternalLink } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import type { LearningLanguage } from "@/lib/schemas/common";
import { getHeadlines, NEWS_SOURCES } from "@/server/queries/news";

/**
 * Commercial headlines (NHK, BBC): title and link only. Their terms do not allow rewriting,
 * so there is no "make a lesson" button here.
 */
export async function HeadlinesSection({ language }: { language: LearningLanguage }) {
  const [items, t, format] = await Promise.all([
    getHeadlines(language),
    getTranslations("news"),
    getFormatter(),
  ]);
  if (items.length === 0) return null;

  return (
    <section className="space-y-3" aria-labelledby="headlines-heading">
      <div className="space-y-1">
        <h2 id="headlines-heading" className="font-heading text-lg font-bold">
          {t("headlines.title", { source: NEWS_SOURCES[language].name })}
        </h2>
        <p className="text-sm text-muted-foreground">{t("copyrightNote")}</p>
      </div>
      <ul className="sheet-flat divide-y divide-dashed divide-border/30">
        {items.slice(0, 8).map((item) => (
          <li key={item.url}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
            >
              <span lang={language} className="min-w-0 flex-1 truncate">
                {item.title}
              </span>
              {item.publishedAt && (
                <span className="mono-label hidden shrink-0 sm:inline">
                  {format.dateTime(new Date(item.publishedAt), { timeStyle: "short" })}
                </span>
              )}
              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
