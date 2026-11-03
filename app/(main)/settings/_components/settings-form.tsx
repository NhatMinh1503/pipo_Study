"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { FormAlert } from "@/components/common/form-alert";
import { SelectField } from "@/components/common/select-field";
import { SubmitButton } from "@/components/common/submit-button";
import { FieldGroup } from "@/components/ui/field";
import { useActionForm } from "@/hooks/use-action-form";
import {
  DISPLAY_LANGUAGES,
  isLevelForLanguage,
  LEARNING_LANGUAGES,
  LEVELS_BY_LANGUAGE,
  type LearningLanguage,
} from "@/lib/schemas/common";
import { onboardingSchema, type OnboardingInput } from "@/lib/schemas/profile";
import { updateSettings } from "@/server/actions/account";

interface SettingsFormProps {
  initial: OnboardingInput;
  timeZones: string[];
}

export function SettingsForm({ initial, timeZones }: SettingsFormProps) {
  const t = useTranslations();
  const { form, onSubmit, serverError, isSubmitting } = useActionForm({
    schema: onboardingSchema,
    defaultValues: initial,
    action: updateSettings,
    onSuccess: () => toast.success(t("settings.saved")),
  });
  const language = form.watch("learningLanguage");

  const keepLevelValid = (next: LearningLanguage) => {
    if (!isLevelForLanguage(next, form.getValues("level"))) {
      const [first] = LEVELS_BY_LANGUAGE[next];
      form.setValue("level", first);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="sheet space-y-4 p-5">
      <h2 className="mono-label">{t("settings.learning")}</h2>
      <FieldGroup>
        <FormAlert messageKey={serverError} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            control={form.control}
            name="learningLanguage"
            label={t("settings.learningLanguage")}
            options={LEARNING_LANGUAGES.map((value) => ({ value, label: t(`languages.${value}`) }))}
            onValueChange={keepLevelValid}
          />
          <SelectField
            control={form.control}
            name="level"
            label={t("settings.level")}
            options={LEVELS_BY_LANGUAGE[language].map((value) => ({ value, label: value }))}
          />
          <SelectField
            control={form.control}
            name="displayLanguage"
            label={t("settings.displayLanguage")}
            options={DISPLAY_LANGUAGES.map((value) => ({ value, label: t(`languages.${value}`) }))}
          />
          <SelectField
            control={form.control}
            name="timeZone"
            label={t("settings.timeZone")}
            options={timeZones.map((value) => ({ value, label: value }))}
          />
        </div>
        <SubmitButton isPending={isSubmitting}>{t("settings.save")}</SubmitButton>
      </FieldGroup>
    </form>
  );
}
