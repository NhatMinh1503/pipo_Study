import { describe, expect, it } from "vitest";

import { isValidTimeZone } from "./timezone";

describe("isValidTimeZone", () => {
  it.each(["Asia/Tokyo", "Asia/Ho_Chi_Minh", "UTC", "America/New_York"])("accepts %s", (tz) => {
    expect(isValidTimeZone(tz)).toBe(true);
  });

  it.each(["", "Mars/Olympus", "not a zone", "'; drop table"])("rejects %j", (tz) => {
    expect(isValidTimeZone(tz)).toBe(false);
  });
});
