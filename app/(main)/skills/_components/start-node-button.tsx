"use client";

import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { startSkillNode } from "@/server/actions/generate-lesson";

/** Generates the node's lesson (AI, a few seconds) and opens the translate screen. */
export function StartNodeButton({ nodeId, again }: { nodeId: string; again: boolean }) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant={again ? "outline" : "default"}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          // On success the action redirects; only failures come back here
          const result = await startSkillNode(nodeId);
          if (!result.ok) toast.error(t(result.error ?? "errors.unexpected"));
        })
      }
    >
      {isPending && <LoaderCircle className="animate-spin" aria-hidden />}
      {isPending
        ? t("skills.tree.starting")
        : again
          ? t("skills.tree.again")
          : t("skills.tree.start")}
    </Button>
  );
}
