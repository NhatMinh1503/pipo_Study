import type { z } from "zod";

/** Error from one of our API routes; `code` matches `{ error: { code } }` in the body. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

/** POSTs JSON to an app route and validates the response with `schema`. */
export async function postJson<T>(url: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("NETWORK", 0);
  }

  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof json.error === "object" &&
      json.error !== null &&
      "code" in json.error &&
      typeof json.error.code === "string"
        ? json.error.code
        : "INTERNAL";
    throw new ApiError(code, response.status);
  }

  return schema.parse(json);
}
