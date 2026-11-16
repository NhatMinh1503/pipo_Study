import "server-only";

import { cacheLife } from "next/cache";
import { z } from "zod";

import {
  extractGlobalVoicesText,
  extractKanteiText,
  extractNihArticle,
  htmlToText,
  parseAtom,
  parseNihIssues,
  parseNihIssueStories,
  parseWordpressFeed,
  type OpenNewsItem,
  type WordpressFeedItem,
} from "@/lib/news/extract";
import { interleaveBySource } from "@/lib/news/interleave";
import {
  findOpenSource,
  OPEN_SOURCES_BY_LANGUAGE,
  type OpenSourceId,
} from "@/lib/news/open-sources";
import { parseRss } from "@/lib/news/parse-rss";
import type { LearningLanguage } from "@/lib/schemas/common";
import { logger } from "@/server/logger";

const log = logger.child({ module: "open-news" });

const FEEDS = {
  kantei: "https://www.kantei.go.jp/index-jnews.rdf",
  govuk: "https://www.gov.uk/search/news-and-communications.atom",
  "globalvoices-ja": "https://jp.globalvoices.org/feed/",
  "globalvoices-en": "https://globalvoices.org/feed/",
  nih: "https://newsinhealth.nih.gov/rss",
} as const satisfies Record<OpenSourceId, string>;

const ITEMS_PER_SOURCE = 15;
const ITEMS_ON_PAGE = 30;

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

export interface OpenNewsListItem extends OpenNewsItem {
  sourceId: OpenSourceId;
}

/**
 * Global Voices feed items, full content included, from the first two feed pages so that an
 * article stays available for a while after it leaves the front page. Cached for an hour.
 */
async function getWordpressItems(sourceId: "globalvoices-ja" | "globalvoices-en") {
  "use cache";
  cacheLife("hours");

  const pages = await Promise.all(
    [FEEDS[sourceId], `${FEEDS[sourceId]}?paged=2`].map((url) =>
      fetchText(url).catch((error: unknown) => {
        log.warn("open feed page unavailable", { source: sourceId, err: error });
        return "";
      }),
    ),
  );
  // Throwing (rather than returning nothing) keeps a failed fetch out of the cache
  if (!pages[0]) throw new Error("feed unavailable");
  return pages.flatMap((xml) => parseWordpressFeed(xml, 40));
}

/** Stories from the latest two NIH News in Health issues. Cached for a day (monthly issues). */
async function getNihItems(): Promise<OpenNewsItem[]> {
  "use cache";
  cacheLife("days");

  const issues = parseNihIssues(await fetchText(FEEDS.nih));
  const pages = await Promise.all(
    issues.map(async (issue) =>
      parseNihIssueStories(await fetchText(issue.url), issue.url, issue.publishedAt),
    ),
  );
  return pages.flat();
}

async function listSource(sourceId: OpenSourceId): Promise<OpenNewsItem[]> {
  switch (sourceId) {
    case "kantei":
      return parseRss(await fetchText(FEEDS.kantei), 40).map((item) => ({
        ...item,
        summary: null,
      }));
    case "govuk":
      return parseAtom(await fetchText(FEEDS.govuk), 40);
    case "globalvoices-ja":
    case "globalvoices-en":
      return (await getWordpressItems(sourceId)).map(
        ({ title, url, summary, publishedAt }): OpenNewsItem => ({
          title,
          url,
          summary,
          publishedAt,
        }),
      );
    case "nih":
      return getNihItems();
  }
}

/**
 * Latest items from every open source of a language, cached for an hour for everyone.
 * Sources are interleaved so a busy feed cannot push the others off the page; a source that
 * is down is simply left out.
 */
export async function getOpenNews(language: LearningLanguage): Promise<OpenNewsListItem[]> {
  "use cache";
  cacheLife("hours");

  const lists = await Promise.all(
    OPEN_SOURCES_BY_LANGUAGE[language].map(async (source) => {
      try {
        const items = await listSource(source.id);
        return items
          .filter((item) => findOpenSource(item.url) === source)
          .slice(0, ITEMS_PER_SOURCE)
          .map((item) => ({ ...item, sourceId: source.id }));
      } catch (error) {
        log.warn("open feed unavailable", { source: source.id, err: error });
        return [];
      }
    }),
  );
  return interleaveBySource(lists).slice(0, ITEMS_ON_PAGE);
}

export interface OpenArticle {
  title: string;
  text: string;
  /** Writers and translators to credit (Global Voices); null when the source has none. */
  credits: string | null;
}

const findWordpressItem = async (
  sourceId: "globalvoices-ja" | "globalvoices-en",
  url: string,
): Promise<WordpressFeedItem> => {
  const item = (await getWordpressItems(sourceId)).find((candidate) => candidate.url === url);
  // Only listed articles are rewritten, so credits always come from the feed
  if (!item) throw new Error("article no longer in the feed");
  return item;
};

/**
 * Headline and body of an allow-listed article, cached for a day. Throws for URLs outside
 * the allow-list or pages without readable text, so failures are never cached.
 */
export async function getOpenArticle(url: string): Promise<OpenArticle> {
  "use cache";
  cacheLife("days");

  const source = findOpenSource(url);
  if (!source) throw new Error("not an open source");

  switch (source.id) {
    case "kantei": {
      const html = await fetchText(url);
      const title = /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.split("|")[0]?.trim() ?? "";
      return { title, text: extractKanteiText(html), credits: null };
    }
    case "globalvoices-ja":
    case "globalvoices-en": {
      const item = await findWordpressItem(source.id, url);
      return {
        title: item.title,
        text: extractGlobalVoicesText(item.contentHtml),
        credits: item.credits,
      };
    }
    case "nih":
      return { ...extractNihArticle(await fetchText(url)), credits: null };
    case "govuk": {
      // GOV.UK publishes every page as JSON at /api/content/<path>
      const page = govukPageSchema.parse(
        JSON.parse(await fetchText(`https://www.gov.uk/api/content${new URL(url).pathname}`)),
      );
      return {
        title: page.title,
        text: [page.description, htmlToText(page.details.body)].filter(Boolean).join("\n"),
        credits: null,
      };
    }
  }
}

const govukPageSchema = z.object({
  title: z.string().catch(""),
  description: z.string().catch(""),
  details: z.object({ body: z.string().catch("") }).catch({ body: "" }),
});
