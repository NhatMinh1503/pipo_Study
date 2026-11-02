"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { VocabItem } from "@/lib/vocab/types";
import { updateVocabMeaning } from "@/server/actions/notebook";

interface EditMeaningDialogProps {
  item: VocabItem;
  children: React.ReactNode;
}

export function EditMeaningDialog({ item, children }: EditMeaningDialogProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [meaning, setMeaning] = useState(item.meaning);
  const [isSaving, startSaving] = useTransition();

  const save = () =>
    startSaving(async () => {
      const result = await updateVocabMeaning({ id: item.id, meaning });
      if (result.ok) {
        toast.success(t("notebook.updated"));
        setOpen(false);
      } else {
        toast.error(t(result.error ?? "errors.unexpected"));
      }
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle lang={item.language}>{item.term}</DialogTitle>
          <DialogDescription>{t("notebook.editDescription")}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={meaning}
          onChange={(event) => setMeaning(event.target.value)}
          maxLength={500}
          rows={3}
          aria-label={t("notebook.meaning")}
        />
        <DialogFooter>
          <Button onClick={save} disabled={isSaving}>
            {t("notebook.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
