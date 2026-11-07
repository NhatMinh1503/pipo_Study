"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  verifyTranslationResponseSchema,
  type VerifyTranslationRequest,
} from "@/lib/schemas/translation";

import { postJson } from "./http";
import { levelUpsKey } from "./use-level-ups";

/** Sends one sentence translation for AI grading. */
export function useVerifyTranslation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: VerifyTranslationRequest) =>
      postJson("/api/translations/verify", request, verifyTranslationResponseSchema),
    // An unlocked sentence may have crossed a level boundary
    onSuccess: (result) => {
      if (result.xp && result.xp.awarded > 0) {
        void queryClient.invalidateQueries({ queryKey: levelUpsKey });
      }
    },
  });
}
