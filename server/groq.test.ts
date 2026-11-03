import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { FetchFn } from "./gemini";
import { generateStructuredGroq } from "./groq";

const request = {
  apiKey: "k",
  model: "openai/gpt-oss-120b",
  systemInstruction: "s",
  prompt: "p",
  schema: z.object({ answer: z.string() }),
  promptVersion: "t.v1",
};

const reply = (content: string | null, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });

describe("generateStructuredGroq", () => {
  it("sends a JSON-schema request and returns the validated answer", async () => {
    const fetchMock = vi.fn<FetchFn>().mockResolvedValue(reply('{"answer":"ok"}'));
    const result = await generateStructuredGroq(request, { fetch: fetchMock });
    expect(result.data).toEqual({ answer: "ok" });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1].body));
    expect(body.model).toBe("openai/gpt-oss-120b");
    expect(body.response_format.type).toBe("json_schema");
  });

  it("retries once on 429 and invalid JSON, then gives up", async () => {
    const fetchMock = vi
      .fn<FetchFn>()
      .mockResolvedValueOnce(reply(null, 429))
      .mockResolvedValueOnce(reply("not json"));
    await expect(
      generateStructuredGroq(request, { fetch: fetchMock, maxRetries: 1 }),
    ).rejects.toMatchObject({
      code: "AI_UNAVAILABLE",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a rejected request (bad key)", async () => {
    const fetchMock = vi.fn<FetchFn>().mockResolvedValue(reply(null, 401));
    await expect(generateStructuredGroq(request, { fetch: fetchMock })).rejects.toMatchObject({
      code: "AI_BAD_REQUEST",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("needs a key", async () => {
    await expect(generateStructuredGroq({ ...request, apiKey: undefined })).rejects.toMatchObject({
      code: "AI_NOT_CONFIGURED",
    });
  });
});
