import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "../_components/auth-card";

import { ResetPasswordForm } from "./_components/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

// Reached through the email link: /auth/callback signs the user in, then redirects here
export default async function ResetPasswordPage() {
  const t = await getTranslations("auth");

  return (
    <AuthCard title={t("reset.title")} description={t("reset.description")}>
      <ResetPasswordForm />
    </AuthCard>
  );
}
