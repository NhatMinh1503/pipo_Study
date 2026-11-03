import { describe, expect, it } from "vitest";

import type { LogLevel } from "./logger";
import { createLogger } from "./logger";

function setup(level: LogLevel = "debug") {
  const lines: Array<Record<string, unknown>> = [];
  const logger = createLogger({
    level,
    write: (line) => lines.push(JSON.parse(line) as Record<string, unknown>),
    now: () => new Date("2026-11-02T00:00:00.000Z"),
  });
  return { logger, lines };
}

describe("createLogger", () => {
  it("writes one JSON entry with level, message, time and fields", () => {
    const { logger, lines } = setup();

    logger.info("lesson created", { route: "/api/lessons", latencyMs: 42 });

    expect(lines).toEqual([
      {
        route: "/api/lessons",
        latencyMs: 42,
        time: "2026-11-02T00:00:00.000Z",
        level: "info",
        msg: "lesson created",
      },
    ]);
  });

  it("skips entries below the configured level", () => {
    const { logger, lines } = setup("warn");

    logger.debug("debug");
    logger.info("info");
    logger.warn("warn");
    logger.error("error");

    expect(lines.map((line) => line.level)).toEqual(["warn", "error"]);
  });

  it("redacts secrets, PII and learning content at any depth", () => {
    const { logger, lines } = setup();

    logger.info("gemini call", {
      apiKey: "AIza-secret",
      user: { email: "minh@example.com", id: "u1" },
      payload: { userTranslation: "Tôi đi học", sentences: [{ source: "学校に行く" }] },
      model: "flash",
    });

    expect(lines[0]).toMatchObject({
      apiKey: "[redacted]",
      user: { email: "[redacted]", id: "u1" },
      payload: { userTranslation: "[redacted]", sentences: [{ source: "[redacted]" }] },
      model: "flash",
    });
  });

  it("matches sensitive keys regardless of case and separators", () => {
    const { logger, lines } = setup();

    logger.info("request", { API_KEY: "a", "refresh-token": "b", Authorization: "c" });

    expect(lines[0]).toMatchObject({
      API_KEY: "[redacted]",
      "refresh-token": "[redacted]",
      Authorization: "[redacted]",
    });
  });

  it("serializes Error objects instead of logging an empty object", () => {
    const { logger, lines } = setup();

    logger.error("failed", { err: new Error("timeout") });

    expect(lines[0]?.err).toMatchObject({ name: "Error", message: "timeout" });
  });

  it("child loggers carry their base fields and allow overrides", () => {
    const { logger, lines } = setup();
    const requestLogger = logger.child({ requestId: "r1", route: "/a" });

    requestLogger.info("done", { route: "/b" });

    expect(lines[0]).toMatchObject({ requestId: "r1", route: "/b", msg: "done" });
  });

  it("does not let fields override reserved keys", () => {
    const { logger, lines } = setup();

    logger.info("real message", { level: "fake", msg: "fake", time: "fake" });

    expect(lines[0]).toMatchObject({ level: "info", msg: "real message" });
    expect(lines[0]?.time).toBe("2026-11-02T00:00:00.000Z");
  });
});
