import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import vi from "@/messages/vi.json";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, inner]) =>
    flattenKeys(inner, prefix ? `${prefix}.${key}` : key),
  );
}

describe("message catalogs", () => {
  const viKeys = flattenKeys(vi).sort();

  it.each([
    ["en", en],
    ["ja", ja],
  ])("%s has exactly the same keys as vi", (_name, catalog) => {
    expect(flattenKeys(catalog).sort()).toEqual(viKeys);
  });
});
