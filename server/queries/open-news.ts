import "server-only";

import { cacheLife } from "next/cache";
import { z } from "zod";

import { extractKanteiText, htmlToText, parseAtom, type OpenNewsItem } from "@/lib/news/extract";
import { findOpenSource, OPEN_SOURCE_BY_LANGUAGE, OPEN_SOURCES } from "@/lib/news/open-sources";
import { parseRss } from "@/lib/news/parse-rss";
import type { LearningLanguage } from "@/lib/schemas/common";
import { logger } from "@/server/logger";

const log = logger.child({ module: "open-news" });

const FEEDS = {
  kantei: "https://www.kantei.go.jp/index-jnews.rdf",
  govuk: "https://www.gov.uk/search/news-and-communications.atom",
} as const;

// Identify ourselves to the publishers; redirects are refused so the allow-list cannot be bypassed
const fetchText = async (url: string) => {
  const response = await fetch(url, {
    headers: { "User-Agent": "pipo-study (language-learning app)" },
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
  return response.text();
};

/** Latest items from the open source for a language, cached for an hour for everyone. */
export async function getOpenNews(language: LearningLanguage): Promise<OpenNewsItem[]> {
  "use cache";
  cacheLife("hours");

  const source = OPEN_SOURCE_BY_LANGUAGE[language];
  try {
    const xml = await fetchText(FEEDS[source.id]);
    const items =
      source.id === "kantei"
        ? parseRss(xml, 40).map((item) => ({ ...item, summary: null }))
        : parseAtom(xml, 40);
    return items.filter((item) => findOpenSource(item.url) === source).slice(0, 15);
  } catch (error) {
    log.warn("open feed unavailable", { source: source.id, err: error });
    return [];
  }
}

export interface OpenArticle {
  title: string;
  text: string;
}

/**
 * Headline and body of an allow-listed article, cached for a day. Throws for URLs outside
 * the allow-list or pages without readable text, so failures are never cached.
 */
export async function getOpenArticle(url: string): Promise<OpenArticle> {
  "use cache";
  cacheLife("days");

  const source = findOpenSource(url);
  if (!source) throw new Error("not an open source");

  if (source === OPEN_SOURCES.kantei) {
    const html = await fetchText(url);
    const title = /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.split("|")[0]?.trim() ?? "";
    return { title, text: extractKanteiText(html) };
  }

  // GOV.UK publishes every page as JSON at /api/content/<path>
  const page = govukPageSchema.parse(
    JSON.parse(await fetchText(`https://www.gov.uk/api/content${new URL(url).pathname}`)),
  );
  return {
    title: page.title,
    text: [page.description, htmlToText(page.details.body)].filter(Boolean).join("\n"),
  };
}

const govukPageSchema = z.object({
  title: z.string().catch(""),
  description: z.string().catch(""),
  details: z.object({ body: z.string().catch("") }).catch({ body: "" }),
});
