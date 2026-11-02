import { describe, expect, it } from "vitest";

import { getRouteAccess } from "./route-access";

describe("getRouteAccess", () => {
  it.each([
    ["/", "public"],
    ["/auth/callback", "public"],
    ["/login", "guest-only"],
    ["/signup", "guest-only"],
    ["/forgot-password", "guest-only"],
    ["/reset-password", "protected"],
    ["/dashboard", "protected"],
    ["/onboarding", "protected"],
    ["/lessons/123/translate", "protected"],
    ["/loginx", "protected"],
    ["/authentic", "protected"],
  ] as const)("%s → %s", (path, expected) => {
    expect(getRouteAccess(path)).toBe(expected);
  });
});
