import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";

import { ModerationItem } from "./_components/moderation-item";

export const metadata: Metadata = { title: "Moderation" };

async function ModerationQueue() {
  const supabase = await createClient();
  const [{ data: isModerator }, t] = await Promise.all([
    supabase.rpc("is_moderator"),
    getTranslations("moderation"),
  ]);
  // Not a moderator: the page does not exist for you
  if (!isModerator) notFound();
  const { data: queue } = await supabase.rpc("moderation_queue");

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      {!queue?.length ? (
        <EmptyState icon={ShieldCheck} title={t("empty")} />
      ) : (
        <ul className="space-y-3">
          {queue.map((item) => (
            <li key={item.post_id}>
              <ModerationItem
                postId={item.post_id}
                title={item.title}
                pairs={Array.isArray(item.pairs) ? item.pairs.length : 0}
                hidden={item.hidden_at !== null}
                reports={Number(item.open_reports)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function ModerationPage() {
  return (
    <PageContainer>
      <Suspense fallback={<Skeleton className="h-96 border-2 border-border" />}>
        <ModerationQueue />
      </Suspense>
    </PageContainer>
  );
}
