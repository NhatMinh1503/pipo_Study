import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getLessonWorkspace } from "@/server/queries/lesson-workspace";

import { TranslateWorkspace } from "./translate-workspace";

export async function TranslateLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getLessonWorkspace(await createClient(), id);
  if (!workspace) notFound();

  return <TranslateWorkspace workspace={workspace} />;
}
