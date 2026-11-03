"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import { ChoiceGroup, type Choice } from "@/components/common/choice-group";
import { FormAlert } from "@/components/common/form-alert";
import { SubmitButton } from "@/components/common/submit-button";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DISPLAY_LANGUAGES,
  LEARNING_LANGUAGES,
  LEVELS_BY_LANGUAGE,
  type DisplayLanguage,
  type LearningLanguage,
  type ProficiencyLevel,
} from "@/lib/schemas/common";

import { useOnboardingWizard } from "../_hooks/use-onboarding-wizard";

interface OnboardingWizardProps {
  initialDisplayLanguage: DisplayLanguage;
}

export function OnboardingWizard({ initialDisplayLanguage }: OnboardingWizardProps) {
  const t = useTranslations("onboarding");
  const tLang = useTranslations("languages");
  const tLevel = useTranslations("levels");
  const wizard = useOnboardingWizard(initialDisplayLanguage);
  const { step, stepIndex, stepCount, selection } = wizard;

  const languageChoices: Choice<LearningLanguage>[] = LEARNING_LANGUAGES.map((value) => ({
    value,
    label: tLang(value),
    badge: value.toUpperCase(),
    description: t(`languageHint.${value}`),
  }));

  const levelChoices: Choice<ProficiencyLevel>[] = selection.learningLanguage
    ? LEVELS_BY_LANGUAGE[selection.learningLanguage].map((value) => ({
        value,
        label: tLevel(value),
        badge: value,
      }))
    : [];

  const displayChoices: Choice<DisplayLanguage>[] = DISPLAY_LANGUAGES.map((value) => ({
    value,
    label: tLang(value),
    badge: value.toUpperCase(),
  }));

  return (
    <div className="sheet-tight space-y-7 p-6 sm:p-8">
      <div className="space-y-3 border-b border-dashed border-border/40 pb-5">
        <p className="mono-label">{t("stepOf", { current: stepIndex + 1, total: stepCount })}</p>
        <Progress value={((stepIndex + 1) / stepCount) * 100} aria-hidden />
        <h1 className="pt-1 font-heading text-xl leading-tight font-bold tracking-tight sm:text-2xl">
          {t(`${step}.title`)}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t(`${step}.description`)}</p>
      </div>

      {step === "language" && (
        <ChoiceGroup
          name="learningLanguage"
          legend={t("language.title")}
          choices={languageChoices}
          value={selection.learningLanguage}
          onChange={wizard.selectLanguage}
        />
      )}
      {step === "level" && (
        <ChoiceGroup
          name="level"
          legend={t("level.title")}
          choices={levelChoices}
          value={selection.level}
          onChange={wizard.selectLevel}
          columns={2}
        />
      )}
      {step === "display" && (
        <ChoiceGroup
          name="displayLanguage"
          legend={t("display.title")}
          choices={displayChoices}
          value={selection.displayLanguage}
          onChange={wizard.selectDisplayLanguage}
        />
      )}

      <FormAlert messageKey={wizard.error} />

      <form
        className="flex gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          wizard.next();
        }}
      >
        {stepIndex > 0 && (
          <Button type="button" variant="outline" onClick={wizard.back} disabled={wizard.isPending}>
            <ArrowLeft aria-hidden />
            {t("back")}
          </Button>
        )}
        <SubmitButton
          isPending={wizard.isPending}
          disabled={!wizard.canContinue}
          className="flex-1"
        >
          {stepIndex === stepCount - 1 ? t("finish") : t("next")}
        </SubmitButton>
      </form>
    </div>
  );
}
