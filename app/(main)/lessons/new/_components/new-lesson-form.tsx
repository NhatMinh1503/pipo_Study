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
import { useNewsPrefill } from "../_hooks/use-news-prefill";

import { NewsPrefillStatus } from "./news-prefill-status";

import { SentencePreview } from "./sentence-preview";

interface NewLessonFormProps {
  defaultLanguage: LearningLanguage;
  defaultLevel: ProficiencyLevel;
  defaultTitle?: string;
  /** Allow-listed open news article to rewrite into the passage. */
  newsUrl?: string;
}

export function NewLessonForm({
  defaultLanguage,
  defaultLevel,
  defaultTitle = "",
  newsUrl,
}: NewLessonFormProps) {
  const t = useTranslations();
  const { form, onSubmit, serverError, isSubmitting } = useActionForm({
    schema: createLessonSchema,
    defaultValues: {
      title: defaultTitle,
      language: defaultLanguage,
      level: defaultLevel,
      text: "",
      newsUrl,
    },
    action: createLesson,
  });
  const news = useNewsPrefill(form, newsUrl);
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
    <form
      onSubmit={onSubmit}
      noValidate
      className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-start lg:gap-10"
    >
      <div className="sheet-tight p-5 sm:p-6">
        <FieldGroup>
          <FormAlert messageKey={serverError} />
          {newsUrl && (
            <NewsPrefillStatus
              isPending={news.isPending}
              error={news.error}
              data={news.data}
              onRetry={() => void news.refetch()}
            />
          )}
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
              options={LEARNING_LANGUAGES.map((value) => ({
                value,
                label: t(`languages.${value}`),
              }))}
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
          <SubmitButton isPending={isSubmitting} disabled={Boolean(newsUrl) && news.isPending}>
            {t("lessons.form.submit")}
          </SubmitButton>
        </FieldGroup>
      </div>

      <SentencePreview text={text} language={language} />
    </form>
  );
}
