import { describe, expect, it } from "vitest";

import { mapAuthError } from "./map-auth-error";

describe("mapAuthError", () => {
  it.each([
    ["invalid_credentials", "auth.errors.invalidCredentials"],
    ["email_not_confirmed", "auth.errors.emailNotConfirmed"],
    ["over_email_send_rate_limit", "auth.errors.rateLimited"],
    ["otp_expired", "auth.errors.linkInvalid"],
  ])("%s → %s", (code, key) => {
    expect(mapAuthError(code)).toBe(key);
  });

  it("hides unknown errors behind a generic key", () => {
    expect(mapAuthError("unexpected_failure")).toBe("errors.unexpected");
    expect(mapAuthError(undefined)).toBe("errors.unexpected");
  });
});
