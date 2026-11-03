import { describe, expect, it } from "vitest";

import { pickVoice, type VoiceLike } from "./voices";

const voice = (lang: string, name: string, localService = true): VoiceLike => ({
  lang,
  name,
  localService,
});

describe("pickVoice", () => {
  const voices = [
    voice("en-GB", "Daniel"),
    voice("en-US", "Fred"),
    voice("en-US", "Samantha (Enhanced)"),
    voice("ja-JP", "Hattori"),
    voice("ja-JP", "Kyoko (Premium)"),
    voice("vi-VN", "Linh"),
  ];

  it("prefers the exact locale and a high-quality voice", () => {
    expect(pickVoice(voices, "ja")?.name).toBe("Kyoko (Premium)");
    expect(pickVoice(voices, "en")?.name).toBe("Samantha (Enhanced)");
  });

  it("falls back to another locale of the same language", () => {
    expect(pickVoice([voice("en-GB", "Daniel"), voice("ja-JP", "Hattori")], "en")?.name).toBe(
      "Daniel",
    );
  });

  it("accepts underscore locales (Android)", () => {
    expect(pickVoice([voice("ja_JP", "Android JA")], "ja")?.name).toBe("Android JA");
  });

  it("returns null when the device has no voice for the language", () => {
    expect(pickVoice([voice("vi-VN", "Linh")], "ja")).toBeNull();
    expect(pickVoice([], "en")).toBeNull();
  });
});
