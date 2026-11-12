import { describe, expect, it } from "vitest";

import { lookupEnglishEntries } from "./dictionary";

type Row = Record<string, unknown>;

/** Fake Supabase client serving english_forms / english_entries from memory. */
function fakeClient(tables: { english_forms: Row[]; english_entries: Row[] }) {
  return {
    from(table: keyof typeof tables) {
      let rows = tables[table];
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          rows = rows.filter((row) => row[column] === value);
          return query;
        },
        in: async (column: string, values: unknown[]) => ({
          data: rows.filter((row) => values.includes(row[column])),
        }),
        limit: async () => ({ data: rows }),
      };
      return query;
    },
  };
}

const sense = (pos: string, gloss: string) => ({ pos, gloss, example: null });
const entry = (word: string, rank: number | null, ipa: string | null = null) => ({
  word,
  ipa,
  senses: [sense("verb", `${word} gloss`)],
  rank,
  oxford: true,
});

const tables = {
  english_entries: [entry("run", 202, "rʌn"), entry("running", 3252, "ˈrʌnɪŋ"), entry("go", 35)],
  english_forms: [
    { form: "running", lemma: "run", kind: "presentParticiple", ipa: "ˈrʌnɪŋ" },
    { form: "went", lemma: "go", kind: "past", ipa: "went" },
  ],
};
// The fake covers only the calls the lookup makes
const lookup = (term: string) => lookupEnglishEntries(fakeClient(tables) as never, term);

describe("lookupEnglishEntries", () => {
  it("returns the more common lemma first, marked with how the word relates to it", async () => {
    const result = await lookup("running");
    expect(result.entries.map((e) => [e.word, e.inflection])).toEqual([
      ["run", "presentParticiple"],
      ["running", null],
    ]);
    expect(result.ipa).toBe("ˈrʌnɪŋ");
  });

  it("finds the lemma of a form that has no entry of its own, with the form's IPA", async () => {
    const result = await lookup("Went");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({ word: "go", inflection: "past" });
    expect(result.ipa).toBe("went");
  });

  it("returns the word itself when it is not an inflected form", async () => {
    const result = await lookup("run");
    expect(result.entries.map((e) => e.word)).toEqual(["run"]);
    expect(result.ipa).toBe("rʌn");
  });

  it("returns nothing for an unknown word", async () => {
    expect(await lookup("pipo")).toEqual({ entries: [], ipa: null });
  });
});
