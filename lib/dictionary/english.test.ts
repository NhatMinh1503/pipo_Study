import { describe, expect, it } from "vitest";

import {
  arpabetToIpa,
  isLowercaseMember,
  normalizeIpa,
  orderEnglishEntries,
  parseDataLine,
  parseExchange,
  parseCmudictLine,
  parseLegacyDefinition,
  parseSenseIndexLine,
  selectWordnetSenses,
  type WordnetGloss,
  type WordnetSenseKey,
} from "./english";

describe("normalizeIpa", () => {
  it("converts ECDICT stress, length and schwa marks to IPA", () => {
    expect(normalizeIpa("'bju:tiful")).toBe("ˈbjuːtiful");
    expect(normalizeIpa(",serәn'dipiti")).toBe("ˌserənˈdipiti");
  });

  it("returns null for an empty value", () => {
    expect(normalizeIpa("  ")).toBeNull();
  });
});

describe("parseExchange", () => {
  it("lists inflected forms of a lemma", () => {
    expect(parseExchange("p:ran/i:running/d:run/3:runs/s:runs").forms).toEqual([
      { form: "ran", kind: "past" },
      { form: "running", kind: "presentParticiple" },
      { form: "run", kind: "pastParticiple" },
      { form: "runs", kind: "thirdPerson" },
      { form: "runs", kind: "plural" },
    ]);
  });

  it("reads the lemma of an inflected form", () => {
    expect(parseExchange("0:leave/1:dp/d:left/p:left")).toMatchObject({
      lemma: "leave",
      lemmaKinds: ["pastParticiple", "past"],
    });
  });

  it("ignores empty, unknown and phrase values", () => {
    expect(parseExchange("")).toEqual({ forms: [], lemma: null, lemmaKinds: [] });
    expect(parseExchange("x:foo/s:/p:set up").forms).toEqual([]);
  });
});

describe("parseLegacyDefinition", () => {
  it("parses part-of-speech lines and joins continuation lines", () => {
    expect(
      parseLegacyDefinition(
        "conj. A particle which expresses the relation\n   of connection.\nfoo bar\nprep. Denoting from",
      ),
    ).toEqual([
      {
        pos: "conjunction",
        gloss: "A particle which expresses the relation of connection.",
        example: null,
      },
      { pos: "preposition", gloss: "Denoting from", example: null },
    ]);
  });

  it("reads escaped newlines and stops at the limit", () => {
    expect(parseLegacyDefinition("n. one\\nn. two\\nv. three", 2)).toHaveLength(2);
  });

  it("shortens very long glosses", () => {
    const [sense] = parseLegacyDefinition(`n. ${"word, ".repeat(60)}`);
    expect(sense?.gloss.length).toBeLessThanOrEqual(201);
    expect(sense?.gloss.endsWith("…")).toBe(true);
  });

  it("returns nothing for an empty definition", () => {
    expect(parseLegacyDefinition("")).toEqual([]);
  });
});

describe("WordNet parsing", () => {
  it("parses an index.sense line", () => {
    expect(parseSenseIndexLine("run%2:38:00:: 02095311 1 81")).toEqual({
      lemma: "run",
      pos: "verb",
      offset: "02095311",
      senseNumber: 1,
      tagCount: 81,
    });
    expect(parseSenseIndexLine("broken")).toBeNull();
  });

  it("parses a data line into definition and first example", () => {
    const line =
      '02095311 38 v 02 run 0 scarper 0 001 @ 02079933 v 0000 | move fast by using one\'s feet; "Don\'t run--you\'ll fall"; "run home"  ';
    expect(parseDataLine(line)).toEqual({
      offset: "02095311",
      pos: "verb",
      words: ["run", "scarper"],
      gloss: "move fast by using one's feet",
      example: "Don't run--you'll fall",
    });
  });

  it("skips the license header and glosses without examples get null", () => {
    expect(parseDataLine("  1 This software and database is being provided")).toBeNull();
    expect(parseDataLine("00001740 03 n 01 entity 0 000 | that which is perceived")).toMatchObject({
      gloss: "that which is perceived",
      example: null,
    });
  });
});

describe("selectWordnetSenses", () => {
  const key = (pos: WordnetSenseKey["pos"], senseNumber: number, tagCount: number) => ({
    lemma: "run",
    pos,
    offset: `${pos}-${senseNumber}`,
    senseNumber,
    tagCount,
  });
  const glossOf = (k: WordnetSenseKey): WordnetGloss => ({
    offset: k.offset,
    pos: k.pos,
    words: ["run"],
    gloss: `gloss ${k.offset}`,
    example: null,
  });

  it("leads with the most frequent part of speech and keeps WordNet order inside it", () => {
    const keys = [key("noun", 1, 3), key("noun", 2, 1), key("verb", 2, 20), key("verb", 1, 81)];
    expect(selectWordnetSenses(keys, glossOf).map((s) => s.gloss)).toEqual([
      "gloss verb-1",
      "gloss verb-2",
      "gloss noun-1",
      "gloss noun-2",
    ]);
  });

  it("falls back to the number of senses when nothing is tagged", () => {
    const keys = [key("adverb", 1, 0), key("noun", 1, 0), key("noun", 2, 0)];
    expect(selectWordnetSenses(keys, glossOf)[0]?.pos).toBe("noun");
  });

  it("limits senses per part of speech and parts of speech", () => {
    const keys = [
      key("noun", 1, 1),
      key("noun", 2, 1),
      key("noun", 3, 1),
      key("verb", 1, 1),
      key("adjective", 1, 1),
      key("adverb", 1, 1),
    ];
    const senses = selectWordnetSenses(keys, glossOf, { perPos: 1, maxPos: 2 });
    expect(senses).toHaveLength(2);
  });

  it("returns nothing for a word without senses", () => {
    expect(selectWordnetSenses([], glossOf)).toEqual([]);
  });
});

describe("orderEnglishEntries", () => {
  it("puts a more common lemma before the clicked form", () => {
    const ordered = orderEnglishEntries("running", [
      { word: "running", rank: 3252 },
      { word: "run", rank: 202 },
    ]);
    expect(ordered.map((e) => e.word)).toEqual(["run", "running"]);
  });

  it("keeps the exact word first when it is more common or ranks tie", () => {
    expect(
      orderEnglishEntries("well", [
        { word: "well", rank: 90 },
        { word: "good", rank: 120 },
      ])[0]?.word,
    ).toBe("well");
    expect(
      orderEnglishEntries("x", [
        { word: "y", rank: null },
        { word: "x", rank: null },
      ])[0]?.word,
    ).toBe("x");
  });

  it("handles an empty list", () => {
    expect(orderEnglishEntries("a", [])).toEqual([]);
  });
});

describe("isLowercaseMember", () => {
  const gloss = (words: string[]): WordnetGloss => ({
    offset: "1",
    pos: "noun",
    words,
    gloss: "g",
    example: null,
  });

  it("rejects symbols and names written with a capital", () => {
    expect(isLowercaseMember(gloss(["helium", "He", "atomic_number_2"]), "he")).toBe(false);
    expect(isLowercaseMember(gloss(["May"]), "may")).toBe(false);
  });

  it("accepts ordinary members, including multiword ones", () => {
    expect(isLowercaseMember(gloss(["can", "tin"]), "can")).toBe(true);
    expect(isLowercaseMember(gloss(["take_off"]), "take off")).toBe(true);
  });
});

describe("arpabetToIpa", () => {
  it("converts CMUdict phones with the stress mark before the syllable onset", () => {
    expect(arpabetToIpa("B Y UW1 T AH0 F AH0 L")).toBe("ˈbjuːtəfəl");
    expect(arpabetToIpa("K AH0 M P Y UW1 T ER0")).toBe("kəmˈpjuːtɚ");
    expect(arpabetToIpa("S EH2 R AH0 N D IH1 P IH0 T IY0")).toBe("ˌserənˈdɪpɪtiː");
    expect(arpabetToIpa("IH0 K S T R AO1 R D AH0 N EH2 R IY0")).toBe("ɪkˈstrɔːrdəˌneriː");
  });

  it("leaves one-syllable words unmarked and keeps ʌ for stressed AH", () => {
    expect(arpabetToIpa("R AH1 N")).toBe("rʌn");
  });

  it("returns null for unknown phones or empty input", () => {
    expect(arpabetToIpa("XX1")).toBeNull();
    expect(arpabetToIpa("")).toBeNull();
  });
});

describe("parseCmudictLine", () => {
  it("parses a word and drops comments", () => {
    expect(parseCmudictLine("aalen AE1 L AH0 N # place, german")).toEqual({
      word: "aalen",
      ipa: "ˈælən",
    });
  });

  it("skips alternate pronunciations and blank lines", () => {
    expect(parseCmudictLine("read(2) R IY1 D")).toBeNull();
    expect(parseCmudictLine("")).toBeNull();
  });
});
