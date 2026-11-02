import type { LearningLanguage } from "@/lib/schemas/common";

export interface Author {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface FeedComment {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
}

export interface FeedPost {
  id: string;
  title: string;
  language: LearningLanguage;
  pairs: { source: string; translation: string }[];
  createdAt: string;
  author: Author;
  likeCount: number;
  likedByMe: boolean;
  mine: boolean;
  comments: FeedComment[];
}

/** Opaque cursor for "older posts": created_at and id of the last post shown. */
export function encodeCursor(post: Pick<FeedPost, "createdAt" | "id">): string {
  return `${post.createdAt}_${post.id}`;
}

// Strict shapes: the decoded values are interpolated into a PostgREST filter
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function decodeCursor(cursor: string | undefined): { createdAt: string; id: string } | null {
  if (!cursor) return null;
  const separator = cursor.lastIndexOf("_");
  const createdAt = cursor.slice(0, separator);
  const id = cursor.slice(separator + 1);
  if (!TIMESTAMP.test(createdAt) || !UUID.test(id)) return null;
  return { createdAt, id };
}
