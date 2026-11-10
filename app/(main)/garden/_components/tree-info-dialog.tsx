"use client";

import { useFormatter, useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GAME } from "@/lib/game/config";
import { stageFor } from "@/lib/garden/growth";
import type { GardenTree } from "@/server/queries/garden";

interface TreeInfoDialogProps {
  tree: GardenTree | null;
  onClose: () => void;
  /** Puts focus back where it was when the dialog opened (it has no trigger of its own). */
  onRestoreFocus: () => void;
}

/** Details of one tree, opened from the scene or the tree list (garden-scene spec §7). */
export function TreeInfoDialog({ tree, onClose, onRestoreFocus }: TreeInfoDialogProps) {
  const t = useTranslations("garden");
  const format = useFormatter();
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });

  return (
    <Dialog open={tree !== null} onOpenChange={(open) => !open && onClose()}>
      {tree && (
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onRestoreFocus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t(`species.${tree.species}`)}</DialogTitle>
            <DialogDescription>{t(`stage.${stageFor(tree.sessions)}`)}</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {/* Only trees from the old multi-session rule are still part-grown */}
            {tree.sessions < GAME.garden.matureAtSessions && (
              <>
                <dt className="mono-label">{t("info.sessions")}</dt>
                <dd className="mono-value">
                  {t("info.sessionsValue", {
                    sessions: tree.sessions,
                    total: GAME.garden.matureAtSessions,
                  })}
                </dd>
              </>
            )}
            <dt className="mono-label">{t("info.planted")}</dt>
            <dd>{date(tree.plantedAt)}</dd>
            {tree.maturedAt && (
              <>
                <dt className="mono-label">{t("info.matured")}</dt>
                <dd>{date(tree.maturedAt)}</dd>
              </>
            )}
          </dl>
          {tree.legacy && <p className="text-xs text-muted-foreground">{t("info.legacy")}</p>}
        </DialogContent>
      )}
    </Dialog>
  );
}
