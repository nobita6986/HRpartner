/**
 * Structured safe logger — V5-OPS-04a STEP-03 (RQ-03/04, DEC-03/04/05).
 *
 * Output: one-line JSON with stable schema `{schemaVersion, timestamp, level, event, requestId, meta}`.
 * Metadata: flat typed allow-list only. Recursive sanitizer catches nested PII/secret patterns.
 * Injectable sink: default to `console.error` for `error`, `console.warn` for `warn`,
 *   `console.info` for `info`/`debug` in dev; no-op in production unless sink is injected.
 *
 * DEC-04: Never log raw Request/Response/body/query/headers/cookies/authorization.
 * DEC-05: Typed allow-list metadata + defense-in-depth sanitizer.
 * DEC-07: No AsyncLocalStorage — requestId passed explicitly.
 * PLN-03: Public API typed as SafeMeta (flat). Runtime rejects nested objects/arrays.
 */

// ─── Schema ───────────────────────────────────────────────────────────────────

export const LOG_SCHEMA_VERSION = '1.0';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  schemaVersion: typeof LOG_SCHEMA_VERSION;
  timestamp: string; // ISO-8601
  level: LogLevel;
  event: string;
  requestId: string | null;
  meta: SafeMeta;
}

export interface SafeMeta {
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  actorRole?: string;
  resourceType?: string;
  outcome?: string;
  jobName?: string;
  attempt?: number;
  count?: number;
  phase?: string;
  detail?: string | object;
  errorCode?: string;
}

// ─── Redaction patterns (case-insensitive key + value patterns) ────────────────

const SECRET_KEY_RE = /^(authorization|bearer|token|secret|api[_-]?key|password|passwd|pwd|credential|access[_-]?token|refresh[_-]?token|cookie|session[_-]?id|ssn|cc|credit[_-]?card|card[_-]?number|cvv|cvc)$/i;
const SENSITIVE_VALUE_RE = /^(bearer\s+|token[:=]\s*)?[\w.+-]{20,}$/;
const PII_KEY_RE = /^(cccd|cmnd|passport|phone|email|address|date[_-]of[_-]birth|birth[_-]date|bank[_-]?account|account[_-]?number|iban|swift)$/i;
// Nested secret keys (dot-notation paths like "headers.authorization.value")
const NESTED_SECRET_RE = /\.((authorization|bearer|token|secret|api[_-]?key|password|cookie|session))$/i;
// Long base64-looking strings that might be credentials
const BASE64_CRED_RE = /^[A-Za-z0-9+/]{60,}={0,2}$/;
// Vietnamese national ID pattern
const CCCD_RE = /^\d{9}$|^\d{12}$/;
// Phone number patterns (VN mobile)
const PHONE_RE = /^(\+84|0)\d{9}$/;

function isSecretKey(key: string): boolean {
  return SECRET_KEY_RE.test(key) || PII_KEY_RE.test(key);
}

function isSensitiveValue(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  if (SENSITIVE_VALUE_RE.test(val)) return true;
  if (BASE64_CRED_RE.test(val)) return true;
  if (CCCD_RE.test(val)) return true;
  if (PHONE_RE.test(val)) return true;
  return false;
}

function isSecretPath(path: string): boolean {
  return NESTED_SECRET_RE.test(path);
}

// ─── Recursive sanitizer ──────────────────────────────────────────────────────

const REDACTED = '[REDACTED]';

/** Package-private: used by logger.ts and error-reporter.ts to sanitize meta. */
export function sanitizeValue(val: unknown, _key: string, _path: string): unknown {
  if (typeof val === 'string') {
    if (isSensitiveValue(val)) return REDACTED;
    return val;
  }
  if (typeof val === 'number' || typeof val === 'boolean') return val;
  if (val === null || val === undefined) return val;
  return val; // objects/arrays passed to sanitizeObject
}

/** Recursively sanitize an object. Exported for reuse by error-reporter.ts (PLN-02). */
export function sanitizeObject(obj: unknown, path = '', seen = new Set<unknown>()): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return sanitizeValue(obj, '', path);

  if (seen.has(obj)) return '[CYCLIC]'; // prevent infinite recursion
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item, i) => sanitizeObject(item, `${path}[${i}]`, seen));
  }

  // TOP LEVEL: only apply allow-list stripping here (keeps numeric keys like count/durationMs).
  // NESTED LEVELS: strip only secret/PII keys (nested unknown keys are allowed).
  const isTopLevel = path === '';
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const keyPath = path ? `${path}.${key}` : key;

    if (isSecretKey(key)) {
      result[key] = REDACTED;
      continue;
    }

    if (isSecretPath(keyPath)) {
      result[key] = REDACTED;
      continue;
    }

    // At top-level, drop unknown (non-allow-listed) keys.
    // At nested levels, preserve all keys.
    if (isTopLevel && !ALLOWED_META_KEYS.has(key as keyof SafeMeta)) {
      continue;
    }

    result[key] = sanitizeObject(val, keyPath, seen);
  }
  return result;
}

// ─── Metadata validation ──────────────────────────────────────────────────────

const ALLOWED_META_KEYS = new Set<keyof SafeMeta>([
  'route', 'method', 'status', 'durationMs', 'actorRole',
  'resourceType', 'outcome', 'jobName', 'attempt', 'count',
  'phase', 'detail', 'errorCode',
]);

function toSafeMeta(input: unknown): SafeMeta {
  if (!input || typeof input !== 'object') return {};
  const meta: SafeMeta = {};
  const raw = input as Record<string, unknown>;
  for (const [key, val] of Object.entries(raw)) {
    // Preserve redacted sentinel values even if the key is not in allow-list.
    if (val === REDACTED) {
      (meta as Record<string, unknown>)[key] = REDACTED;
      continue;
    }
    if (!ALLOWED_META_KEYS.has(key as keyof SafeMeta)) continue;

    // Numeric keys: must be number (no nested objects)
    if (key === 'status' || key === 'durationMs' || key === 'attempt' || key === 'count') {
      if (typeof val !== 'number') continue;
      (meta as Record<string, unknown>)[key] = val;
      continue;
    }

    // 'detail' is the designated overflow container (DEC-03): may hold nested objects/arrays
    // where callers need to bundle structured context. All other string keys are flat strings.
    if (key === 'detail') {
      if (typeof val === 'object' && val !== null) {
        (meta as Record<string, unknown>)[key] = val;
      } else if (typeof val === 'string') {
        (meta as Record<string, unknown>)[key] = val;
      }
      continue;
    }

    // All other string keys: must be primitive string (PLN-03 — rejects nested objects)
    if (typeof val === 'string') {
      (meta as Record<string, unknown>)[key] = val;
    }
    // non-string values for declared string keys are silently rejected
  }
  return meta;
}

// ─── Sink ─────────────────────────────────────────────────────────────────────

export type LogSink = (entry: LogEntry) => void;

function defaultSink(entry: LogEntry): void {
  const json = JSON.stringify(entry);
  if (entry.level === 'error') {
    console.error(json);
  } else if (entry.level === 'warn') {
    console.warn(json);
  } else {
    console.info(json);
  }
}

let _sink: LogSink = defaultSink;

/**
 * Inject a custom log sink (useful for tests).
 * Call with `null` or no argument to reset to default.
 */
export function setSink(sink: LogSink | null): void {
  _sink = sink ?? defaultSink;
}

// ─── Core logger ───────────────────────────────────────────────────────────────

function makeEntry(
  level: LogLevel,
  event: string,
  requestId: string | null,
  meta: SafeMeta,
): LogEntry {
  return {
    schemaVersion: LOG_SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    level,
    event,
    requestId,
    meta,
  };
}

function log(level: LogLevel, event: string, requestId: string | null, meta: unknown): void {
  const safeMeta = toSafeMeta(sanitizeObject(meta));
  const entry = makeEntry(level, event, requestId, safeMeta);
  _sink(entry);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Log a debug event with optional requestId and typed metadata.
 * Meta must use allow-listed keys; nested objects are rejected (flat SafeMeta contract).
 */
export function debug(event: string, requestId: string | null, meta?: SafeMeta): void {
  log('debug', event, requestId, meta ?? {});
}

/**
 * Log an info event with typed metadata.
 */
export function info(event: string, requestId: string | null, meta?: SafeMeta): void {
  log('info', event, requestId, meta ?? {});
}

/**
 * Log a warning with typed metadata.
 */
export function warn(event: string, requestId: string | null, meta?: SafeMeta): void {
  log('warn', event, requestId, meta ?? {});
}

/**
 * Log an error. This does NOT replace a proper error-reporter call.
 * Use this for operational logging; error-reporter.ts handles upstream reporting.
 */
export function error(event: string, requestId: string | null, meta?: SafeMeta): void {
  log('error', event, requestId, meta ?? {});
}

// ─── Internal test helpers ────────────────────────────────────────────────────

/** Used by unit tests only. Captures entries for snapshot assertions. */
export function __captureSink(): { entries: LogEntry[] } {
  const captured: LogEntry[] = [];
  setSink((entry: LogEntry) => captured.push(entry));
  return { entries: captured };
}

/** Reset sink to default. Used by unit tests for cleanup. */
export function __resetSink(): void {
  setSink(null);
}
