/**
 * redirect-token.test.ts — hrp-v6-n2-aff-02-link-capture (N2-2).
 *
 * Unit tests for HMAC signing and verification.
 * No live DB / crypto dependency — only pure Node.js built-ins.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/src/shared/security/rate-limit-port', () => ({
  RATE_LIMIT_RULES: {},
}));

import {
  createAttributionToken,
  verifyAttributionToken,
  TOKEN_TTL_MS,
} from './redirect-token';

const REAL_SECRET = 'A'.repeat(32); // ≥32 chars, valid for testing

beforeEach(() => {
  // Inject a known secret so tests are deterministic.
  vi.stubEnv('RATE_LIMIT_HASH_SECRET', REAL_SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('createAttributionToken', () => {
  it('produces a 4-part dot-separated string', () => {
    const token = createAttributionToken('test-id', Date.now() + TOKEN_TTL_MS);
    expect(token.split('.')).toHaveLength(4);
  });

  it('produces unique tokens for different ids (base64url encoding)', () => {
    const t1 = createAttributionToken('id-a', Date.now() + TOKEN_TTL_MS);
    const t2 = createAttributionToken('id-b', Date.now() + TOKEN_TTL_MS);
    expect(t1).not.toBe(t2);
  });

  it('produces unique tokens for different expiry timestamps', () => {
    const now = Date.now();
    const t1 = createAttributionToken('same-id', now + 1000);
    const t2 = createAttributionToken('same-id', now + 2000);
    expect(t1).not.toBe(t2);
  });
});

describe('verifyAttributionToken', () => {
  it('accepts a freshly created valid token', () => {
    const attrId = 'attr-uuid-123';
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const token = createAttributionToken(attrId, expiresAt);

    const result = verifyAttributionToken(token);

    expect(result).not.toBeNull();
    expect(result!.attributionId).toBe(attrId);
    expect(result!.expiresAt).toBe(expiresAt);
    expect(result!.keyVersion).toBe(1);
  });

  it('rejects a tampered token (third party changes attributionId)', () => {
    const token = createAttributionToken('original-id', Date.now() + TOKEN_TTL_MS);
    const parts = token.split('.');
    // Flip a bit in the base64url id portion.
    const tamperedId = parts[0] + 'X'; // base64url doesn't have 'X' as a valid char
    const tampered = [tamperedId, parts[1], parts[2], parts[3]].join('.');

    expect(verifyAttributionToken(tampered)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = createAttributionToken('any-id', Date.now() - 1000); // expired 1s ago

    expect(verifyAttributionToken(token)).toBeNull();
  });

  it('rejects a malformed token (wrong number of parts)', () => {
    expect(verifyAttributionToken('a.b.c')).toBeNull();
    expect(verifyAttributionToken('a')).toBeNull();
    expect(verifyAttributionToken('')).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    // Sign with one secret.
    const token = createAttributionToken('any-id', Date.now() + TOKEN_TTL_MS);

    // Change the secret and verify.
    vi.stubEnv('RATE_LIMIT_HASH_SECRET', 'B'.repeat(32));
    expect(verifyAttributionToken(token)).toBeNull();
  });

  it('rejects a token with future key version', () => {
    // Manually construct a token with keyVersion=2.
    const id = 'test-id';
    const expiry = Date.now() + TOKEN_TTL_MS;
    const { createHmac } = require('node:crypto');
    const toBase64Url = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
    const fromBase64Url = (s: string) => Buffer.from(s, 'base64url').toString('utf8');

    const encId = toBase64Url(id);
    const encExpiry = toBase64Url(String(expiry));
    const encVersion = toBase64Url('2'); // FUTURE version
    const payload = `${encId}.${encExpiry}.${encVersion}`;
    const sig = createHmac('sha256', REAL_SECRET).update(payload).digest('base64url');
    const token = `${payload}.${sig}`;

    expect(verifyAttributionToken(token)).toBeNull();
  });

  it('rejects non-base64url garbage in place of id', () => {
    const validToken = createAttributionToken('id', Date.now() + TOKEN_TTL_MS);
    const parts = validToken.split('.');
    const tampered = ['!!!invalid!!!', parts[1], parts[2], parts[3]].join('.');

    expect(verifyAttributionToken(tampered)).toBeNull();
  });
});

describe('TOKEN_TTL_MS', () => {
  it('is exactly 30 days in milliseconds', () => {
    expect(TOKEN_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
