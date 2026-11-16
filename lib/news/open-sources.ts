import type { LearningLanguage } from "@/lib/schemas/common";

export type OpenSourceId = "kantei" | "govuk" | "globalvoices-ja" | "globalvoices-en" | "nih";

export interface OpenSource {
  id: OpenSourceId;
  language: LearningLanguage;
  /** Shown to learners next to every lesson made from this source. */
  name: string;
  license: string;
  licenseUrl: string;
  homeUrl: string;
  /** Only article URLs starting with this are ever fetched (no arbitrary URLs from clients). */
  articlePrefix: string;
}

/**
 * Sources whose licence allows rewriting with attribution. Commercial news (NHK, BBC…)
 * is deliberately absent: those stay headline-and-link only.
 * - Global Voices: CC BY 3.0 (attribute Global Voices and the writers; quoted third-party
 *   material and images are not ours to reuse, so only the writers' own text is used)
 * - NIH News in Health: U.S. government work, "not copyrighted"; NIH asks to be credited
 */
export const OPEN_SOURCES: Record<OpenSourceId, OpenSource> = {
  kantei: {
    id: "kantei",
    language: "ja",
    name: "首相官邸ホームページ",
    license: "PDL1.0",
    licenseUrl: "https://www.digital.go.jp/resources/open_data/public_data_license_v1.0",
    homeUrl: "https://www.kantei.go.jp/",
    articlePrefix: "https://www.kantei.go.jp/jp/",
  },
  govuk: {
    id: "govuk",
    language: "en",
    name: "GOV.UK",
    license: "OGL v3.0",
    licenseUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    homeUrl: "https://www.gov.uk/",
    articlePrefix: "https://www.gov.uk/government/news/",
  },
  "globalvoices-ja": {
    id: "globalvoices-ja",
    language: "ja",
    name: "Global Voices 日本語",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/deed.ja",
    homeUrl: "https://jp.globalvoices.org/",
    articlePrefix: "https://jp.globalvoices.org/20",
  },
  "globalvoices-en": {
    id: "globalvoices-en",
    language: "en",
    name: "Global Voices",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
    homeUrl: "https://globalvoices.org/",
    articlePrefix: "https://globalvoices.org/20",
  },
  nih: {
    id: "nih",
    language: "en",
    name: "NIH News in Health",
    license: "Public domain",
    licenseUrl: "https://www.usa.gov/government-works",
    homeUrl: "https://newsinhealth.nih.gov/",
    articlePrefix: "https://newsinhealth.nih.gov/20",
  },
};

/** Sources per learning language, in the order their items are interleaved on the page. */
export const OPEN_SOURCES_BY_LANGUAGE: Record<LearningLanguage, OpenSource[]> = {
  ja: [OPEN_SOURCES["globalvoices-ja"], OPEN_SOURCES.kantei],
  en: [OPEN_SOURCES["globalvoices-en"], OPEN_SOURCES.nih, OPEN_SOURCES.govuk],
};

/** The open source an article URL belongs to, or null for anything outside the allow-list. */
export function findOpenSource(url: string): OpenSource | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  // Re-serialise so tricks like "https://www.gov.uk@evil.test/" or backslashes cannot pass
  if (parsed.username || parsed.password || parsed.port) return null;
  const normalized = `${parsed.origin}${parsed.pathname}`;
  return (
    Object.values(OPEN_SOURCES).find(
      (source) =>
        normalized.startsWith(source.articlePrefix) && normalized === url.split(/[?#]/)[0],
    ) ?? null
  );
}

/**
 * Attribution required by each licence, including the "edited" notice: PDL1.0 forbids
 * presenting edited text as if it were the government's unedited original, and CC BY asks
 * to name the writers and say that the work was changed.
 * `credits` names the writers and translators (Global Voices), when known.
 */
export function attributionFor(
  source: OpenSource,
  title: string,
  url: string,
  credits: string | null = null,
): string {
  switch (source.id) {
    case "kantei":
      return `「${title}」（${source.name}）（${url}）をもとに pipo が学習者向けに加工して作成`;
    case "globalvoices-ja":
      return `「${title}」（${credits ? `${credits}、` : ""}${source.name}、${url}、CC BY 3.0）をもとに pipo が学習者向けに書き直して作成`;
    case "globalvoices-en":
      return `Adapted for learners by pipo from “${title}”${credits ? ` (${credits})` : ""}, ${source.name}, ${url}, licensed under CC BY 3.0.`;
    case "nih":
      return `Adapted for learners by pipo from “${title}” (${source.name}, ${url}). Not reviewed by NIH.`;
    case "govuk":
      return `Adapted for learners by pipo from “${title}” (${source.name}, ${url}). Contains public sector information licensed under the Open Government Licence v3.0.`;
  }
}
