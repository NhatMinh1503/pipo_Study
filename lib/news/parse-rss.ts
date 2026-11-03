export interface NewsItem {
  title: string;
  url: string;
  publishedAt: string | null;
}

/** Decodes CDATA and the XML entities feeds actually use. */
export const decodeEntities = (text: string) =>
  text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .trim();

const field = (item: string, name: string) => {
  const match = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(item);
  return match?.[1] ? decodeEntities(match[1]) : null;
};

/**
 * Headlines from an RSS 2.0 feed: title, link and date only — article bodies are never
 * copied. Items without a title or an http(s) link are skipped.
 */
export function parseRss(xml: string, limit = 20): NewsItem[] {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  return items
    .map((item) => {
      const pubDate = field(item, "pubDate");
      const time = pubDate ? new Date(pubDate) : null;
      return {
        title: field(item, "title") ?? "",
        url: field(item, "link") ?? "",
        publishedAt: time && !Number.isNaN(time.getTime()) ? time.toISOString() : null,
      };
    })
    .filter((item) => item.title && /^https?:\/\//.test(item.url))
    .slice(0, limit);
}
