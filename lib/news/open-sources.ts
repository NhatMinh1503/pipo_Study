import type { LearningLanguage } from "@/lib/schemas/common";

export type OpenSourceId = "kantei" | "govuk";

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
};

export const OPEN_SOURCE_BY_LANGUAGE: Record<LearningLanguage, OpenSource> = {
  ja: OPEN_SOURCES.kantei,
  en: OPEN_SOURCES.govuk,
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
 * presenting edited text as if it were the government's unedited original.
 */
export function attributionFor(source: OpenSource, title: string, url: string): string {
  if (source.id === "kantei") {
    return `「${title}」（${source.name}）（${url}）をもとに pipo が学習者向けに加工して作成`;
  }
  return `Adapted for learners by pipo from “${title}” (${source.name}, ${url}). Contains public sector information licensed under the Open Government Licence v3.0.`;
}
