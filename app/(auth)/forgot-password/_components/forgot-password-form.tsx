"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { FormAlert } from "@/components/common/form-alert";
import { SubmitButton } from "@/components/common/submit-button";
import { TextField } from "@/components/common/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useActionForm } from "@/hooks/use-action-form";
import { forgotPasswordSchema } from "@/lib/schemas/auth";

import { requestPasswordReset } from "../../_lib/actions";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [sent, setSent] = useState(false);
  const { form, onSubmit, serverError, isSubmitting } = useActionForm({
    schema: forgotPasswordSchema,
    defaultValues: { email: "" },
    action: requestPasswordReset,
    onSuccess: () => setSent(true),
  });

  if (sent) return <FormAlert variant="success" messageKey="auth.forgot.sent" />;

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert messageKey={serverError} />
        <TextField
          label={t("email")}
          type="email"
          autoComplete="email"
          registration={form.register("email")}
          error={form.formState.errors.email}
        />
        <SubmitButton isPending={isSubmitting}>{t("forgot.submit")}</SubmitButton>
      </FieldGroup>
    </form>
  );
}
