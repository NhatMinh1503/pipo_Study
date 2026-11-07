import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { splitSentences } from "@/lib/nlp/split-sentences";
import { PROMPT_VERSION } from "@/server/prompts/rewrite-news.v1";
import { createGeneratedLesson, createLessonForLearner } from "@/server/services/create-lesson";
import type { Database } from "@/types/database";

import { signInAs } from "./supabase-client";

const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SECRET_KEY ?? "",
  { auth: { persistSession: false } },
);

// An allow-listed article URL that only this test uses
const NEWS_URL = `https://www.kantei.go.jp/jp/int-test-${Date.now()}.html`;
const PASSAGE = "総理は会議に出ました。新しい計画を話しました。";

describe("who decides a lesson's source (local Supabase)", async () => {
  const demo = await signInAs("demo@pipo.local");
  const createdIds: string[] = [];

  const create = (text: string, newsUrl?: string) =>
    createLessonForLearner({
      userClient: demo.client,
      adminClient: admin,
      userId: demo.userId,
      title: "Source test",
      language: "ja",
      level: "N4",
      text,
      sentences: splitSentences(text, "ja"),
      ...(newsUrl ? { newsUrl } : {}),
    });

  const readLesson = async (id: string) => {
    const { data } = await admin
      .from("lessons")
      .select("user_id, source, source_name, source_url, source_license")
      .eq("id", id)
      .single();
    return data;
  };

  beforeAll(async () => {
    const { error } = await admin.from("news_rewrites").insert({
      source_url: NEWS_URL,
      level: "N4",
      prompt_version: PROMPT_VERSION,
      title: "会議",
      passage: PASSAGE,
    });
    if (error) throw error;
  });

  afterAll(async () => {
    if (createdIds.length > 0) await admin.from("lessons").delete().in("id", createdIds);
    await admin.from("news_rewrites").delete().eq("source_url", NEWS_URL);
  });

  it("an unchanged news rewrite becomes a news lesson with attribution", async () => {
    const id = await create(PASSAGE, NEWS_URL);
    createdIds.push(id);
    expect(await readLesson(id)).toEqual({
      user_id: demo.userId,
      source: "news",
      source_name: "首相官邸ホームページ",
      source_url: NEWS_URL,
      source_license: "PDL1.0",
    });
  });

  it("an edited news rewrite becomes a manual lesson that keeps its attribution", async () => {
    const id = await create(`${PASSAGE}はい。`, NEWS_URL);
    createdIds.push(id);
    expect(await readLesson(id)).toEqual({
      user_id: demo.userId,
      source: "manual",
      source_name: "首相官邸ホームページ",
      source_url: NEWS_URL,
      source_license: "PDL1.0",
    });
  });

  it("a news URL without a cached rewrite at that level is manual", async () => {
    const id = await createLessonForLearner({
      userClient: demo.client,
      adminClient: admin,
      userId: demo.userId,
      title: "Other level",
      language: "ja",
      level: "N3",
      text: PASSAGE,
      sentences: splitSentences(PASSAGE, "ja"),
      newsUrl: NEWS_URL,
    });
    createdIds.push(id);
    expect((await readLesson(id))?.source).toBe("manual");
  });

  it("a pasted passage without a news URL is manual without attribution", async () => {
    const id = await create("猫がいます。犬もいます。");
    createdIds.push(id);
    expect(await readLesson(id)).toMatchObject({ source: "manual", source_name: null });
  });

  it("an AI-generated lesson is created by the server as ai", async () => {
    const id = await createGeneratedLesson({
      adminClient: admin,
      userId: demo.userId,
      title: "AI",
      language: "ja",
      level: "N4",
      sentences: ["猫がいます。", "犬もいます。", "鳥もいます。"],
    });
    createdIds.push(id);
    expect(await readLesson(id)).toMatchObject({ user_id: demo.userId, source: "ai" });
  });

  it("the learner's own client cannot insert lessons or sentences directly", async () => {
    const lesson = await demo.client
      .from("lessons")
      .insert({ user_id: demo.userId, title: "Direct", language: "ja", level: "N5", source: "ai" });
    expect(lesson.error?.code).toBe("42501");
  });
});
