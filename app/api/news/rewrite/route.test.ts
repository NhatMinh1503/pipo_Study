import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AiError } from "@/server/gemini";

const mocks = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  cached: null as { title: string; passage: string } | null,
  allowed: true,
  rewrite: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/server/auth", () => ({ getSessionUser: async () => mocks.user }));
vi.mock("@/server/profile", () => ({ getCurrentProfile: async () => ({ level: "N4" }) }));
vi.mock("@/server/env", () => ({ getServerEnv: () => ({ AI_DAILY_LIMIT: 10 }) }));
vi.mock("@/server/queries/open-news", () => ({
  getOpenArticle: async () => ({
    title: "防災士の表敬",
    text: "高市総理は、総理大臣官邸で防災士アンバサダーの野口絵子氏による表敬を受けました。",
  }),
}));
vi.mock("@/server/ai/news-rewriter", () => ({
  getNewsRewriter: () => Object.assign(mocks.rewrite, { cacheable: true }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: async () => ({ data: mocks.allowed, error: null }) }),
}));
vi.mock("@/server/supabase-admin", () => {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: mocks.cached }),
    upsert: mocks.upsert,
  };
  return { createAdminClient: () => ({ from: () => query }) };
});

const { POST } = await import("./route");

const URL_OK = "https://www.kantei.go.jp/jp/105/actions/202611/02hyoukei.html";
const call = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/news/rewrite", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
const ORIGINAL_DRAFT = {
  title: "総理と防災",
  sentences: ["総理は野口さんに会いました。", "防災の話をしました。", "大切な話でした。"],
};

describe("POST /api/news/rewrite", () => {
  beforeEach(() => {
    mocks.user = { id: "user-1" };
    mocks.cached = null;
    mocks.allowed = true;
    mocks.rewrite.mockReset().mockResolvedValue(ORIGINAL_DRAFT);
    mocks.upsert.mockReset().mockResolvedValue({ error: null });
  });

  it("401 when signed out", async () => {
    mocks.user = null;
    expect((await call({ url: URL_OK })).status).toBe(401);
  });

  it.each([{}, { url: "nope" }, { url: "https://www3.nhk.or.jp/news/x.html" }])(
    "400 for %j (only allow-listed sources)",
    async (body) => {
      expect((await call(body)).status).toBe(400);
    },
  );

  it("rewrites at the learner's level, stores it, and returns the attribution", async () => {
    const response = await call({ url: URL_OK });
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.passage).toBe("総理は野口さんに会いました。防災の話をしました。大切な話でした。");
    expect(json.source.attribution).toContain("加工して作成");
    expect(mocks.rewrite).toHaveBeenCalledWith(
      expect.objectContaining({ level: "N4", language: "ja" }),
    );
    expect(mocks.upsert).toHaveBeenCalledOnce();
  });

  it("serves the shared cache without calling the AI", async () => {
    mocks.cached = { title: "キャッシュ", passage: "一。二。三。" };
    const json = await (await call({ url: URL_OK })).json();
    expect(json.title).toBe("キャッシュ");
    expect(mocks.rewrite).not.toHaveBeenCalled();
  });

  it("429 when the daily AI quota is used up", async () => {
    mocks.allowed = false;
    expect((await call({ url: URL_OK })).status).toBe(429);
  });

  it("asks again when a draft copies the source, and gives up after a second copy", async () => {
    const copied = {
      title: "t",
      sentences: [
        "総理大臣官邸で防災士アンバサダーの野口絵子氏による表敬を受けました。",
        "二。",
        "三。",
      ],
    };
    mocks.rewrite.mockResolvedValueOnce(copied).mockResolvedValueOnce(ORIGINAL_DRAFT);
    expect((await call({ url: URL_OK })).status).toBe(200);
    expect(mocks.rewrite).toHaveBeenLastCalledWith(expect.objectContaining({ tooClose: true }));

    mocks.rewrite.mockReset().mockResolvedValue(copied);
    expect((await call({ url: URL_OK })).status).toBe(502);
    expect(mocks.upsert).toHaveBeenCalledOnce();
  });

  it("503 when the AI is unavailable", async () => {
    mocks.rewrite.mockRejectedValue(new AiError("AI_UNAVAILABLE", "down"));
    expect((await call({ url: URL_OK })).status).toBe(503);
  });
});
