/**
 * Returns `next` only if it is a same-origin relative path; otherwise `fallback`.
 * Blocks open redirects such as `//evil.com`, `/\evil.com` or `https://evil.com`.
 */
export function safeRedirectPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}
