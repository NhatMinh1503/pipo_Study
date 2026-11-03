"use client";

import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { publishLesson } from "@/server/actions/community";

/** Shares the finished lesson to the community feed, then opens the feed. */
export function PublishButton({ lessonId }: { lessonId: string }) {
  const t = useTranslations("result");
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          // On success the action redirects, so only failures come back
          const result = await publishLesson(lessonId);
          if (!result.ok) toast.error(t("publishFailed"));
        })
      }
    >
      <Share2 aria-hidden />
      {isPending ? t("publishing") : t("publish")}
    </Button>
  );
}
