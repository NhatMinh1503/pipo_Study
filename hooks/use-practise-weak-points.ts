"use client";

import { useState, useTransition } from "react";

import type { ErrorTag } from "@/lib/ai/error-tags";
import { generateLesson } from "@/server/actions/generate-lesson";

/** Turns mistake types into a 3–5 minute micro-lesson; success navigates to it. */
export function usePractiseWeakPoints(tags: readonly ErrorTag[]) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const practise = () =>
    startTransition(async () => {
      setError(undefined);
      const result = await generateLesson({ focusTags: [...tags] });
      // Success redirects to the new lesson
      if (result && !result.ok) setError(result.error);
    });

  return { practise, isPending, error };
}
