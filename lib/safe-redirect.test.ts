import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["/lessons/1", "/lessons/1"],
    ["/review?mode=quiz", "/review?mode=quiz"],
  ])("keeps relative path %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["dashboard"],
    ["//evil.com"],
    ["/\\evil.com"],
    ["https://evil.com"],
    ["javascript:alert(1)"],
    ["/ok\nSet-Cookie:x"],
  ])("falls back for unsafe value %j", (input) => {
    expect(safeRedirectPath(input)).toBe("/dashboard");
  });

  it("uses a custom fallback", () => {
    expect(safeRedirectPath("//x", "/login")).toBe("/login");
  });
});
