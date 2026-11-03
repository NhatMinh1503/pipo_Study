"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import type { FieldError as RhfFieldError, UseFormRegisterReturn } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

interface TextareaFieldProps {
  label: string;
  registration: UseFormRegisterReturn;
  error?: RhfFieldError;
  description?: React.ReactNode;
  placeholder?: string;
  rows?: number;
  lang?: string;
}

/** Labelled textarea wired to react-hook-form; error messages are i18n keys. */
export function TextareaField({
  label,
  registration,
  error,
  description,
  placeholder,
  rows = 8,
  lang,
}: TextareaFieldProps) {
  const t = useTranslations();
  const id = useId();

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        rows={rows}
        lang={lang}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        {...registration}
      />
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      {error?.message && <FieldError>{t(error.message)}</FieldError>}
    </Field>
  );
}
