import { z } from "zod";

export const newsRewriteRequestSchema = z.object({ url: z.url().max(500) });

export const newsRewriteResponseSchema = z.object({
  title: z.string(),
  passage: z.string(),
  source: z.object({
    name: z.string(),
    url: z.string(),
    license: z.string(),
    licenseUrl: z.string(),
    attribution: z.string(),
  }),
});

export type NewsRewriteRequest = z.infer<typeof newsRewriteRequestSchema>;
export type NewsRewriteResponse = z.infer<typeof newsRewriteResponseSchema>;
