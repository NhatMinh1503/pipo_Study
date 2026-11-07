import { describe, expect, it } from "vitest";

import { pickLine, type GardenFacts } from "./speech";

const facts = (overrides: Partial<GardenFacts> = {}): GardenFacts => ({
  treeCount: 5,
  growing: null,
  sakuraCount: 0,
  studiedToday: false,
  ...overrides,
});

// garden-scene spec §3.7 (test case #5)
describe("what Pipo says", () => {
  it("invites a first tree in an empty garden", () => {
    expect(pickLine(facts({ treeCount: 0 }), null).key).toBe("firstTree");
  });

  it("talks about the growing tree first", () => {
    expect(pickLine(facts({ growing: { species: "maple", sessionsLeft: 2 } }), null)).toEqual({
      key: "growing",
      values: { species: "maple", count: 2 },
    });
  });

  it("celebrates blooming sakura on a study day, and gently suggests studying otherwise", () => {
    expect(pickLine(facts({ sakuraCount: 1, studiedToday: true }), null).key).toBe("bloom");
    expect(pickLine(facts({ sakuraCount: 1, studiedToday: false }), null).key).toBe("bloomHint");
  });

  it("counts the trees by default", () => {
    expect(pickLine(facts(), null)).toEqual({ key: "treeCount", values: { count: 5 } });
  });

  it("does not repeat the line it just said when another one fits", () => {
    const busy = facts({ growing: { species: "pine", sessionsLeft: 1 } });
    expect(pickLine(busy, "growing").key).toBe("treeCount");
  });
});
