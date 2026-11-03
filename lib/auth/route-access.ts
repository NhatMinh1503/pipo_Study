export type RouteAccess = "public" | "guest-only" | "protected";

const GUEST_ONLY = ["/login", "/signup", "/forgot-password"];
const PUBLIC_PREFIXES = ["/auth/"];
// Served by the service worker without a session; must never redirect to /login
const PUBLIC_ROUTES = ["/offline", "/manifest.webmanifest", "/sw.js"];

/**
 * Classifies a path for the proxy's optimistic redirects:
 * - `guest-only`: signed-in users are sent to the dashboard
 * - `protected`: signed-out users are sent to /login
 * Real authorization still happens in Postgres RLS; this only improves navigation.
 */
export function getRouteAccess(pathname: string): RouteAccess {
  if (pathname === "/" || PUBLIC_ROUTES.includes(pathname)) return "public";
  if (GUEST_ONLY.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return "guest-only";
  }
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return "public";
  return "protected";
}
