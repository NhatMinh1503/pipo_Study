import { describe, expect, it } from "vitest";

import { signInSchema, signUpSchema } from "./auth";

describe("signInSchema", () => {
  it("normalizes email casing and whitespace", () => {
    const result = signInSchema.parse({ email: "  Minh@Example.COM ", password: "x" });
    expect(result.email).toBe("minh@example.com");
  });

  it("returns the i18n key for an invalid email", () => {
    const result = signInSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.error?.issues[0]?.message).toBe("validation.email");
  });
});

describe("signUpSchema", () => {
  const valid = { email: "a@b.co", password: "12345678", confirmPassword: "12345678" };

  it("accepts matching passwords of 8+ characters", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects passwords shorter than 8", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      password: "1234567",
      confirmPassword: "1234567",
    });
    expect(result.error?.issues[0]?.message).toBe("validation.passwordMin");
  });

  it("rejects passwords longer than 72", () => {
    const long = "a".repeat(73);
    const result = signUpSchema.safeParse({ ...valid, password: long, confirmPassword: long });
    expect(result.error?.issues[0]?.message).toBe("validation.passwordMax");
  });

  it("reports mismatch on confirmPassword", () => {
    const result = signUpSchema.safeParse({ ...valid, confirmPassword: "different" });
    expect(result.error?.issues[0]).toMatchObject({
      path: ["confirmPassword"],
      message: "validation.passwordMismatch",
    });
  });
});
