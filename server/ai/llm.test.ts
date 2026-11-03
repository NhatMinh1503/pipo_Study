import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { AiError } from "@/server/gemini";

import { generateWithFallback, providerOrder } from "./llm";

const request = {
  systemInstruction: "s",
  prompt: "p",
  schema: z.object({ ok: z.boolean() }),
  promptVersion: "t.v1",
};
const both = { AI_PRIMARY: "gemini" as const, GEMINI_API_KEY: "g", GROQ_API_KEY: "q" };
const ok = { data: { ok: true }, attempts: 1, latencyMs: 5 };

describe("providerOrder", () => {
  it.each([
    [both, ["gemini", "groq"]],
    [{ ...both, AI_PRIMARY: "groq" as const }, ["groq", "gemini"]],
    [{ ...both, GROQ_API_KEY: undefined }, ["gemini"]],
    [{ ...both, GEMINI_API_KEY: undefined, GROQ_API_KEY: undefined }, []],
  ])("%j → %j", (env, expected) => {
    expect(providerOrder(env)).toEqual(expected);
  });
});

describe("generateWithFallback", () => {
  it("answers from the primary with a short budget when a fallback exists", async () => {
    const call = vi.fn().mockResolvedValue(ok);
    const result = await generateWithFallback(request, { env: both, call });
    expect(result.provider).toBe("gemini");
    expect(call).toHaveBeenCalledWith("gemini", request, { timeoutMs: 4_000, maxRetries: 0 });
  });

  it("fails over to the next provider, which gets the full budget", async () => {
    const call = vi
      .fn()
      .mockRejectedValueOnce(new AiError("AI_UNAVAILABLE", "slow"))
      .mockResolvedValueOnce(ok);
    const result = await generateWithFallback(request, { env: both, call });
    expect(result.provider).toBe("groq");
    expect(call).toHaveBeenLastCalledWith("groq", request, { timeoutMs: 9_000, maxRetries: 1 });
  });

  it("also fails over when the primary rejects the request (bad key or model)", async () => {
    const call = vi
      .fn()
      .mockRejectedValueOnce(new AiError("AI_BAD_REQUEST", "401"))
      .mockResolvedValueOnce(ok);
    expect((await generateWithFallback(request, { env: both, call })).provider).toBe("groq");
  });

  it("throws the last provider's AiError when everyone fails", async () => {
    const call = vi.fn().mockRejectedValue(new AiError("AI_UNAVAILABLE", "down"));
    await expect(generateWithFallback(request, { env: both, call })).rejects.toMatchObject({
      code: "AI_UNAVAILABLE",
    });
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("reports AI_NOT_CONFIGURED without any key", async () => {
    const call = vi.fn();
    await expect(
      generateWithFallback(request, {
        env: { ...both, GEMINI_API_KEY: undefined, GROQ_API_KEY: undefined },
        call,
      }),
    ).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED" });
    expect(call).not.toHaveBeenCalled();
  });

  it("wraps non-AI errors from the last provider", async () => {
    const call = vi.fn().mockRejectedValue(new TypeError("boom"));
    await expect(
      generateWithFallback(request, { env: { ...both, GROQ_API_KEY: undefined }, call }),
    ).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
  });
});
