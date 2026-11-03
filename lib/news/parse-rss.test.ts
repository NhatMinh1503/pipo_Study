import { describe, expect, it } from "vitest";

import { parseRss } from "./parse-rss";

const feed = `<?xml version="1.0"?><rss><channel><title>Feed</title>
<item><title><![CDATA[台風が&amp;接近]]></title><link>https://example.com/a</link><pubDate>Mon, 02 Nov 2026 09:00:00 +0900</pubDate><description>body must be ignored</description></item>
<item><title>No link</title></item>
<item><title>Bad link</title><link>javascript:alert(1)</link></item>
<item><title>Tom &quot;Q&quot; &lt;3</title><link>https://example.com/b</link><pubDate>not a date</pubDate></item>
</channel></rss>`;

describe("parseRss", () => {
  it("extracts title, link and ISO date; decodes CDATA and entities", () => {
    expect(parseRss(feed)).toEqual([
      {
        title: "台風が&接近",
        url: "https://example.com/a",
        publishedAt: "2026-11-02T00:00:00.000Z",
      },
      { title: 'Tom "Q" <3', url: "https://example.com/b", publishedAt: null },
    ]);
  });

  it("never returns the article body and respects the limit", () => {
    const items = parseRss(feed, 1);
    expect(items).toHaveLength(1);
    expect(JSON.stringify(items)).not.toContain("body must be ignored");
  });

  it("returns nothing for malformed input", () => {
    expect(parseRss("<html>not rss</html>")).toEqual([]);
  });
});
