"use client";

import { useTranslations } from "next-intl";

import { FormAlert } from "@/components/common/form-alert";
import { SelectField } from "@/components/common/select-field";
import { SubmitButton } from "@/components/common/submit-button";
import { TextareaField } from "@/components/common/textarea-field";
import { TextField } from "@/components/common/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useActionForm } from "@/hooks/use-action-form";
import {
  isLevelForLanguage,
  LEARNING_LANGUAGES,
  LEVELS_BY_LANGUAGE,
  type LearningLanguage,
  type ProficiencyLevel,
} from "@/lib/schemas/common";
import { createLessonSchema } from "@/lib/schemas/lesson";

import { createLesson } from "../../_lib/actions";

import { SentencePreview } from "./sentence-preview";

interface NewLessonFormProps {
  defaultLanguage: LearningLanguage;
  defaultLevel: ProficiencyLevel;
}

export function NewLessonForm({ defaultLanguage, defaultLevel }: NewLessonFormProps) {
  const t = useTranslations();
  const { form, onSubmit, serverError, isSubmitting } = useActionForm({
    schema: createLessonSchema,
    defaultValues: { title: "", language: defaultLanguage, level: defaultLevel, text: "" },
    action: createLesson,
  });
  const { errors } = form.formState;
  const language = form.watch("language");
  const text = form.watch("text");

  const keepLevelValid = (nextLanguage: LearningLanguage) => {
    if (!isLevelForLanguage(nextLanguage, form.getValues("level"))) {
      const [firstLevel] = LEVELS_BY_LANGUAGE[nextLanguage];
      form.setValue("level", firstLevel);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[3fr_2fr]">
      <FieldGroup>
        <FormAlert messageKey={serverError} />
        <TextField
          label={t("lessons.form.title")}
          placeholder={t("lessons.form.titlePlaceholder")}
          registration={form.register("title")}
          error={errors.title}
        />
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            control={form.control}
            name="language"
            label={t("lessons.form.language")}
            options={LEARNING_LANGUAGES.map((value) => ({ value, label: t(`languages.${value}`) }))}
            onValueChange={keepLevelValid}
          />
          <SelectField
            control={form.control}
            name="level"
            label={t("lessons.form.level")}
            options={LEVELS_BY_LANGUAGE[language].map((value) => ({ value, label: value }))}
          />
        </div>
        <TextareaField
          label={t("lessons.form.text")}
          placeholder={t(`lessons.form.textPlaceholder.${language}`)}
          description={t("lessons.form.textHint")}
          registration={form.register("text")}
          error={errors.text}
          lang={language}
          rows={10}
        />
        <SubmitButton isPending={isSubmitting}>{t("lessons.form.submit")}</SubmitButton>
      </FieldGroup>

      <SentencePreview text={text} language={language} />
    </form>
  );
}
