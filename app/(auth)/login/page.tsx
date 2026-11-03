import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { AuthCard } from "../_components/auth-card";
import { AuthFooterLink } from "../_components/auth-footer-link";

import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = { title: "Login" };

const ERROR_KEYS: Record<string, string> = {
  link_invalid: "auth.errors.linkInvalid",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
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
      {/* Only the form depends on the URL, so the card shell can render instantly */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <LoginFormFromParams searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function LoginFormFromParams({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next, error } = await searchParams;

  return (
    <LoginForm
      next={typeof next === "string" ? next : undefined}
      initialError={typeof error === "string" ? ERROR_KEYS[error] : undefined}
    />
  );
}
