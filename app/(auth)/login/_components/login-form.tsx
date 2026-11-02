"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { FormAlert } from "@/components/common/form-alert";
import { SubmitButton } from "@/components/common/submit-button";
import { TextField } from "@/components/common/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useActionForm } from "@/hooks/use-action-form";
import { signInSchema } from "@/lib/schemas/auth";

import { signIn } from "../../_lib/actions";

interface LoginFormProps {
  next?: string;
  /** i18n key shown before the user submits, e.g. after an expired email link. */
  initialError?: string;
}

export function LoginForm({ next, initialError }: LoginFormProps) {
  const t = useTranslations("auth");
  const { form, onSubmit, serverError, isSubmitting } = useActionForm({
    schema: signInSchema,
    defaultValues: { email: "", password: "" },
    action: (values) => signIn(values, next),
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert messageKey={serverError ?? initialError} />
        <TextField
          label={t("email")}
          type="email"
          autoComplete="email"
          registration={form.register("email")}
          error={errors.email}
        />
        <div className="space-y-2">
          <TextField
            label={t("password")}
            type="password"
            autoComplete="current-password"
            registration={form.register("password")}
            error={errors.password}
          />
          <Link
            href="/forgot-password"
            className="block text-right text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("signIn.forgot")}
          </Link>
        </div>
        <SubmitButton isPending={isSubmitting}>{t("signIn.submit")}</SubmitButton>
      </FieldGroup>
    </form>
  );
}
