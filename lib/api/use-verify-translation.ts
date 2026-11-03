"use client";

import { useMutation } from "@tanstack/react-query";

import {
  verifyTranslationResponseSchema,
  type VerifyTranslationRequest,
} from "@/lib/schemas/translation";

import { postJson } from "./http";

/** Sends one sentence translation for AI grading. */
export function useVerifyTranslation() {
  return useMutation({
    mutationFn: (request: VerifyTranslationRequest) =>
      postJson("/api/translations/verify", request, verifyTranslationResponseSchema),
  });
}
