"use client";

import { useState, useTransition } from "react";

import type { DisplayLanguage, LearningLanguage, ProficiencyLevel } from "@/lib/schemas/common";
import { isLevelForLanguage } from "@/lib/schemas/common";

import { completeOnboarding } from "../_lib/actions";

export const ONBOARDING_STEPS = ["language", "level", "display"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

interface Selection {
  learningLanguage?: LearningLanguage;
  level?: ProficiencyLevel;
  displayLanguage?: DisplayLanguage;
}

/** Step navigation + selections for the onboarding wizard, and the final submit. */
export function useOnboardingWizard(initialDisplayLanguage: DisplayLanguage) {
  const [stepIndex, setStepIndex] = useState(0);
  const [selection, setSelection] = useState<Selection>({
    displayLanguage: initialDisplayLanguage,
  });
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const step = ONBOARDING_STEPS[stepIndex] ?? "language";

  const canContinue =
    (step === "language" && Boolean(selection.learningLanguage)) ||
    (step === "level" && Boolean(selection.level)) ||
    (step === "display" && Boolean(selection.displayLanguage));

  const selectLanguage = (learningLanguage: LearningLanguage) =>
    setSelection((current) => ({
      ...current,
      learningLanguage,
      // Switching language invalidates a level picked for the other language
      level:
        current.level && isLevelForLanguage(learningLanguage, current.level)
          ? current.level
          : undefined,
    }));

  const selectLevel = (level: ProficiencyLevel) =>
    setSelection((current) => ({ ...current, level }));

  const selectDisplayLanguage = (displayLanguage: DisplayLanguage) =>
    setSelection((current) => ({ ...current, displayLanguage }));

  const back = () => setStepIndex((index) => Math.max(0, index - 1));

  const next = () => {
    if (!canContinue) return;
    if (stepIndex < ONBOARDING_STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }

    setError(undefined);
    startTransition(async () => {
      const result = await completeOnboarding({
        ...selection,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      // On success the action redirects, so we only get here on failure
      if (result && !result.ok) setError(result.error ?? "errors.unexpected");
    });
  };

  return {
    step,
    stepIndex,
    stepCount: ONBOARDING_STEPS.length,
    selection,
    canContinue,
    isPending,
    error,
    selectLanguage,
    selectLevel,
    selectDisplayLanguage,
    back,
    next,
  };
}
