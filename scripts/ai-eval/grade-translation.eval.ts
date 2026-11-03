// Compares AI providers on the grading fixtures: verdict agreement and latency.
// Spends real quota, so it never runs in CI. Usage: npm run ai:eval
import { it } from "vitest";
import { z } from "zod";

import {
  displayLanguageSchema,
  learningLanguageSchema,
  proficiencyLevelSchema,
} from "@/lib/schemas/common";

import { generateStructured } from "@/server/gemini";
import { generateStructuredGroq } from "@/server/groq";
import fixtures from "@/server/prompts/fixtures/grade-translation.json";
import {
  buildGradePrompt,
  gradeResponseSchema,
  PROMPT_VERSION,
  SYSTEM_INSTRUCTION,
  type GradeInput,
} from "@/server/prompts/grade-translation.v1";

process.loadEnvFile(".env.local");

const fixtureInput = z.object({
  source: z.string(),
  userTranslation: z.string(),
  sourceLanguage: learningLanguageSchema,
  level: proficiencyLevelSchema,
  targetLanguage: displayLanguageSchema,
  contextBefore: z.string().nullable().default(null),
  contextAfter: z.string().nullable().default(null),
  referenceTranslation: z.string().nullable().default(null),
});

const PROVIDERS = {
  gemini: (input: GradeInput) =>
    generateStructured(
      {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt: buildGradePrompt(input),
        schema: gradeResponseSchema,
        promptVersion: PROMPT_VERSION,
      },
      { timeoutMs: 30_000, maxRetries: 0 },
    ),
  groq: (input: GradeInput) =>
    generateStructuredGroq(
      {
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.EVAL_GROQ_MODEL ?? process.env.GROQ_MODEL ?? "qwen/qwen3.8-27b",
        systemInstruction: SYSTEM_INSTRUCTION,
        prompt: buildGradePrompt(input),
        schema: gradeResponseSchema,
        promptVersion: PROMPT_VERSION,
      },
      { timeoutMs: 30_000, maxRetries: 0 },
    ),
};

it("grading fixtures per provider", async () => {
  const only = process.env.EVAL_PROVIDERS?.split(",") ?? Object.keys(PROVIDERS);
  for (const [name, run] of Object.entries(PROVIDERS)) {
    if (!only.includes(name)) continue;
    let correct = 0;
    const latencies: number[] = [];
    for (const fixture of fixtures) {
      // Stay under free-tier tokens-per-minute limits between calls
      await new Promise((resolve) => setTimeout(resolve, Number(process.env.EVAL_DELAY_MS ?? 0)));
      const input: GradeInput = fixtureInput.parse(fixture.input);
      const started = performance.now();
      try {
        const { data } = await run(input);
        const ms = Math.round(performance.now() - started);
        latencies.push(ms);
        const ok = data.verdict === fixture.expectedVerdict;
        if (ok) correct += 1;
        process.stderr.write(
          "\n" +
            `${name}\t${ok ? "✓" : "✗"}\t${data.verdict.padEnd(10)}\t(want ${fixture.expectedVerdict})\t${ms} ms\t${fixture.name}\n\t\t${data.feedback.replace(/\s+/g, " ").slice(0, 160)}`,
        );
      } catch (error) {
        process.stderr.write(
          "\n" +
            `${name}\t!\terror\t${error instanceof Error ? error.message : String(error)}\t${fixture.name}`,
        );
      }
    }
    const sorted = [...latencies].sort((a, b) => a - b);
    process.stderr.write(
      "\n" +
        `== ${name}: ${correct}/${fixtures.length} verdicts match · median ${sorted[Math.floor(sorted.length / 2)] ?? "-"} ms\n`,
    );
  }
});
