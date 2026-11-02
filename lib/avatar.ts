import { publicEnv } from "@/lib/env";

/** Public URL of an avatar stored in the `avatars` bucket, or null when none is set. */
export function avatarUrl(path: string | null | undefined): string | null {
  return path
    ? `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`
    : null;
}
