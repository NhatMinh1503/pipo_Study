"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { FormAlert } from "@/components/common/form-alert";
import { SubmitButton } from "@/components/common/submit-button";
import { TextField } from "@/components/common/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useActionForm } from "@/hooks/use-action-form";
import { generateLesson } from "@/server/actions/generate-lesson";

const topicSchema = z.object({
  topic: z.string().trim().min(1, { error: "validation.required" }).max(100),
});

const SUGGESTIONS = ["travel", "food", "work", "technology", "health"] as const;

export function GenerateForm({ level }: { level: string }) {
  const t = useTranslations("generate");
  const { form, onSubmit, serverError, isSubmitting } = useActionForm({
    schema: topicSchema,
    defaultValues: { topic: "" },
    action: generateLesson,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="sheet-tight mx-auto w-full max-w-xl p-6">
      <FieldGroup>
        <FormAlert messageKey={serverError} />
        <TextField
          label={t("topic")}
          placeholder={t("topicPlaceholder")}
          registration={form.register("topic")}
          error={form.formState.errors.topic}
          description={t("levelNote", { level })}
        />
        <div className="flex flex-wrap gap-2" aria-label={t("suggestions")}>
          {SUGGESTIONS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                form.setValue("topic", t(`suggestion.${key}`), { shouldValidate: true })
              }
              className="border border-dashed border-border/40 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              {t(`suggestion.${key}`)}
            </button>
          ))}
        </div>
        <SubmitButton isPending={isSubmitting}>
          <Sparkles aria-hidden />
          {isSubmitting ? t("generating") : t("submit")}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
