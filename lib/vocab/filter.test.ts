import { describe, expect, it } from "vitest";

import { filterVocab } from "./filter";
import type { VocabItem } from "./types";

const item = (overrides: Partial<VocabItem>): VocabItem => ({
  id: crypto.randomUUID(),
  language: "ja",
  term: "駅",
  reading: "えき",
  partOfSpeech: "noun",
  meaning: "nhà ga",
  contextSentence: null,
  contextTranslation: null,
  createdAt: "2026-11-02T00:00:00Z",
  dueDate: null,
  ...overrides,
});

const items = [
  item({ term: "駅", reading: "えき", meaning: "nhà ga" }),
  item({ term: "安い", reading: "やすい", meaning: "rẻ" }),
  item({ language: "en", term: "Station", reading: null, meaning: "nhà ga" }),
];

describe("filterVocab", () => {
  it("returns everything for an empty query", () => {
    expect(filterVocab(items, { query: " ", language: "all" })).toHaveLength(3);
  });

  it("matches reading and meaning, not only the term", () => {
    expect(filterVocab(items, { query: "やす", language: "all" }).map((i) => i.term)).toEqual([
      "安い",
    ]);
    expect(filterVocab(items, { query: "NHÀ GA", language: "all" })).toHaveLength(2);
  });

  it("is width-insensitive (full-width latin)", () => {
    expect(filterVocab(items, { query: "ＳＴＡＴＩＯＮ", language: "all" })).toHaveLength(1);
  });

  it("filters by language", () => {
    expect(filterVocab(items, { query: "nhà ga", language: "ja" }).map((i) => i.term)).toEqual([
      "駅",
    ]);
  });
});
