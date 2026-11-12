import { describe, expect, it } from "vitest";

import { buildEnglishDictionary, type EcdictRow } from "./build-english";

const row = (word: string, extra: Partial<EcdictRow> = {}): EcdictRow => ({
  word,
  phonetic: "",
  definition: "",
  collins: "",
  oxford: "",
  bnc: "0",
  frq: "0",
  exchange: "",
  ...extra,
});

const senseIndexLines = [
  "run%2:38:00:: 02095311 1 81",
  "run%1:04:00:: 00795720 1 3",
  "take_off%2:38:00:: 01970000 1 5",
];
const dataLines = [
  '02095311 38 v 02 run 0 scarper 0 001 @ 02079933 v 0000 | move fast by using one\'s feet; "run home"',
  "00795720 04 n 01 run 0 000 | a score in baseball",
];

describe("buildEnglishDictionary", () => {
  const { entries, forms } = buildEnglishDictionary({
    ecdict: [
      row("run", { phonetic: "rʌn", frq: "202", oxford: "1", exchange: "p:ran/i:running/3:runs" }),
      row("ran", { exchange: "0:run/1:p" }),
      row("ofx", { phonetic: "ɒv", frq: "2", definition: "prep. Denoting from" }),
      row("zyzzyva", { phonetic: "x", frq: "90000" }),
      row("take off", { frq: "100" }),
      row("ghost", { frq: "10" }),
      row("went", { exchange: "0:go/1:p" }),
      row("can", { phonetic: "kæn", frq: "40" }),
    ],
    senseIndexLines: [...senseIndexLines, "can%1:06:00:: 02951843 1 9"],
    dataLines: [...dataLines, "02951843 06 n 02 can 0 tin 0 000 | airtight sealed metal container"],
    cmudictLines: ["run R AH1 N", "ran R AE1 N", "beautiful B Y UW1 T AH0 F AH0 L"],
  });

  it("uses WordNet senses with the most frequent part of speech first", () => {
    const run = entries.find((entry) => entry.word === "run");
    expect(run).toMatchObject({ ipa: "rʌn", rank: 202, oxford: true });
    expect(run?.senses[0]).toEqual({
      pos: "verb",
      gloss: "move fast by using one's feet",
      example: "run home",
    });
    expect(run?.senses[1]?.pos).toBe("noun");
  });

  it("prefers curated senses for function words over WordNet", () => {
    expect(entries.find((entry) => entry.word === "can")?.senses[0]).toMatchObject({
      pos: "verb",
      gloss: "to be able to; to be allowed to",
    });
  });

  it("adds curated words that ECDICT only spells with a capital", () => {
    expect(entries.find((entry) => entry.word === "i")?.senses[0]?.pos).toBe("pronoun");
  });

  it("falls back to the ECDICT definition when nothing else covers a word", () => {
    expect(entries.find((entry) => entry.word === "ofx")?.senses).toEqual([
      { pos: "preposition", gloss: "Denoting from", example: null },
    ]);
  });

  it("leaves out rare words, phrases and words with nothing to show", () => {
    const words = entries.map((entry) => entry.word);
    expect(words).not.toContain("zyzzyva");
    expect(words).not.toContain("take off");
    expect(words).not.toContain("ghost");
  });

  it("links inflected forms only to stored lemmas", () => {
    expect(forms).toEqual(
      expect.arrayContaining([
        { form: "ran", lemma: "run", kind: "past", ipa: "ræn" },
        { form: "running", lemma: "run", kind: "presentParticiple", ipa: null },
      ]),
    );
    // "ran" is listed by both sides but stored once; "went" → go is dropped (no go entry)
    expect(forms.filter((f) => f.form === "ran")).toHaveLength(1);
    expect(forms.some((f) => f.form === "went")).toBe(false);
  });

  it("returns only the curated function words for empty input", () => {
    const empty = buildEnglishDictionary({ ecdict: [], senseIndexLines: [], dataLines: [] });
    expect(empty.forms).toEqual([]);
    expect(empty.entries.every((entry) => entry.rank === null && entry.oxford)).toBe(true);
  });
});
