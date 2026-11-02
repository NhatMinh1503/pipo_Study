import type { NextRequest } from "next/server";

import { dictionaryLookupQuerySchema } from "@/lib/schemas/dictionary";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/server/auth";
import { jsonError, jsonOk } from "@/server/http";
import { getCachedExplanation, lookupEntries } from "@/server/services/dictionary";

/** GET /api/dictionary?term=&reading=&language= — offline entries + cached AI explanation. */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return jsonError("UNAUTHORIZED");

  const query = dictionaryLookupQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!query.success) return jsonError("VALIDATION_ERROR");
  const { term, reading, language } = query.data;

  const client = await createClient();
  const { data: profile } = await client
    .from("profiles")
    .select("display_language")
    .eq("user_id", user.id)
    .maybeSingle();

  const [entries, explanation] = await Promise.all([
    lookupEntries(client, term, reading, language),
    getCachedExplanation(client, {
      term,
      reading,
      language,
      displayLanguage: profile?.display_language ?? "vi",
    }),
  ]);

  return jsonOk({ entries, explanation });
}
