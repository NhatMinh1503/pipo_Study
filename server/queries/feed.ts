import "server-only";

import { decodeCursor, type Author, type FeedPost } from "@/lib/community/types";
import { avatarUrl } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";

export const FEED_PAGE_SIZE = 10;

/** Newest posts before `cursor`, with authors, likes and comments in four queries. */
export async function listFeed(cursor?: string): Promise<{ posts: FeedPost[]; hasMore: boolean }> {
  const user = await requireUser();
  const supabase = await createClient();
  const after = decodeCursor(cursor);

  let query = supabase
    .from("posts")
    .select("id, user_id, title, language, pairs, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(FEED_PAGE_SIZE + 1);
  // Keyset pagination on (created_at, id) so posts sharing a timestamp are not skipped
  if (after) {
    query = query.or(
      `created_at.lt.${after.createdAt},and(created_at.eq.${after.createdAt},id.lt.${after.id})`,
    );
  }

  const { data: rows } = await query;
  const page = (rows ?? []).slice(0, FEED_PAGE_SIZE);
  const postIds = page.map((post) => post.id);

  const [likes, comments] = await Promise.all([
    supabase.from("likes").select("post_id, user_id").in("post_id", postIds),
    supabase
      .from("comments")
      .select("id, post_id, user_id, body, created_at")
      .in("post_id", postIds)
      .order("created_at"),
  ]);

  const authorIds = [
    ...new Set([
      ...page.map((post) => post.user_id),
      ...(comments.data ?? []).map((c) => c.user_id),
    ]),
  ];
  const { data: cards } = await supabase
    .from("profile_cards")
    .select("user_id, display_name, avatar_path")
    .in("user_id", authorIds);
  const authors = new Map<string, Author>(
    (cards ?? []).flatMap((card) =>
      card.user_id
        ? [
            [
              card.user_id,
              { id: card.user_id, name: card.display_name, avatarUrl: avatarUrl(card.avatar_path) },
            ],
          ]
        : [],
    ),
  );
  const authorOf = (id: string): Author => authors.get(id) ?? { id, name: null, avatarUrl: null };

  const posts = page.map((post) => {
    const postLikes = (likes.data ?? []).filter((like) => like.post_id === post.id);
    const pairs = Array.isArray(post.pairs) ? post.pairs : [];
    return {
      id: post.id,
      title: post.title,
      language: post.language,
      pairs: pairs.flatMap((pair) =>
        pair && typeof pair === "object" && "source" in pair && "translation" in pair
          ? [{ source: String(pair.source), translation: String(pair.translation) }]
          : [],
      ),
      createdAt: post.created_at,
      author: authorOf(post.user_id),
      likeCount: postLikes.length,
      likedByMe: postLikes.some((like) => like.user_id === user.id),
      mine: post.user_id === user.id,
      comments: (comments.data ?? [])
        .filter((comment) => comment.post_id === post.id)
        .map((comment) => ({
          id: comment.id,
          body: comment.body,
          createdAt: comment.created_at,
          author: authorOf(comment.user_id),
        })),
    };
  });

  return { posts, hasMore: (rows ?? []).length > FEED_PAGE_SIZE };
}
