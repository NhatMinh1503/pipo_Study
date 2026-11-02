import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";

import { signOut } from "../_lib/actions";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder until S05 builds the real dashboard
export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
      <p className="text-muted-foreground">{t("dashboard.welcome", { name: user.email ?? "" })}</p>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          {t("auth.signOut")}
        </Button>
      </form>
    </main>
  );
}
