import { describe, expect, it } from "vitest";

import { interleaveBySource } from "./interleave";

const item = (url: string) => ({ url });

describe("interleaveBySource", () => {
  it("takes one item from each source in turn", () => {
    const merged = interleaveBySource([
      [item("a1"), item("a2"), item("a3")],
      [item("b1")],
      [item("c1"), item("c2")],
    ]);
    expect(merged.map((entry) => entry.url)).toEqual(["a1", "b1", "c1", "a2", "c2", "a3"]);
  });

  it("drops duplicate URLs", () => {
    expect(interleaveBySource([[item("x")], [item("x"), item("y")]])).toEqual([
      item("x"),
      item("y"),
    ]);
  });

  it("handles empty sources and no sources", () => {
    expect(interleaveBySource([[], [item("b")]])).toEqual([item("b")]);
    expect(interleaveBySource([])).toEqual([]);
  });
});
