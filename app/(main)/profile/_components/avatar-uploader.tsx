"use client";

import { Camera, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { setAvatarPath } from "@/server/actions/account";

const MAX_BYTES = 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

interface AvatarUploaderProps {
  userId: string;
  avatarUrl: string | null;
}

/** Uploads straight to the user's own Storage folder, then saves the path on the profile. */
export function AvatarUploader({ userId, avatarUrl }: AvatarUploaderProps) {
  const t = useTranslations("profile");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const upload = (file: File) => {
    if (!TYPES.includes(file.type)) return toast.error(t("avatarType"));
    if (file.size > MAX_BYTES) return toast.error(t("avatarSize"));

    startTransition(async () => {
      const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
      // A new name each time so browsers never show a cached old picture
      const path = `${userId}/avatar-${Date.now()}.${extension}`;
      const { error } = await createClient()
        .storage.from("avatars")
        .upload(path, file, { contentType: file.type });
      if (error) return void toast.error(t("avatarFailed"));

      const result = await setAvatarPath(path);
      if (result.ok) toast.success(t("avatarSaved"));
      else toast.error(t("avatarFailed"));
    });
  };

  return (
    <div className="flex items-center gap-4">
      <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden border-2 border-border bg-muted">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local Storage URL, no image optimizer needed
          <img src={avatarUrl} alt={t("avatarAlt")} className="size-full object-cover" />
        ) : (
          <UserRound className="size-8 text-muted-foreground" aria-hidden />
        )}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={TYPES.join(",")}
        className="sr-only"
        aria-label={t("avatarChange")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload(file);
          event.target.value = "";
        }}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
      >
        <Camera aria-hidden />
        {t("avatarChange")}
      </Button>
    </div>
  );
}
