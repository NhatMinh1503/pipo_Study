import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getLessonWorkspace } from "@/server/queries/lesson-workspace";
import { ensureTokens } from "@/server/services/ensure-tokens";

import { TranslateWorkspace } from "./translate-workspace";

export async function TranslateLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await createClient();
  const workspace = await getLessonWorkspace(client, id);
  if (!workspace) notFound();

  return <TranslateWorkspace workspace={await ensureTokens(client, workspace)} />;
}
