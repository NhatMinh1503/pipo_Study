"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { FormAlert } from "@/components/common/form-alert";
import { SubmitButton } from "@/components/common/submit-button";
import { TextField } from "@/components/common/text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useActionForm } from "@/hooks/use-action-form";
import { signUpSchema } from "@/lib/schemas/auth";

import { signUp } from "../../_lib/actions";

export function SignupForm() {
  const t = useTranslations("auth");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { form, onSubmit, serverError, isSubmitting } = useActionForm({
    schema: signUpSchema,
    defaultValues: { email: "", password: "", confirmPassword: "" },
    action: signUp,
    onSuccess: (values) => setSentTo(values.email),
  });
  const { errors } = form.formState;

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <MailCheck className="size-10 text-muted-foreground" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">{t("checkEmail.title")}</p>
          <p className="text-sm text-muted-foreground">
            {t("checkEmail.description", { email: sentTo })}
          </p>
        </div>
        <Button variant="outline" asChild className="w-full">
          <Link href="/login">{t("checkEmail.back")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert messageKey={serverError} />
        <TextField
          label={t("email")}
          type="email"
          autoComplete="email"
          registration={form.register("email")}
          error={errors.email}
        />
        <TextField
          label={t("password")}
          type="password"
          autoComplete="new-password"
          description={t("signUp.passwordHint")}
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
        <SubmitButton isPending={isSubmitting}>{t("signUp.submit")}</SubmitButton>
      </FieldGroup>
    </form>
  );
}
