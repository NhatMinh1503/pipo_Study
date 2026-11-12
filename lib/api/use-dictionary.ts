"use client";

import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import type { LearningLanguage } from "@/lib/schemas/common";
import {
  dictionaryLookupResponseSchema,
  warmVocabularyResponseSchema,
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

const WARM_KEY = ["dictionary", "warm"] as const;

/**
 * Asks the server once per lesson visit to explain the lesson's uncached words ahead of time;
 * when it is done, popups opened meanwhile refetch so they pick up the new meanings.
 */
export function useWarmVocabulary(lessonId: string) {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationKey: WARM_KEY,
    mutationFn: (id: string) =>
      postJson("/api/dictionary/warm", { lessonId: id }, warmVocabularyResponseSchema),
    onSuccess: (result) => {
      if (result.explained > 0) void queryClient.invalidateQueries({ queryKey: ["dictionary"] });
    },
    // Best effort: the popup still offers "Explain" word by word
    onError: () => undefined,
  });
  // Once per lesson, also under React's dev double-run of effects
  const started = useRef<string | null>(null);
  useEffect(() => {
    if (started.current === lessonId) return;
    started.current = lessonId;
    mutate(lessonId);
  }, [lessonId, mutate]);
}

/** True while a lesson's vocabulary is being explained in the background. */
export function useIsWarmingVocabulary(): boolean {
  return useIsMutating({ mutationKey: WARM_KEY }) > 0;
}
