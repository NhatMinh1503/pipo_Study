import { decodeEntities } from "./parse-rss";

export interface OpenNewsItem {
  title: string;
  url: string;
  summary: string | null;
  publishedAt: string | null;
}

const dropScripts = (html: string) =>
  html.replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, " ");

const stripTags = (html: string) =>
  decodeEntities(
    dropScripts(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|li|h[1-6]|div)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split("\n")
    .map((line) => line.replace(/[ \t　]+/g, " ").trim())
    .filter(Boolean);

/** Paragraph text of an HTML fragment, one paragraph per line. */
export function htmlToText(html: string, maxLength = 4000): string {
  return stripTags(html).join("\n").slice(0, maxLength);
}

// Interface text around 首相官邸 articles that is not part of the story
const KANTEI_NOISE =
  /URLをコピー|動画|ミニプレーヤー|閉じる|一覧に戻る|新着記事|再生できない|^写真|総理の一日$/;

/**
 * Body of a 首相官邸 article: the <p> paragraphs inside <main>, minus player and navigation
 * labels. Returns "" when the page has no recognisable body.
 */
export function extractKanteiText(html: string, maxLength = 4000): string {
  const main = dropScripts(/<main[\s>][\s\S]*?<\/main>/i.exec(html)?.[0] ?? "");
  const paragraphs = main.match(/<p[\s>][\s\S]*?<\/p>/gi) ?? [];
  return paragraphs
    .flatMap((paragraph) => stripTags(paragraph))
    .filter((line) => !KANTEI_NOISE.test(line))
    .join("\n")
    .slice(0, maxLength);
}

const atomField = (entry: string, name: string) => {
  const match = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(entry);
  return match?.[1] ? decodeEntities(match[1]) : null;
};

/** Entries of an Atom feed (GOV.UK): title, alternate link, summary and update time. */
export function parseAtom(xml: string, limit = 20): OpenNewsItem[] {
  const entries = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  return entries
    .map((entry) => {
      const updated = atomField(entry, "updated");
      const time = updated ? new Date(updated) : null;
      const summary = atomField(entry, "summary");
      return {
        title: atomField(entry, "title") ?? "",
        url: /<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i.exec(entry)?.[1] ?? "",
        summary: summary ? stripTags(summary).join(" ") : null,
        publishedAt: time && !Number.isNaN(time.getTime()) ? time.toISOString() : null,
      };
    })
    .filter((item) => item.title && /^https:\/\//.test(item.url))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Global Voices (WordPress RSS with the full article in content:encoded)
// ---------------------------------------------------------------------------

export interface WordpressFeedItem extends OpenNewsItem {
  /** Writers and translators as Global Voices credits them, e.g. "記者 (English) Oiwan Lam". */
  credits: string | null;
  /** Article HTML from content:encoded. */
  contentHtml: string;
}

const cdataField = (item: string, name: string) => {
  const match = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(item);
  return match?.[1] ? match[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1") : null;
};

/**
 * Credit lines from the Global Voices feed footer (`<span class='credit-label'>Written by</span>
 * <a class='user-link'>Name</a>`), joined with " · ". Null when the footer is missing.
 */
export function parseGlobalVoicesCredits(contentHtml: string): string | null {
  const credits = [
    ...contentHtml.matchAll(
      /<span[^>]*class=["']credit-label["'][^>]*>([\s\S]*?)<\/span>\s*<a[^>]*>([\s\S]*?)<\/a>/gi,
    ),
  ]
    .map(
      ([, label = "", name = ""]) => `${stripTags(label).join(" ")} ${stripTags(name).join(" ")}`,
    )
    .map((line) => line.trim())
    .filter(Boolean);
  return credits.length > 0 ? credits.join(" · ") : null;
}

/** Items of a WordPress RSS feed with their full content and Global Voices credits. */
export function parseWordpressFeed(xml: string, limit = 20): WordpressFeedItem[] {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  return items
    .map((item) => {
      const pubDate = cdataField(item, "pubDate");
      const time = pubDate ? new Date(pubDate) : null;
      const contentHtml = cdataField(item, "content:encoded") ?? "";
      const description = cdataField(item, "description");
      const creator = cdataField(item, "dc:creator");
      return {
        title: decodeEntities(cdataField(item, "title") ?? ""),
        url: decodeEntities(cdataField(item, "link") ?? ""),
        summary: description ? stripTags(description).join(" ") || null : null,
        publishedAt: time && !Number.isNaN(time.getTime()) ? time.toISOString() : null,
        credits:
          parseGlobalVoicesCredits(contentHtml) ?? (creator ? decodeEntities(creator) : null),
        contentHtml,
      };
    })
    .filter((item) => item.title && /^https:\/\//.test(item.url))
    .slice(0, limit);
}

// Quotes and embeds belong to third parties (CC BY covers Global Voices' own text only);
// captions, credits and the RSS footer are not part of the story
const GLOBAL_VOICES_DROP =
  /<(blockquote|figure|iframe|svg|script|style)[\s>][\s\S]*?<\/\1>|<div[^>]*class=["'](?:wp-caption|contributors)[^"']*["'][\s\S]*?<\/div>/gi;
// The credits footer closes the article; everything after it is boilerplate
const GLOBAL_VOICES_FOOTER = /<div[^>]*class=["']gv-rss-footer/i;

/** Story text of a Global Voices article: its own paragraphs, without quotes and embeds. */
export function extractGlobalVoicesText(contentHtml: string, maxLength = 4000): string {
  const [story = ""] = contentHtml.split(GLOBAL_VOICES_FOOTER);
  return htmlToText(story.replace(GLOBAL_VOICES_DROP, " "), maxLength);
}

// ---------------------------------------------------------------------------
// NIH News in Health (RSS lists monthly issues; each issue page links its stories)
// ---------------------------------------------------------------------------

const NIH_ORIGIN = "https://newsinhealth.nih.gov";
// Recurring promotion pages, not stories
const NIH_SKIP = /health-information-portal|wellness-toolkits|research-in-context/;

const parseRssItems = (xml: string) =>
  (xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? []).map((item) => {
    const pubDate = cdataField(item, "pubDate")?.trim();
    const time = pubDate ? new Date(pubDate) : null;
    return {
      url: decodeEntities(cdataField(item, "link") ?? ""),
      publishedAt: time && !Number.isNaN(time.getTime()) ? time.toISOString() : null,
    };
  });

/** Issue pages listed in the NIH News in Health RSS feed, newest first. */
export function parseNihIssues(
  xml: string,
  limit = 2,
): Array<{ url: string; publishedAt: string | null }> {
  return parseRssItems(xml)
    .filter((item) => item.url.startsWith(`${NIH_ORIGIN}/20`))
    .slice(0, limit);
}

/** Stories linked from one issue page (`/2026/11/wearable-tech`), in page order. */
export function parseNihIssueStories(
  html: string,
  issueUrl: string,
  publishedAt: string | null,
): OpenNewsItem[] {
  const issuePath = new URL(issueUrl).pathname.replace(/\/$/, "");
  const seen = new Set<string>();
  const stories: OpenNewsItem[] = [];
  for (const [, path = "", label = ""] of html.matchAll(
    /<a[^>]*href="((?:https:\/\/newsinhealth\.nih\.gov)?\/20\d\d\/\d\d\/[a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const url = `${NIH_ORIGIN}${path.replace(NIH_ORIGIN, "")}`;
    const title = stripTags(label).join(" ");
    if (!url.startsWith(`${NIH_ORIGIN}${issuePath}/`) || NIH_SKIP.test(url)) continue;
    if (!title || seen.has(url)) continue;
    seen.add(url);
    stories.push({ title, url, summary: null, publishedAt });
  }
  return stories;
}

/**
 * Title and story text of a NIH News in Health article: the paragraphs between the page
 * heading and the sidebar (contact box, "Share Our Materials", references).
 */
export function extractNihArticle(html: string, maxLength = 4000): { title: string; text: string } {
  const title =
    decodeEntities(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "")
      .split("|")[0]
      ?.trim() ?? "";
  const start = html.search(/<h1[\s>]/i);
  const end = html.indexOf("sidebar-second", start);
  if (start < 0) return { title, text: "" };
  const body = dropScripts(html.slice(start, end < 0 ? undefined : end));
  const blocks = body.match(/<(p|h2|h3|li)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  return {
    title,
    text: blocks
      .flatMap((block) => stripTags(block))
      .join("\n")
      .slice(0, maxLength),
  };
}
