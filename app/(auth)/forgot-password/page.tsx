import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "../_components/auth-card";
import { AuthFooterLink } from "../_components/auth-footer-link";

import { ForgotPasswordForm } from "./_components/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");

  return (
    <AuthCard
      title={t("forgot.title")}
      description={t("forgot.description")}
      footer={<AuthFooterLink prompt="" href="/login" label={t("forgot.back")} />}
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
