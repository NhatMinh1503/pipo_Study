import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { AiError, generateStructured, type FetchFn } from "./gemini";

const schema = z.object({ answer: z.string() });

const request = {
  apiKey: "test-key",
  model: "gemini-test",
  systemInstruction: "system",
  prompt: "prompt",
  schema,
  promptVersion: "test.v1",
};

function reply(json: unknown, status = 200) {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }] }),
    { status },
  );
}

function setup(...responses: Array<Response | Error>) {
  const fetchMock = vi.fn<FetchFn>();
  for (const response of responses) {
    if (response instanceof Error) fetchMock.mockRejectedValueOnce(response);
    else fetchMock.mockResolvedValueOnce(response);
  }
  const sleep = vi.fn(async (_ms: number) => {});
  return { fetchMock, sleep, deps: { fetch: fetchMock, sleep, random: () => 0 } };
}

describe("generateStructured", () => {
  it("returns validated JSON on the first try", async () => {
    const { fetchMock, deps } = setup(reply({ answer: "ok" }));

    const result = await generateStructured(request, deps);

    expect(result.data).toEqual({ answer: "ok" });
    expect(result.attempts).toBe(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toContain("/models/gemini-test:generateContent");
    expect(new Headers(init?.headers).get("x-goog-api-key")).toBe("test-key");
    const body = JSON.parse(String(init?.body)) as { generationConfig: Record<string, unknown> };
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseJsonSchema).toMatchObject({ type: "object" });
  });

  it("retries on 429 and 5xx with exponential backoff", async () => {
    const { sleep, deps } = setup(
      new Response("", { status: 429 }),
      new Response("", { status: 503 }),
      reply({ answer: "third time" }),
    );

    const result = await generateStructured(request, deps);

    expect(result).toMatchObject({ data: { answer: "third time" }, attempts: 3 });
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([500, 1000]);
  });

  it("retries when the reply does not match the schema", async () => {
    const { deps } = setup(reply({ wrong: true }), reply({ answer: "fixed" }));
    await expect(generateStructured(request, deps)).resolves.toMatchObject({ attempts: 2 });
  });

  it("retries on network errors and timeouts", async () => {
    const { deps } = setup(new TypeError("fetch failed"), reply({ answer: "ok" }));
    await expect(generateStructured(request, deps)).resolves.toMatchObject({ attempts: 2 });
  });

  it("gives up after 2 retries with AI_UNAVAILABLE", async () => {
    const { fetchMock, deps } = setup(
      new Response("", { status: 500 }),
      new Response("", { status: 500 }),
      new Response("", { status: 500 }),
    );

    await expect(generateStructured(request, deps)).rejects.toMatchObject({
      code: "AI_UNAVAILABLE",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry client errors such as a bad API key", async () => {
    const { fetchMock, deps } = setup(new Response("", { status: 403 }));

    await expect(generateStructured(request, deps)).rejects.toMatchObject({
      code: "AI_BAD_REQUEST",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails fast with AI_NOT_CONFIGURED when no key is set", async () => {
    const { fetchMock, deps } = setup();

    await expect(
      generateStructured({ ...request, apiKey: undefined }, deps),
    ).rejects.toBeInstanceOf(AiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
