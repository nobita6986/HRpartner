/**
 * redirect-token.ts — hrp-v6-n2-aff-02-link-capture (N2-2, Decision A).
 *
 * HMAC-SHA256 signed, opaque token for the `hrp_aff` cookie.
 * Format:  base64url(attributionId) | base64url(expiryTs) | base64url(hmac)
 * where hmac = HMAC-SHA256(secret, attributionId || ':' || expiryTs || ':' || keyVersion)
 *
 * The raw `attributionId` is NEVER returned to the browser; the cookie is HttpOnly.
 * `keyVersion` enables future secret rotation without invalidating all cookies at once.
 *
 * Token expiry is signed inside the token (server-clock enforced), not just cookie Max-Age.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const ALGORITHM = 'sha256';
const SEPARATOR = '.';

interface TokenPayload {
  readonly attributionId: string;
  readonly expiresAt: number; // unix ms
  readonly keyVersion: number;
}

/* ─── Configuration ─────────────────────────────────────────────────────────── */

function getSigningSecret(): string {
  const secret = process.env.RATE_LIMIT_HASH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('TOKEN_SIGNING_ERROR: RATE_LIMIT_HASH_SECRET missing or too short');
  }
  return secret;
}

/** Current signing key version. Increment + rotate old secret in DB to invalidate old tokens. */
const CURRENT_KEY_VERSION = 1;

/** Token lifetime in milliseconds (30 days). Matches cookie Max-Age. */
export const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/* ─── Signing ─────────────────────────────────────────────────────────────── */

/**
 * Create a signed token for the given attribution.  Never expose `attributionId`
 * in plain text — it is base64-encoded before the separator.
 */
export function createAttributionToken(attributionId: string, expiresAtMs: number): string {
  const secret = getSigningSecret();
  const payload = `${toBase64Url(attributionId)}${SEPARATOR}${toBase64Url(String(expiresAtMs))}${SEPARATOR}${toBase64Url(String(CURRENT_KEY_VERSION))}`;
  const sig = createHmac(ALGORITHM, secret).update(payload).digest('base64url');
  return `${payload}${SEPARATOR}${sig}`;
}

/* ─── Verification ───────────────────────────────────────────────────────── */

/**
 * Verify a token and return the payload if valid, or null if tampered / expired.
 * Uses `timingSafeEqual` for the signature check to prevent timing attacks.
 *
 * NOTE: verification checks expiry (server clock), key version, and HMAC integrity.
 * It does NOT check if the referenced `attributionId` still exists in the DB —
 * that check is the caller's responsibility (DEC-B §2).
 */
export function verifyAttributionToken(
  token: string,
): { attributionId: string; expiresAt: number; keyVersion: number } | null {
  const parts = token.split(SEPARATOR);
  if (parts.length !== 4) return null;

  const [encId, encExpiry, encVersion, receivedSig] = parts;

  // 1. Reject expired tokens (server-clock enforcement).
  const expiresAtMs = Number.parseInt(fromBase64Url(encExpiry), 10);
  if (Number.isNaN(expiresAtMs) || Date.now() > expiresAtMs) return null;

  // 2. Reject unknown key versions.
  const keyVersion = Number.parseInt(fromBase64Url(encVersion), 10);
  if (Number.isNaN(keyVersion) || keyVersion > CURRENT_KEY_VERSION) return null;

  // 3. Reconstruct payload and verify HMAC.
  const payload = `${encId}${SEPARATOR}${encExpiry}${SEPARATOR}${encVersion}`;
  const secret = getSigningSecret();
  const expectedSig = createHmac(ALGORITHM, secret).update(payload).digest('base64url');

  let expectedBuf: Buffer;
  let receivedBuf: Buffer;
  try {
    expectedBuf = Buffer.from(expectedSig, 'utf8');
    receivedBuf = Buffer.from(receivedSig, 'utf8');
  } catch {
    return null;
  }

  if (expectedBuf.length !== receivedBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, receivedBuf)) return null;

  const attributionId = fromBase64Url(encId);
  if (!attributionId) return null;

  return { attributionId, expiresAt: expiresAtMs, keyVersion };
}

/* ─── Base64url utilities ──────────────────────────────────────────────────── */

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function fromBase64Url(input: string): string {
  try {
    return Buffer.from(input, 'base64url').toString('utf8');
  } catch {
    return '';
  }
}
