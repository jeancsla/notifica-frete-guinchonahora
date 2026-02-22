import { randomUUID } from "node:crypto";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

type Logger = {
  debug: (message: string, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
  error: (message: string, fields?: LogFields) => void;
  child: (fields: LogFields) => Logger;
};

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]{1,128}$/;
const SENSITIVE_KEY_PATTERN =
  /pass(word)?|secret|token|api[-_]?key|auth(entication|orization)?|cookie|session|credential|set-cookie|phone|msisdn|cpf|cnpj/i;
const requestIds = new WeakMap<Request, string>();

function getMinLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || "").toLowerCase().trim() as LogLevel;
  if (raw in LEVEL_PRIORITY) {
    return raw;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel) {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getMinLevel()];
}

function redactIfSensitive(key: string, value: unknown) {
  if (!SENSITIVE_KEY_PATTERN.test(key)) {
    return null;
  }

  if (value == null) {
    return value;
  }

  return "[REDACTED]";
}

function serializeError(value: Error) {
  const includeStack =
    process.env.LOG_INCLUDE_STACK === "true" ||
    process.env.NODE_ENV !== "production";

  return {
    name: value.name,
    message: value.message,
    stack: includeStack ? value.stack : undefined,
  };
}

function sanitizeValue(
  value: unknown,
  key = "",
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (depth > 8) {
    return "[MAX_DEPTH]";
  }

  const redacted = redactIfSensitive(key, value);
  if (redacted !== null) {
    return redacted;
  }

  if (
    value == null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, key, depth + 1, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[CIRCULAR]";
    }
    seen.add(value);

    const output: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      output[entryKey] = sanitizeValue(entryValue, entryKey, depth + 1, seen);
    }
    return output;
  }

  return String(value);
}

function writeLog(level: LogLevel, message: string, fields: LogFields) {
  if (!shouldLog(level)) {
    return;
  }

  const sanitizedFields = sanitizeValue(fields);
  const normalizedFields =
    sanitizedFields &&
    typeof sanitizedFields === "object" &&
    !Array.isArray(sanitizedFields)
      ? (sanitizedFields as Record<string, unknown>)
      : { context: sanitizedFields };

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...normalizedFields,
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

function createLogger(baseFields: LogFields = {}): Logger {
  const emit =
    (level: LogLevel) =>
    (message: string, fields: LogFields = {}) =>
      writeLog(level, message, { ...baseFields, ...fields });

  return {
    debug: emit("debug"),
    info: emit("info"),
    warn: emit("warn"),
    error: emit("error"),
    child(fields: LogFields) {
      return createLogger({ ...baseFields, ...fields });
    },
  };
}

export const logger = createLogger({
  service: "bun-api",
});

function getHeaderRequestId(request: Request) {
  const fromHeader = request.headers.get("x-request-id") || "";
  const candidate = fromHeader.trim();
  if (!candidate || !REQUEST_ID_PATTERN.test(candidate)) {
    return null;
  }
  return candidate;
}

export function getRequestId(request: Request) {
  const existing = requestIds.get(request);
  if (existing) {
    return existing;
  }

  const headerId = getHeaderRequestId(request);
  const generated = headerId || randomUUID();
  requestIds.set(request, generated);
  return generated;
}

export function attachRequestIdHeader(
  headers: Record<string, string | number> | undefined,
  request: Request,
) {
  if (!headers) {
    return;
  }
  headers["X-Request-Id"] = getRequestId(request);
}

export function createRequestLogger(request: Request) {
  let path = request.url;
  try {
    path = new URL(request.url).pathname;
  } catch {
    path = request.url;
  }

  return logger.child({
    request_id: getRequestId(request),
    method: request.method,
    path,
  });
}
