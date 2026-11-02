"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { hasKanji } from "@/lib/nlp/kana";
import type { VocabItem } from "@/lib/vocab/types";
import { deleteVocabItem } from "@/server/actions/notebook";

import { EditMeaningDialog } from "./edit-meaning-dialog";

export function VocabCard({ item }: { item: VocabItem }) {
  const t = useTranslations();
  const [isDeleting, startDeleting] = useTransition();

  const remove = () =>
    startDeleting(async () => {
      const result = await deleteVocabItem(item.id);
      if (result.ok) toast.success(t("notebook.deleted"));
      else toast.error(t(result.error ?? "errors.unexpected"));
    });

  return (
    <article className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p lang={item.language} className="text-lg font-semibold">
            {item.term}
          </p>
          {item.reading && hasKanji(item.term) && (
            <p lang="ja" className="text-sm text-muted-foreground">
              {item.reading}
            </p>
          )}
        </div>
        <div className="flex shrink-0">
          <EditMeaningDialog item={item}>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("notebook.editAria", { term: item.term })}
            >
              <Pencil aria-hidden />
            </Button>
          </EditMeaningDialog>
          <ConfirmDialog
            title={t("notebook.deleteTitle")}
            description={t("notebook.deleteDescription", { term: item.term })}
            confirmLabel={t("notebook.delete")}
            onConfirm={remove}
            destructive
          >
            <Button
              variant="ghost"
              size="icon"
              disabled={isDeleting}
              aria-label={t("notebook.deleteAria", { term: item.term })}
            >
              <Trash2 aria-hidden />
            </Button>
          </ConfirmDialog>
        </div>
      </header>
      <p className={item.meaning ? "text-sm" : "text-sm text-muted-foreground italic"}>
        {item.meaning || t("notebook.noMeaning")}
      </p>
      {item.contextSentence && (
        <div className="mt-auto space-y-1 border-l-2 border-border pl-3 text-xs text-muted-foreground">
          <p lang={item.language}>{item.contextSentence}</p>
          {item.contextTranslation && <p>{item.contextTranslation}</p>}
        </div>
      )}
    </article>
  );
}
