import { describe, expect, it } from "vitest";

import fixtures from "./fixtures/rewrite-news.json";
import {
  buildRewriteNewsPrompt,
  rewrittenNewsSchema,
  type RewriteNewsInput,
} from "./rewrite-news.v1";

describe("rewrite-news.v1", () => {
  it.each(fixtures as (RewriteNewsInput & { case: string })[])(
    "builds a prompt: $case",
    (fixture) => {
      const prompt = buildRewriteNewsPrompt(fixture);
      expect(prompt).toContain(`Level: ${fixture.level}`);
      // Source text is fenced as data so instructions inside it are not followed
      expect(prompt).toContain(`<<<${fixture.text}>>>`);
      expect(prompt.includes("Rephrase every sentence")).toBe(Boolean(fixture.tooClose));
    },
  );

  it("has at least 10 fixtures", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(10);
  });

  it("parses a well-formed answer and rejects a short one", () => {
    expect(
      rewrittenNewsSchema.safeParse({ title: "t", sentences: ["一。", "二。", "三。"] }).success,
    ).toBe(true);
    expect(rewrittenNewsSchema.safeParse({ title: "t", sentences: ["一。"] }).success).toBe(false);
  });
});
