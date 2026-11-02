"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface FormAlertProps {
  /** i18n key of the message, e.g. "auth.errors.invalidCredentials". */
  messageKey?: string;
  variant?: "error" | "success";
  className?: string;
}

/** Form-level message (not tied to one field), translated from an i18n key. */
export function FormAlert({ messageKey, variant = "error", className }: FormAlertProps) {
  const t = useTranslations();
  if (!messageKey) return null;

  const Icon = variant === "error" ? CircleAlert : CircleCheck;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border p-3 text-sm",
        variant === "error"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{t(messageKey)}</p>
    </div>
  );
}
