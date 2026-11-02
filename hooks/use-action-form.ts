"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type DefaultValues, type FieldValues, type Path } from "react-hook-form";
import type { z } from "zod";

import type { ActionResult } from "@/lib/action-result";

interface UseActionFormOptions<TValues extends FieldValues> {
  schema: z.ZodType<TValues, TValues>;
  defaultValues: DefaultValues<TValues>;
  /** Server Action to call with the validated values. */
  action: (values: TValues) => Promise<ActionResult | undefined>;
  onSuccess?: (values: TValues) => void;
}

/**
 * Form state for a Server Action: validates on the client with the same Zod schema the
 * server uses, then maps the action's `ActionResult` back onto field / form errors.
 * Error messages are i18n keys; render them with `useTranslations()`.
 */
export function useActionForm<TValues extends FieldValues>({
  schema,
  defaultValues,
  action,
  onSuccess,
}: UseActionFormOptions<TValues>) {
  const form = useForm<TValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onTouched",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      // A redirect() inside the action resolves to undefined and navigates away
      const result = await action(values);
      if (!result || result.ok) {
        onSuccess?.(values);
        return;
      }

      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        if (message) form.setError(field as Path<TValues>, { message });
      }
      if (result.error) form.setError("root.server", { message: result.error });
    } catch (error) {
      // Next.js signals redirect()/notFound() by throwing; let it propagate
      if (isNextNavigationError(error)) throw error;
      form.setError("root.server", { message: "errors.unexpected" });
    }
  });

  return {
    form,
    onSubmit,
    serverError: form.formState.errors.root?.server?.message,
    isSubmitting: form.formState.isSubmitting,
  };
}

function isNextNavigationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    (error.digest.startsWith("NEXT_REDIRECT") || error.digest.startsWith("NEXT_HTTP_ERROR"))
  );
}
