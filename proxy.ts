import type { NextRequest } from "next/server";

import { getRouteAccess } from "@/lib/auth/route-access";
import { redirectWithCookies, updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, isSignedIn } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
  const access = getRouteAccess(pathname);

  if (!isSignedIn && access === "protected") {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return redirectWithCookies(login, response);
  }

  if (isSignedIn && (access === "guest-only" || pathname === "/")) {
    return redirectWithCookies(new URL("/dashboard", request.url), response);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static assets and image optimization; run on everything else
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
