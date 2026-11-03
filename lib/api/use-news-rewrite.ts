"use client";

import { useQuery } from "@tanstack/react-query";

import { newsRewriteResponseSchema } from "@/lib/schemas/news";

import { postJson } from "./http";

/**
 * Passage rewritten from an open news article at the learner's level. Kept for the session
 * so going back and forth does not spend another AI call; never retried automatically.
 */
export function useNewsRewrite(url: string | undefined) {
  return useQuery({
    queryKey: ["news-rewrite", url],
    queryFn: () => postJson("/api/news/rewrite", { url }, newsRewriteResponseSchema),
    enabled: Boolean(url),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
