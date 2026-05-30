const SENSITIVE_KEY_PATTERN =
  /api[_-]?key|token|secret|password|authorization|cookie|set-cookie|headersjson|envjson|serviceaccount|private[_-]?key|client[_-]?secret/i;

const MAX_STRING_LENGTH = 2_000;
const MAX_DEPTH = 8;

function redactString(value: string): string {
  if (value.length > MAX_STRING_LENGTH) {
    return `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]`;
  }
  return value;
}

export function redactSensitiveData(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) {
    return "[Max depth exceeded]";
  }

  if (typeof value === "string") {
    return redactString(value);
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: value.stack ? redactString(value.stack) : undefined,
      cause: redactSensitiveData(
        (value as Error & { cause?: unknown }).cause,
        depth + 1,
      ),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = redactSensitiveData(nestedValue, depth + 1);
    }
  }
  return result;
}

export function safeJsonForLog(value: unknown): string {
  try {
    return JSON.stringify(redactSensitiveData(value));
  } catch {
    return "[Unserializable value]";
  }
}

function getNestedString(value: unknown, path: string[]): string | undefined {
  let current = value;
  for (const key of path) {
    if (typeof current !== "object" || current === null || !(key in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
}

function getNestedNumber(value: unknown, path: string[]): number | undefined {
  let current = value;
  for (const key of path) {
    if (typeof current !== "object" || current === null || !(key in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "number" ? current : undefined;
}

export function sanitizeProviderErrorMessage(error: unknown): string {
  const status =
    getNestedNumber(error, ["statusCode"]) ??
    getNestedNumber(error, ["status"]) ??
    getNestedNumber(error, ["error", "statusCode"]) ??
    getNestedNumber(error, ["error", "status"]);

  const code =
    getNestedString(error, ["code"]) ??
    getNestedString(error, ["error", "code"]);

  const rawMessage =
    getNestedString(error, ["error", "message"]) ??
    getNestedString(error, ["message"]) ??
    (error instanceof Error ? error.message : undefined) ??
    "The provider returned an unexpected error.";

  const normalized =
    `${status ?? ""} ${code ?? ""} ${rawMessage}`.toLowerCase();

  if (status === 401 || status === 403 || normalized.includes("auth")) {
    return "Authentication failed. Check the selected provider's API key and account permissions.";
  }

  if (
    status === 429 ||
    normalized.includes("rate_limit") ||
    normalized.includes("rate limit")
  ) {
    return "The provider rate limit was reached. Please wait and try again, or choose another model.";
  }

  if (
    normalized.includes("context") &&
    (normalized.includes("length") ||
      normalized.includes("window") ||
      normalized.includes("token"))
  ) {
    return "The request exceeded the model context window. Reduce the prompt or enable context compaction.";
  }

  if (status && status >= 500) {
    return "The provider is temporarily unavailable. Please try again shortly.";
  }

  return redactString(rawMessage);
}
