import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getTokenizedWorkspace } from "@/server/services/ensure-tokens";

import { TranslateWorkspace } from "./translate-workspace";

export async function TranslateLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getTokenizedWorkspace(await createClient(), id);
  if (!workspace) notFound();

  return <TranslateWorkspace workspace={workspace} />;
}
