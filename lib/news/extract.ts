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
