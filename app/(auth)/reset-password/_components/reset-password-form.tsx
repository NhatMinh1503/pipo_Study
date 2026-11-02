"use client";

import { useTranslations } from "next-intl";

import { FormAlert } from "@/components/common/form-alert";
import { SubmitButton } from "@/components/common/submit-button";
import { TextField } from "@/components/common/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useActionForm } from "@/hooks/use-action-form";
import { resetPasswordSchema } from "@/lib/schemas/auth";

import { updatePassword } from "../../_lib/actions";

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const { form, onSubmit, serverError, isSubmitting } = useActionForm({
    schema: resetPasswordSchema,
    defaultValues: { password: "", confirmPassword: "" },
    action: updatePassword,
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert messageKey={serverError} />
        <TextField
          label={t("newPassword")}
          type="password"
          autoComplete="new-password"
          registration={form.register("password")}
          error={errors.password}
        />
        <TextField
          label={t("confirmPassword")}
          type="password"
          autoComplete="new-password"
          registration={form.register("confirmPassword")}
          error={errors.confirmPassword}
        />
        <SubmitButton isPending={isSubmitting}>{t("reset.submit")}</SubmitButton>
      </FieldGroup>
    </form>
  );
}
