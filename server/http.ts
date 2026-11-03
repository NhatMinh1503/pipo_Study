import "server-only";

import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "AI_NOT_CONFIGURED"
  | "AI_UNAVAILABLE"
  | "AI_BAD_REQUEST"
  | "INTERNAL";

const STATUS: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  AI_NOT_CONFIGURED: 503,
  AI_UNAVAILABLE: 503,
  AI_BAD_REQUEST: 502,
  INTERNAL: 500,
};

export function jsonOk<T>(data: T) {
  return NextResponse.json(data);
}

/** Error body shape shared by every route: `{ error: { code, message } }`. No stack traces. */
export function jsonError(code: ApiErrorCode, message = code) {
  return NextResponse.json({ error: { code, message } }, { status: STATUS[code] });
}
