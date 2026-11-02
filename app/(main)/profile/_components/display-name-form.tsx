"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";

import { FormAlert } from "@/components/common/form-alert";
import { SubmitButton } from "@/components/common/submit-button";
import { TextField } from "@/components/common/text-field";
import { useActionForm } from "@/hooks/use-action-form";
import { updateDisplayName } from "@/server/actions/account";

const schema = z.object({
  displayName: z.string().trim().min(1, { error: "validation.required" }).max(50),
});

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const t = useTranslations("profile");
  const { form, onSubmit, serverError, isSubmitting } = useActionForm({
    schema,
    defaultValues: { displayName: initialName },
    action: updateDisplayName,
    onSuccess: () => toast.success(t("saved")),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <TextField
          label={t("displayName")}
          registration={form.register("displayName")}
          error={form.formState.errors.displayName}
        />
      </div>
      <SubmitButton isPending={isSubmitting} className="sm:w-auto">
        {t("save")}
      </SubmitButton>
      <FormAlert messageKey={serverError} />
    </form>
  );
}
