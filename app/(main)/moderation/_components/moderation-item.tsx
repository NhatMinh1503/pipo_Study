"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { moderatePost } from "@/server/actions/community";

interface ModerationItemProps {
  postId: string;
  title: string;
  pairs: number;
  hidden: boolean;
  reports: number;
}

/** One reported post: restore it to the feed or remove it for good. */
export function ModerationItem({ postId, title, pairs, hidden, reports }: ModerationItemProps) {
  const t = useTranslations("moderation");
  const [isPending, startTransition] = useTransition();

  const act = (action: "restore" | "remove") =>
    startTransition(async () => {
      const result = await moderatePost({ postId, action });
      if (result.ok) toast.success(t(action === "restore" ? "restored" : "removed"));
      else toast.error(t("failed"));
    });

  return (
    <article className="sheet-tight flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        <p className="mono-label">
          {t("meta", { reports, pairs })}
          {hidden && ` · ${t("hidden")}`}
        </p>
      </div>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => act("restore")}>
        {t("restore")}
      </Button>
      <Button size="sm" variant="destructive" disabled={isPending} onClick={() => act("remove")}>
        {t("remove")}
      </Button>
    </article>
  );
}
