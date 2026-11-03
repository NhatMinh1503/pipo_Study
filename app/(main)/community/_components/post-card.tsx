"use client";

import { Flag, Heart, Send, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { UserAvatar } from "@/components/common/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FeedPost } from "@/lib/community/types";
import { cn } from "@/lib/utils";
import { addComment, deletePost, reportPost, toggleLike } from "@/server/actions/community";

interface PostCardProps {
  post: FeedPost;
  /** "3 hours ago", formatted on the server so both renders agree on the clock. */
  postedAgo: string;
}

export function PostCard({ post, postedAgo }: PostCardProps) {
  const t = useTranslations("community");
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const name = post.author.name ?? t("anonymous");

  const run = (action: () => Promise<{ ok: boolean }>, done?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) done?.();
      else toast.error(t("failed"));
    });

  return (
    <article className="sheet-tight space-y-4 p-5">
      <header className="flex items-center gap-3">
        <UserAvatar name={name} url={post.author.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="mono-label">{postedAgo}</p>
        </div>
        {post.mine ? (
          <ConfirmDialog
            title={t("deleteTitle")}
            description={t("deleteDescription")}
            confirmLabel={t("delete")}
            onConfirm={() => run(() => deletePost(post.id))}
            destructive
          >
            <Button variant="ghost" size="icon-sm" aria-label={t("delete")}>
              <Trash2 aria-hidden />
            </Button>
          </ConfirmDialog>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("report")}
            onClick={() =>
              run(
                () => reportPost(post.id),
                () => toast.success(t("reported")),
              )
            }
          >
            <Flag aria-hidden />
          </Button>
        )}
      </header>

      <h2 className="font-heading text-lg font-semibold">{post.title}</h2>
      <ol className="divide-y divide-dashed divide-border/30 border-y border-dashed border-border/30">
        {post.pairs.map((pair, index) => (
          <li key={index} className="space-y-0.5 py-2">
            <p lang={post.language}>{pair.source}</p>
            <p className="text-sm text-muted-foreground">{pair.translation}</p>
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          aria-pressed={post.likedByMe}
          onClick={() => run(() => toggleLike(post.id, post.likedByMe))}
        >
          <Heart className={cn(post.likedByMe && "fill-current text-destructive")} aria-hidden />
          <span className="mono-value">{post.likeCount}</span>
          <span className="sr-only">{t("like")}</span>
        </Button>
        <span className="mono-label">{t("comments", { count: post.comments.length })}</span>
      </div>

      {post.comments.length > 0 && (
        <ul className="space-y-2">
          {post.comments.map((item) => (
            <li key={item.id} className="text-sm">
              <span className="font-medium">{item.author.name ?? t("anonymous")}: </span>
              {item.body}
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (comment.trim())
            run(
              () => addComment(post.id, comment),
              () => setComment(""),
            );
        }}
      >
        <Input
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={500}
          placeholder={t("commentPlaceholder")}
          aria-label={t("commentPlaceholder")}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isPending || !comment.trim()}
          aria-label={t("send")}
        >
          <Send aria-hidden />
        </Button>
      </form>
    </article>
  );
}
