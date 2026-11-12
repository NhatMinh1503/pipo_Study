import { describe, expect, it } from "vitest";

import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("splits plain records and ignores the trailing newline", () => {
    expect([...parseCsv("word,ipa\nrun,rʌn\n")]).toEqual([
      ["word", "ipa"],
      ["run", "rʌn"],
    ]);
  });

  it("handles quoted commas, doubled quotes and newlines inside quotes", () => {
    expect([...parseCsv('a,"b, c","say ""hi""","x\ny"\r\nz,,,\n')]).toEqual([
      ["a", "b, c", 'say "hi"', "x\ny"],
      ["z", "", "", ""],
    ]);
  });

  it("keeps a last record without a newline", () => {
    expect([...parseCsv("a,b")]).toEqual([["a", "b"]]);
  });

  it("returns nothing for an empty string", () => {
    expect([...parseCsv("")]).toEqual([]);
  });
});
