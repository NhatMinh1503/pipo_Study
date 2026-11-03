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
        "flex items-start gap-2.5 border-2 px-3 py-2.5 text-sm leading-relaxed",
        variant === "error"
          ? "border-destructive/45 bg-destructive/[0.07] text-destructive"
          : "border-success/40 bg-success/10 text-success",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="font-medium">{t(messageKey)}</p>
    </div>
  );
}
