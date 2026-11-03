"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";

import { deleteLesson } from "../_lib/actions";

interface DeleteLessonButtonProps {
  lessonId: string;
  title: string;
}

export function DeleteLessonButton({ lessonId, title }: DeleteLessonButtonProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();

  const onConfirm = () =>
    startTransition(async () => {
      const result = await deleteLesson(lessonId);
      if (result.ok) toast.success(t("lessons.deleted"));
      else toast.error(t(result.error ?? "errors.unexpected"));
    });

  return (
    <ConfirmDialog
      title={t("lessons.deleteTitle")}
      description={t("lessons.deleteDescription", { title })}
      confirmLabel={t("lessons.delete")}
      onConfirm={onConfirm}
      destructive
    >
      <Button
        variant="ghost"
        size="icon"
        disabled={isPending}
        aria-label={t("lessons.deleteAria", { title })}
      >
        <Trash2 aria-hidden />
      </Button>
    </ConfirmDialog>
  );
}
