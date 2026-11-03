"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { LearningLanguage } from "@/lib/schemas/common";
import {
  dictionaryLookupResponseSchema,
  wordExplanationSchema,
  type DictionaryLookupResponse,
  type ExplainWordRequest,
} from "@/lib/schemas/dictionary";

import { ApiError, postJson } from "./http";

interface WordKey {
  term: string;
  reading: string;
  language: LearningLanguage;
}

const lookupKey = (word: WordKey) =>
  ["dictionary", word.language, word.term, word.reading] as const;

/** Offline dictionary entries + cached AI explanation; fetched only while `enabled` (popup open). */
export function useDictionaryLookup(word: WordKey, enabled: boolean) {
  return useQuery({
    queryKey: lookupKey(word),
    enabled,
    staleTime: Infinity,
    queryFn: async (): Promise<DictionaryLookupResponse> => {
      const params = new URLSearchParams({ ...word });
      const response = await fetch(`/api/dictionary?${params.toString()}`);
      if (!response.ok) throw new ApiError("INTERNAL", response.status);
      return dictionaryLookupResponseSchema.parse(await response.json());
    },
  });
}

/** Asks the AI to explain a word in the user's language, then stores it in the lookup cache. */
export function useExplainWord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ExplainWordRequest) =>
      postJson("/api/dictionary/explain", request, wordExplanationSchema),
    onSuccess: (explanation, request) => {
      queryClient.setQueryData<DictionaryLookupResponse>(
        lookupKey({ term: request.term, reading: request.reading, language: request.language }),
        (current) => (current ? { ...current, explanation } : current),
      );
    },
  });
}
