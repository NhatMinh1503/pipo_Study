"use client";

import { Swords } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { findBattle } from "@/server/actions/battle";

export function FindBattleButton() {
  const t = useTranslations("battle");
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          // Success redirects into the room, so only failures return here
          const result = await findBattle();
          if (!result.ok) toast.error(t("failed"));
        })
      }
    >
      <Swords aria-hidden />
      {isPending ? t("finding") : t("find")}
    </Button>
  );
}
