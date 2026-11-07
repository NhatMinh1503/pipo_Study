import { describe, expect, it } from "vitest";

import { isUnchangedRewrite } from "./unchanged-rewrite";

const PASSAGE = "総理は会議に出ました。新しい計画を話しました。";

describe("isUnchangedRewrite", () => {
  it("accepts the cached passage exactly as sent", () => {
    expect(isUnchangedRewrite(PASSAGE, PASSAGE)).toBe(true);
  });

  it("ignores Windows line endings and surrounding whitespace from the textarea", () => {
    const english = "The minister spoke.\nA new plan was shared.";
    expect(isUnchangedRewrite("  The minister spoke.\r\nA new plan was shared.\n", english)).toBe(
      true,
    );
  });

  it("treats a one-character edit as edited", () => {
    expect(isUnchangedRewrite(PASSAGE.replace("会議", "会社"), PASSAGE)).toBe(false);
  });

  it("treats a replaced passage as edited", () => {
    expect(isUnchangedRewrite("はい。はい。はい。", PASSAGE)).toBe(false);
  });

  it("treats added sentences as edited", () => {
    expect(isUnchangedRewrite(`${PASSAGE}はい。`, PASSAGE)).toBe(false);
  });

  it("never matches an empty submission", () => {
    expect(isUnchangedRewrite("", "")).toBe(false);
  });
});
