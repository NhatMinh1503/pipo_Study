import { describe, expect, it } from "vitest";

import { diffDictation } from "./diff";

describe("diffDictation — Japanese (by character)", () => {
  it("scores a perfect copy 100 and ignores punctuation", () => {
    expect(diffDictation("駅に行きます。", "駅に行きます", "ja")).toEqual({
      segments: [{ kind: "equal", text: "駅に行きます" }],
      score: 100,
    });
  });

  it("marks missing and extra characters", () => {
    const result = diffDictation("駅に行きます", "駅へ行きます", "ja");
    expect(result.segments).toEqual([
      { kind: "equal", text: "駅" },
      { kind: "extra", text: "へ" },
      { kind: "missing", text: "に" },
      { kind: "equal", text: "行きます" },
    ]);
    expect(result.score).toBe(83);
  });

  it("treats full-width and half-width the same", () => {
    expect(diffDictation("ＡＢＣです", "ABCです", "ja").score).toBe(100);
  });
});

describe("diffDictation — English (by word)", () => {
  it("ignores case and punctuation", () => {
    expect(diffDictation("Hello, World!", "hello world", "en").score).toBe(100);
  });

  it("reports a missing word", () => {
    const result = diffDictation("I went to the station", "I went the station", "en");
    expect(result.segments).toEqual([
      { kind: "equal", text: "i went" },
      { kind: "missing", text: "to" },
      { kind: "equal", text: "the station" },
    ]);
    expect(result.score).toBe(80);
  });

  it("does not reward typing extra words", () => {
    expect(diffDictation("go home", "go go home home", "en").score).toBe(50);
  });

  it("scores an empty answer 0", () => {
    expect(diffDictation("go home", "", "en")).toEqual({
      segments: [{ kind: "missing", text: "go home" }],
      score: 0,
    });
  });
});
