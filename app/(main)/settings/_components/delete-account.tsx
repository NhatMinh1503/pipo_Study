"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteAccount } from "@/server/actions/account";

export function DeleteAccount() {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const result = await deleteAccount();
      // Success redirects to the landing page
      if (result && !result.ok) toast.error(t(result.error ?? "errors.unexpected"));
    });

  return (
    <section className="space-y-3 border-2 border-destructive/50 p-5">
      <h2 className="mono-label text-destructive">{t("settings.dangerZone")}</h2>
      <p className="text-sm text-muted-foreground">{t("settings.deleteDescription")}</p>
      <ConfirmDialog
        title={t("settings.deleteTitle")}
        description={t("settings.deleteConfirm")}
        confirmLabel={t("settings.deleteButton")}
        onConfirm={remove}
        destructive
      >
        <Button variant="destructive" disabled={isPending}>
          {t("settings.deleteButton")}
        </Button>
      </ConfirmDialog>
    </section>
  );
}
