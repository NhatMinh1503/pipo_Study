import { z } from "zod";

import { publicEnv } from "@/lib/env";

const internalUrl = z
  .url()
  .optional()
  .parse(process.env.SUPABASE_INTERNAL_URL || undefined);

/**
 * URL the Next.js server uses to reach Supabase. Inside Docker, 127.0.0.1 is the container
 * itself, so docker-compose points SUPABASE_INTERNAL_URL at the host; the browser keeps
 * using the public URL.
 */
export const serverSupabaseUrl = internalUrl ?? publicEnv.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Auth cookie name, derived from the public URL exactly like supabase-js does by default.
 * Pinned so the server, which may talk to a different host, reads the browser's cookie.
 */
export const authCookieName = `sb-${new URL(publicEnv.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
