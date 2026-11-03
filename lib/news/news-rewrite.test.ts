import { describe, expect, it } from "vitest";

import { extractKanteiText, htmlToText, parseAtom } from "./extract";
import { attributionFor, findOpenSource, OPEN_SOURCES } from "./open-sources";
import { copiesSource, longestCopiedRun } from "./verbatim";

describe("findOpenSource", () => {
  it.each([
    ["https://www.kantei.go.jp/jp/105/actions/202611/02hyoukei.html", "kantei"],
    ["https://www.gov.uk/government/news/one-million-more-scans", "govuk"],
  ])("accepts %s", (url, id) => {
    expect(findOpenSource(url)?.id).toBe(id);
  });

  it.each([
    "https://www3.nhk.or.jp/news/html/x.html",
    "https://www.gov.uk/guidance/x",
    "https://www.gov.uk@evil.test/government/news/x",
    "https://www.kantei.go.jp:8443/jp/x.html",
    "http://www.kantei.go.jp/jp/x.html",
    "https://evil.test/https://www.kantei.go.jp/jp/x.html",
    "not a url",
  ])("rejects %s", (url) => {
    expect(findOpenSource(url)).toBeNull();
  });
});

describe("attributionFor", () => {
  it("says the Japanese text was edited, as PDL1.0 requires", () => {
    const text = attributionFor(OPEN_SOURCES.kantei, "表敬", "https://www.kantei.go.jp/jp/a.html");
    expect(text).toContain("「表敬」（首相官邸ホームページ）");
    expect(text).toContain("加工して作成");
  });

  it("carries the OGL statement", () => {
    expect(
      attributionFor(OPEN_SOURCES.govuk, "Scans", "https://www.gov.uk/government/news/s"),
    ).toContain("Open Government Licence v3.0");
  });
});

describe("extractKanteiText", () => {
  const page = `<html><nav><p>メニュー</p></nav><main>
    <h1>総理の一日</h1><p>URLをコピーしました</p>
    <p>動画が再生できない方は<a>こちら</a></p>
    <p>令和８年１１月２日、高市総理は、総理大臣官邸で表敬を受けました。</p>
    <p>総理の一日一覧に戻る</p><script>var p = "<p>x</p>";</script></main></html>`;

  it("keeps the story paragraphs only", () => {
    expect(extractKanteiText(page)).toBe(
      "令和８年１１月２日、高市総理は、総理大臣官邸で表敬を受けました。",
    );
  });

  it("returns an empty string without a main element", () => {
    expect(extractKanteiText("<p>hello</p>")).toBe("");
  });
});

describe("htmlToText", () => {
  it("turns paragraphs and list items into lines and decodes entities", () => {
    expect(htmlToText("<p>Scans &amp; tests</p><ul><li>One&nbsp;million</li></ul>")).toBe(
      "Scans & tests\nOne million",
    );
  });
});

describe("parseAtom", () => {
  const feed = `<feed><entry><title>Scans</title>
    <link rel="alternate" type="text/html" href="https://www.gov.uk/government/news/scans"/>
    <summary type="html">More &lt;b&gt;scans&lt;/b&gt; a year.</summary>
    <updated>2026-11-03T00:05:07+00:00</updated></entry>
    <entry><title></title><link rel="alternate" href="https://www.gov.uk/x"/></entry></feed>`;

  it("reads title, link, plain-text summary and date; skips untitled entries", () => {
    expect(parseAtom(feed)).toEqual([
      {
        title: "Scans",
        url: "https://www.gov.uk/government/news/scans",
        summary: "More scans a year.",
        publishedAt: "2026-11-03T00:05:07.000Z",
      },
    ]);
  });
});

describe("verbatim guard", () => {
  const source = "高市総理は、総理大臣官邸で防災士アンバサダーの野口絵子氏による表敬を受けました。";

  it("measures Japanese runs by characters, ignoring punctuation", () => {
    expect(longestCopiedRun("今日は、晴れ。", "今日は晴れ", "ja")).toBe(5);
  });

  it("flags a copied Japanese clause but allows names", () => {
    expect(
      copiesSource(
        source,
        "総理大臣官邸で防災士アンバサダーの野口絵子氏による表敬を受けました。",
        "ja",
      ),
    ).toBe(true);
    expect(
      copiesSource(source, "総理は野口絵子さんに会いました。防災について話しました。", "ja"),
    ).toBe(false);
  });

  it("measures English runs by words, case-insensitively", () => {
    const en =
      "Patients across England are benefiting from faster cancer diagnoses after new scanners arrived.";
    expect(
      copiesSource(en, "patients across england are benefiting from faster cancer diagnoses", "en"),
    ).toBe(true);
    expect(copiesSource(en, "Many people in England now get cancer tests sooner.", "en")).toBe(
      false,
    );
  });

  it("handles empty text", () => {
    expect(longestCopiedRun("", "abc", "ja")).toBe(0);
  });
});
