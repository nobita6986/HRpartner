/**
 * Correlation ID utility — V5-OPS-04a STEP-01 (RQ-01, DEC-01).
 *
 * Canonical header: `x-request-id`.
 * Validation: 8–128 chars, match [A-Za-z0-9._:-]+.
 * Malformed/missing/empty → generate crypto.randomUUID().
 * No throw on invalid input; never echo attacker-controlled value verbatim.
 *
 * DEC-07: No AsyncLocalStorage — context passes via explicit header/parameter.
 */

const HEADER = 'x-request-id';
const MIN_LEN = 8;
const MAX_LEN = 128;
const VALID_PATTERN = /^[A-Za-z0-9._:-]+$/;

/** Validate an inbound ID string. Returns null if invalid (too short/long or wrong chars). */
function validateId(id: string): string | null {
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  if (trimmed.length < MIN_LEN || trimmed.length > MAX_LEN) return null;
  if (!VALID_PATTERN.test(trimmed)) return null;
  return trimmed;
}

/**
 * Extract a correlation ID from inbound request headers.
 * Reuses inbound value if valid; otherwise generates a new UUID.
 */
export function getCorrelationId(headers: Headers): string {
  const inbound = headers.get(HEADER);
  const validated = validateId(inbound ?? '');
  return validated ?? generateId();
}

/**
 * Generate a new correlation ID using Web Crypto.
 * Uses `crypto.randomUUID()` (Node 14.17+, all modern browsers).
 */
export function generateId(): string {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Fallback for environments without randomUUID (rare; ensures deterministic testability)
  // format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (v4-like)
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4'; // version 4
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 8]; // variant
    } else {
      uuid += hex[(Math.random() * 16) | 0];
    }
  }
  return uuid;
}

/**
 * Build response headers with canonical `x-request-id`.
 * Returns a new Headers instance (original unchanged).
 */
export function buildCorrelationHeaders(id: string, existing?: Headers): Headers {
  const out = new Headers(existing);
  out.set(HEADER, id);
  return out;
}

export { HEADER as CORRELATION_HEADER };
