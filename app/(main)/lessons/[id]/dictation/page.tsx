import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { getLessonWorkspace } from "@/server/queries/lesson-workspace";

import { PracticeHeader } from "../_components/practice-header";

import { DictationSession } from "./_components/dictation-session";

export const metadata: Metadata = { title: "Dictation" };

async function DictationLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getLessonWorkspace(await createClient(), id);
  if (!workspace) notFound();

  return (
    <>
      <PracticeHeader mode="dictation" title={workspace.title} />
      <DictationSession workspace={workspace} />
    </>
  );
}

export default function DictationPage({ params }: PageProps<"/lessons/[id]/dictation">) {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-72 border-2 border-border" />}>
        <DictationLoader params={params} />
      </Suspense>
    </PageContainer>
  );
}
