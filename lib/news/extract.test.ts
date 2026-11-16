import { describe, expect, it } from "vitest";

import {
  extractGlobalVoicesText,
  extractNihArticle,
  parseGlobalVoicesCredits,
  parseNihIssues,
  parseNihIssueStories,
  parseWordpressFeed,
} from "./extract";

// Shaped like the real Global Voices feed (WordPress RSS, full article in content:encoded)
const GV_FOOTER_JA = `<div class='gv-rss-footer'><strong><div class='text-credits-container'><div class='text-credits-section'><span class='credit-label'>記者 (English)</span> <a href='https://jp.globalvoices.org/author/oiwan-lam/' class='user-link'>Oiwan Lam</a></div><div class='text-credits-section'><span class='credit-label'>翻訳 (日本語)</span> <a href='https://jp.globalvoices.org/author/yasuhisa/' class='user-link'>Yasuhisa Miyata</a></div></div><span class='source-link'><a href='https://globalvoices.org/x/'>原文を見る (English)</a></span></strong></div>`;

const GV_CONTENT_JA = `<p><big class='tagline'><em>30年以上の年月</em></big></p><div id="attachment_1" style="width: 1200px" class="wp-caption aligncenter"><img src="x.jpg" /><p class="wp-caption-text">写真：Shutterstock</p></div>
<p>シラヤ族は台湾で原住民族として認められた。</p>
<blockquote class="translation"><p>私は台湾出身で、シラヤ族です。</p></blockquote>
<iframe src="https://www.youtube.com/embed/x"></iframe>
<p>ほかの部族も申請を続けている。</p>
<div class="contributors">校正：<a href="https://jp.globalvoices.org/author/m/">Moegi Tanaka</a></div>
${GV_FOOTER_JA}`;

const gvFeed = (items: string) => `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel><title>Global Voices 日本語</title>${items}</channel></rss>`;

const gvItem = (
  title: string,
  link: string,
  content: string,
  creator = "Yasuhisa Miyata",
) => `<item>
  <title>${title}</title>
  <link>${link}</link>
  <dc:creator><![CDATA[${creator}]]></dc:creator>
  <pubDate>Mon, 02 Nov 2026 07:06:38 +0000</pubDate>
  <category><![CDATA[人権]]></category>
  <guid isPermaLink="false">https://jp.globalvoices.org/?p=65795</guid>
  <description><![CDATA[7月30日に公式に第17番目の原住民族として認められた。]]></description>
  <content:encoded><![CDATA[${content}]]></content:encoded>
</item>`;

describe("parseWordpressFeed", () => {
  const items = parseWordpressFeed(
    gvFeed(
      gvItem(
        "台湾のシラヤ族が原住民として認められるまで",
        "https://jp.globalvoices.org/2026/11/02/65795/",
        GV_CONTENT_JA,
      ) +
        gvItem(
          "Tea &amp; culture",
          "https://globalvoices.org/2026/11/15/tea/",
          "<p>Body</p>",
          "Rebecca Cluett",
        ) +
        gvItem("", "https://jp.globalvoices.org/2026/11/01/1/", "<p>x</p>"),
    ),
  );

  it("reads title, link, summary, date and the full content", () => {
    expect(items[0]).toMatchObject({
      title: "台湾のシラヤ族が原住民として認められるまで",
      url: "https://jp.globalvoices.org/2026/11/02/65795/",
      summary: "7月30日に公式に第17番目の原住民族として認められた。",
      publishedAt: "2026-11-02T07:06:38.000Z",
    });
    expect(items[0]?.contentHtml).toContain("シラヤ族は台湾で");
  });

  it("credits writer and translator from the footer, else the feed author", () => {
    expect(items[0]?.credits).toBe("記者 (English) Oiwan Lam · 翻訳 (日本語) Yasuhisa Miyata");
    expect(items[1]).toMatchObject({ title: "Tea & culture", credits: "Rebecca Cluett" });
  });

  it("skips items without a title and handles an empty feed", () => {
    expect(items).toHaveLength(2);
    expect(parseWordpressFeed("")).toEqual([]);
  });
});

describe("parseGlobalVoicesCredits", () => {
  it("reads the English credit labels", () => {
    const footer = `<span class='credit-label'>Written (Français) by</span> <a class='user-link'>Mamisoa Raveloaritiana</a><span class='credit-label'>Translated (English) by</span> <a class='user-link'>Rebecca Cluett</a>`;
    expect(parseGlobalVoicesCredits(footer)).toBe(
      "Written (Français) by Mamisoa Raveloaritiana · Translated (English) by Rebecca Cluett",
    );
  });

  it("returns null without a credits footer", () => {
    expect(parseGlobalVoicesCredits("<p>x</p>")).toBeNull();
  });
});

describe("extractGlobalVoicesText", () => {
  it("keeps Global Voices' own paragraphs and drops quotes, embeds, captions and credits", () => {
    expect(extractGlobalVoicesText(GV_CONTENT_JA)).toBe(
      "30年以上の年月\nシラヤ族は台湾で原住民族として認められた。\nほかの部族も申請を続けている。",
    );
  });

  it("returns an empty string for empty content", () => {
    expect(extractGlobalVoicesText("")).toBe("");
  });
});

// Shaped like the real NIH News in Health pages (Drupal)
const NIH_RSS = `<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel>
<item><title>November 2026</title><link>https://newsinhealth.nih.gov/2026/11</link>
<description>&lt;div&gt;Wearable Tech : Providing Insights into Health &lt;/div&gt;</description>
<guid isPermaLink="false">November 2026</guid><pubDate>Nov 2, 2026
</pubDate></item>
<item><title>October 2026</title><link>https://newsinhealth.nih.gov/2026/10</link><pubDate>Oct 1, 2026</pubDate></item>
<item><title>September 2026</title><link>https://newsinhealth.nih.gov/2026/09</link><pubDate>Sep 4, 2026</pubDate></item>
</channel></rss>`;

const NIH_ISSUE = `<div class="view-content">
<h3 class="views-field views-field-title"><a href="/2026/11/wearable-tech" hreflang="en">Wearable Tech</a></h3>
<a href="/2026/11/wearable-tech"><img alt="cover" /></a>
<h3><a href="/2026/11/protect-your-bone-health" hreflang="en">Protect Your Bone Health</a></h3>
<h3><a href="https://newsinhealth.nih.gov/2026/11/nih-health-information-portal" hreflang="en">NIH Health Information Portal</a></h3>
<a href="/2024/01/older-story">Older story</a>
</div>`;

const NIH_ARTICLE = `<html><head><title>Wearable Tech | NIH News in Health</title></head><body>
<p>A monthly newsletter from the National Institutes of Health</p>
<div class="nihnih-theme-colors-green"><div>November 2026 Print this issue</div>
<h1><span>Wearable Tech</span></h1>
<p>Providing Insights into Health</p>
<p>Millions of Americans wear devices that track info&nbsp;about their health.</p>
<h2>Watching for signs</h2>
<p>Researchers are studying how to use the data.</p>
<script>var p = "<p>x</p>";</script>
</div>
<aside class="l-region--sidebar-second"><p>Share Our Materials: Reprint our articles.</p></aside>
</body></html>`;

describe("NIH News in Health", () => {
  it("lists the latest issue pages with their dates", () => {
    expect(parseNihIssues(NIH_RSS)).toEqual([
      {
        url: "https://newsinhealth.nih.gov/2026/11",
        publishedAt: new Date("Nov 2, 2026").toISOString(),
      },
      {
        url: "https://newsinhealth.nih.gov/2026/10",
        publishedAt: new Date("Oct 1, 2026").toISOString(),
      },
    ]);
  });

  it("lists an issue's own stories once each, without promotion pages", () => {
    const stories = parseNihIssueStories(
      NIH_ISSUE,
      "https://newsinhealth.nih.gov/2026/11",
      "2026-11-02T00:00:00.000Z",
    );
    expect(stories.map((story) => [story.title, story.url])).toEqual([
      ["Wearable Tech", "https://newsinhealth.nih.gov/2026/11/wearable-tech"],
      ["Protect Your Bone Health", "https://newsinhealth.nih.gov/2026/11/protect-your-bone-health"],
    ]);
    expect(stories[0]?.publishedAt).toBe("2026-11-02T00:00:00.000Z");
  });

  it("extracts the story between the heading and the sidebar", () => {
    expect(extractNihArticle(NIH_ARTICLE)).toEqual({
      title: "Wearable Tech",
      text: [
        "Providing Insights into Health",
        "Millions of Americans wear devices that track info about their health.",
        "Watching for signs",
        "Researchers are studying how to use the data.",
      ].join("\n"),
    });
  });

  it("returns no text for a page without a heading", () => {
    expect(extractNihArticle("<p>x</p>").text).toBe("");
    expect(parseNihIssues("")).toEqual([]);
  });
});
