import { z } from "zod";

// Messages are i18n keys under `validation.*`
// Normalize first, then validate, so " Minh@Example.com " is accepted
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "validation.email" }));

// Supabase/bcrypt ignore bytes beyond 72, so cap it explicitly
const newPassword = z
  .string()
  .min(8, { error: "validation.passwordMin" })
  .max(72, { error: "validation.passwordMax" });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: "validation.required" }),
});

export const signUpSchema = z
  .object({ email, password: newPassword, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    error: "validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    error: "validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
