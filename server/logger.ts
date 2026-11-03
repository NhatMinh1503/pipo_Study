import "server-only";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  /** Returns a logger that adds `fields` to every entry (e.g. requestId, route). */
  child(fields: LogFields): Logger;
}

interface LoggerOptions {
  level?: LogLevel;
  baseFields?: LogFields;
  /** Where each JSON line goes. Injected in tests; defaults to stdout/stderr. */
  write?: (line: string, level: LogLevel) => void;
  now?: () => Date;
}

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

// Keys whose values must never reach logs: secrets, PII, and user-written learning content
const REDACTED_KEYS = new Set([
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "authorization",
  "cookie",
  "secret",
  "email",
  "usertranslation",
  "translation",
  "source",
  "text",
  "content",
]);

const REDACTED = "[redacted]";

function normalizeKey(key: string): string {
  return key.replace(/[_-]/g, "").toLowerCase();
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || typeof value !== "object") return value;

  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }

  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [
      key,
      REDACTED_KEYS.has(normalizeKey(key)) ? REDACTED : redact(inner, depth + 1),
    ]),
  );
}

function defaultWrite(line: string, level: LogLevel) {
  const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}

function parseLevel(value: string | undefined): LogLevel {
  return value === "debug" || value === "warn" || value === "error" ? value : "info";
}

/**
 * Creates a structured logger that writes one JSON object per line.
 * Sensitive keys are redacted recursively so callers cannot leak them by accident.
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const level = options.level ?? "info";
  const baseFields = options.baseFields ?? {};
  const write = options.write ?? defaultWrite;
  const now = options.now ?? (() => new Date());

  const log = (entryLevel: LogLevel, message: string, fields: LogFields = {}) => {
    if (LEVEL_RANK[entryLevel] < LEVEL_RANK[level]) return;

    const entry = {
      ...(redact({ ...baseFields, ...fields }) as LogFields),
      time: now().toISOString(),
      level: entryLevel,
      msg: message,
    };
    write(JSON.stringify(entry), entryLevel);
  };

  return {
    debug: (message, fields) => log("debug", message, fields),
    info: (message, fields) => log("info", message, fields),
    warn: (message, fields) => log("warn", message, fields),
    error: (message, fields) => log("error", message, fields),
    child: (fields) => createLogger({ ...options, baseFields: { ...baseFields, ...fields } }),
  };
}

export const logger = createLogger({ level: parseLevel(process.env.LOG_LEVEL) });
