import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AuthCard } from "../_components/auth-card";
import { AuthFooterLink } from "../_components/auth-footer-link";

import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = { title: "Login" };

const ERROR_KEYS: Record<string, string> = {
  link_invalid: "auth.errors.linkInvalid",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <AuthCard
      title={t("signIn.title")}
      description={t("signIn.description")}
      footer={
        <AuthFooterLink
          prompt={t("signIn.noAccount")}
          href="/signup"
          label={t("signIn.toSignUp")}
        />
      }
    >
      <LoginForm
        next={typeof next === "string" ? next : undefined}
        initialError={typeof error === "string" ? ERROR_KEYS[error] : undefined}
      />
    </AuthCard>
  );
}
