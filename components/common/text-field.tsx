"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import type { FieldError as RhfFieldError, UseFormRegisterReturn } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { PasswordInput } from "./password-input";

interface TextFieldProps {
  label: string;
  /** Result of react-hook-form `register(name)`. */
  registration: UseFormRegisterReturn;
  error?: RhfFieldError;
  description?: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  placeholder?: string;
}

/** Labelled input wired to react-hook-form; error messages are i18n keys and get translated here. */
export function TextField({
  label,
  registration,
  error,
  description,
  type = "text",
  autoComplete,
  placeholder,
}: TextFieldProps) {
  const t = useTranslations();
  const id = useId();
  const inputProps = {
    id,
    autoComplete,
    placeholder,
    "aria-invalid": error ? true : undefined,
    ...registration,
  };

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {type === "password" ? (
        <PasswordInput {...inputProps} />
      ) : (
        <Input type={type} {...inputProps} />
      )}
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      {error?.message && <FieldError>{t(error.message)}</FieldError>}
    </Field>
  );
}
