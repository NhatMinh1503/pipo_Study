"use client";

import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";

import { useNewsRewrite } from "@/lib/api/use-news-rewrite";
import type { CreateLessonInput } from "@/lib/schemas/lesson";

/**
 * Fills title and passage from the AI rewrite of a news article — once, and only while the
 * learner has not started typing, so their own edits are never overwritten.
 */
export function useNewsPrefill(
  form: UseFormReturn<CreateLessonInput>,
  newsUrl: string | undefined,
) {
  const rewrite = useNewsRewrite(newsUrl);
  const { data } = rewrite;

  useEffect(() => {
    if (!data) return;
    const { dirtyFields } = form.formState;
    if (!dirtyFields.title) form.setValue("title", data.title.slice(0, 120));
    if (!dirtyFields.text) form.setValue("text", data.passage, { shouldValidate: true });
  }, [data, form]);

  return rewrite;
}
