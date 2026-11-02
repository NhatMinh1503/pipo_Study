import "server-only";

import { cacheLife } from "next/cache";

import { parseRss, type NewsItem } from "@/lib/news/parse-rss";
import type { LearningLanguage } from "@/lib/schemas/common";

// Public RSS headline feeds. Only titles and links are used: article text is never copied.
export const NEWS_SOURCES: Record<LearningLanguage, { name: string; url: string }> = {
  ja: { name: "NHKニュース", url: "https://www3.nhk.or.jp/rss/news/cat0.xml" },
  en: { name: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
};

/** Today's headlines for a language, cached for an hour and shared by every user. */
export async function getHeadlines(language: LearningLanguage): Promise<NewsItem[]> {
  "use cache";
  cacheLife("hours");

  try {
    const response = await fetch(NEWS_SOURCES[language].url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [];
    return parseRss(await response.text(), 15);
  } catch {
    // Offline or feed down: the page shows an empty state instead of failing
    return [];
  }
}
