import { MessagesSquare } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { getFormatter, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { encodeCursor } from "@/lib/community/types";
import { listFeed } from "@/server/queries/feed";

import { PostCard } from "./post-card";

export async function FeedList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [query, t] = await Promise.all([searchParams, getTranslations("community")]);
  const cursor = typeof query.before === "string" ? query.before : undefined;
  const [{ posts, hasMore }, format] = await Promise.all([listFeed(cursor), getFormatter()]);
  await connection();
  const now = new Date();
  const last = posts.at(-1);

  if (posts.length === 0) {
    return <EmptyState icon={MessagesSquare} title={t("empty")} description={t("emptyHint")} />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.id}>
            <PostCard post={post} postedAgo={format.relativeTime(new Date(post.createdAt), now)} />
          </li>
        ))}
      </ul>
      <div className="flex justify-center gap-2">
        {cursor && (
          <Button asChild variant="ghost">
            <Link href="/community">{t("newest")}</Link>
          </Button>
        )}
        {hasMore && last && (
          <Button asChild variant="outline">
            <Link href={`/community?before=${encodeURIComponent(encodeCursor(last))}`}>
              {t("older")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
