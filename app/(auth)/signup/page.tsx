import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "../_components/auth-card";
import { AuthFooterLink } from "../_components/auth-footer-link";

import { SignupForm } from "./_components/signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage() {
  const t = await getTranslations("auth");

  return (
    <AuthCard
      title={t("signUp.title")}
      description={t("signUp.description")}
      footer={
        <AuthFooterLink
          prompt={t("signUp.hasAccount")}
          href="/login"
          label={t("signUp.toSignIn")}
        />
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
