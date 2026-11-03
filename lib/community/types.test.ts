import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor } from "./types";

describe("feed cursor", () => {
  const post = {
    createdAt: "2026-11-02T07:00:00.123+00:00",
    id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  };

  it("round-trips created_at and id", () => {
    expect(decodeCursor(encodeCursor(post))).toEqual(post);
  });

  it.each([
    undefined,
    "",
    "garbage",
    "2026-11-02T07:00:00Z,id.gt.0_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    "2026-11-02_not-a-uuid",
    "notadate_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  ])("rejects %j", (cursor) => {
    expect(decodeCursor(cursor)).toBeNull();
  });
});
