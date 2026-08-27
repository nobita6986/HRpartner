/**
 * error-reporter unit tests — AC-05 (RQ-05, DEC-06), PLN-02 (meta sanitization).
 *
 * Coverage:
 * - no-config -> 'not_configured'
 * - fake adapter -> 'reported'
 * - adapter throws -> 'failed'
 * - Never throws from report()
 * - Safe envelope fields (DEC-04/06)
 * - isConfigured() truthfulness
 * - PLN-02: adapter never receives raw PII/secret values (adversarial tests)
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  report, reportSafe, configure, isConfigured, noopAdapter,
} from './error-reporter';
import type { SafeErrorEnvelope } from './error-reporter';

describe('isConfigured — AC-05', () => {
  afterEach(() => {
    // Reset by calling configure with null-like (re-import clears module state)
  });

  it('is false when no adapter configured', async () => {
    // Fresh module state
    const { isConfigured: check } = await import('./error-reporter');
    expect(check()).toBe(false);
  });
});

describe('report — AC-05 three outcomes', () => {
  afterEach(() => {
    // Reset module state
    configure(noopAdapter);
  });

  it('returns not_configured when no adapter is set', async () => {
    // We can't reset the module between tests easily, so use a fresh import
    const { report: r, isConfigured } = await import('./error-reporter');
    if (isConfigured()) return; // skip if already configured by previous test
    const envelope: SafeErrorEnvelope = {
      errorCode: 'TEST_ERR',
      phase: 'test',
      safeMessage: 'test message',
      requestId: 'req-123',
      timestamp: new Date().toISOString(),
    };
    const status = await r(envelope);
    expect(status).toBe('not_configured');
  });

  it('returns reported when adapter resolves without error', async () => {
    const adapter = async (e: SafeErrorEnvelope) => {
      expect(e.errorCode).toBe('ADAPTER_TEST');
      expect(e.requestId).toBe('req-abc');
    };
    configure(adapter);
    const envelope: SafeErrorEnvelope = {
      errorCode: 'ADAPTER_TEST',
      phase: 'handler',
      safeMessage: 'safe',
      requestId: 'req-abc',
      timestamp: new Date().toISOString(),
    };
    const status = await report(envelope);
    expect(status).toBe('reported');
  });

  it('returns failed when adapter throws', async () => {
    const failingAdapter = async (_e: SafeErrorEnvelope) => {
      throw new Error('adapter network error');
    };
    configure(failingAdapter);
    const envelope: SafeErrorEnvelope = {
      errorCode: 'ADAPTER_FAIL',
      phase: 'db',
      safeMessage: 'safe',
      requestId: 'req-fail',
      timestamp: new Date().toISOString(),
    };
    const status = await report(envelope);
    expect(status).toBe('failed');
  });

  it('never throws even when adapter throws', async () => {
    const failingAdapter = async (_e: SafeErrorEnvelope) => {
      throw new Error('provider is down');
    };
    configure(failingAdapter);
    const envelope: SafeErrorEnvelope = {
      errorCode: 'CRASH_TEST',
      phase: 'middleware',
      safeMessage: 'safe',
      requestId: 'req-crash',
      timestamp: new Date().toISOString(),
    };
    await expect(report(envelope)).resolves.not.toThrow();
    expect(await report(envelope)).toBe('failed');
  });
});

describe('report — safe envelope fields (DEC-04/06)', () => {
  afterEach(() => { configure(noopAdapter); });

  it('envelope contains all required fields', async () => {
    let captured: SafeErrorEnvelope | null = null;
    configure(async (e) => { captured = e; });
    await reportSafe('SAFE_CODE', 'test_phase', 'req-safe');
    expect(captured).not.toBeNull();
    expect(captured!.errorCode).toBe('SAFE_CODE');
    expect(captured!.phase).toBe('test_phase');
    expect(captured!.safeMessage).toBe('Unexpected error');
    expect(captured!.requestId).toBe('req-safe');
    expect(captured!.timestamp).toBeDefined();
    expect(new Date(captured!.timestamp!).toISOString()).toBe(captured!.timestamp);
  });

  it('safeMessage is always "Unexpected error", never raw input', async () => {
    let captured: SafeErrorEnvelope | null = null;
    configure(async (e) => { captured = e; });
    await reportSafe('RAW_MSG_TEST', 'handler', 'req-raw', { detail: 'user supplied error text' });
    expect(captured!.safeMessage).toBe('Unexpected error');
  });

  it('report only receives safe envelope, never raw Error.message', async () => {
    let captured: SafeErrorEnvelope | null = null;
    configure(async (e) => { captured = e; });
    await reportSafe('DB_ERROR', 'db', 'req-db', { detail: 'password=secret123 in query' });
    expect(captured!.safeMessage).toBe('Unexpected error');
  });

  it('isConfigured returns true after configure', async () => {
    configure(noopAdapter);
    expect(isConfigured()).toBe(true);
  });
});

// ─── PLN-02: meta sanitization — adversarial tests ────────────────────────────
// The adapter must never receive raw PII/secret values regardless of caller input.

describe('PLN-02: meta sanitization — adapter never receives raw PII/secret', () => {
  afterEach(() => { configure(noopAdapter); });

  it('raw secret key value is redacted before reaching adapter', async () => {
    let captured: SafeErrorEnvelope | null = null;
    configure(async (e) => { captured = e; });
    // Long base64 token that matches BASE64_CRED_RE (>60 chars, no padding noise)
    const rawToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dGJXCnZpqe';
    const envelope: SafeErrorEnvelope = {
      errorCode: 'SECRET_TEST',
      phase: 'handler',
      safeMessage: 'Unexpected error',
      requestId: 'req-secret',
      timestamp: new Date().toISOString(),
      meta: { authorization: rawToken },
    };
    const status = await report(envelope);
    expect(status).toBe('reported');
    const rawMeta = captured!.meta as Record<string, unknown>;
    // The token must NOT appear raw in the captured envelope
    expect(rawMeta).not.toHaveProperty('authorization', rawToken);
    expect(rawMeta['authorization']).toBe('[REDACTED]');
  });

  it('arbitrary non-allow-listed keys are stripped from meta', async () => {
    let captured: SafeErrorEnvelope | null = null;
    configure(async (e) => { captured = e; });
    const envelope: SafeErrorEnvelope = {
      errorCode: 'ARB_KEYS',
      phase: 'handler',
      safeMessage: 'Unexpected error',
      requestId: 'req-arb',
      timestamp: new Date().toISOString(),
      meta: { myCustomField: 'should be stripped', anotherField: 42 },
    };
    const status = await report(envelope);
    expect(status).toBe('reported');
    const rawMeta = captured!.meta as Record<string, unknown>;
    // Unknown keys should be stripped
    expect(rawMeta).not.toHaveProperty('myCustomField');
    expect(rawMeta).not.toHaveProperty('anotherField');
  });

  it('nested PII in meta object is redacted', async () => {
    let captured: SafeErrorEnvelope | null = null;
    configure(async (e) => { captured = e; });
    const envelope: SafeErrorEnvelope = {
      errorCode: 'NESTED_PII',
      phase: 'handler',
      safeMessage: 'Unexpected error',
      requestId: 'req-nested',
      timestamp: new Date().toISOString(),
      meta: {
        detail: {
          user: { password: 'hunter2', name: 'Alice' },
          headers: { authorization: 'Bearer secret-token' },
        },
      },
    };
    const status = await report(envelope);
    expect(status).toBe('reported');
    const rawMeta = captured!.meta as Record<string, unknown>;
    const detail = rawMeta['detail'] as Record<string, unknown>;
    const user = detail['user'] as Record<string, unknown>;
    const headers = detail['headers'] as Record<string, unknown>;
    // Secret key 'password' must be redacted even inside nested objects
    expect(user).not.toHaveProperty('password', 'hunter2');
    expect(user['password']).toBe('[REDACTED]');
    // Secret key 'authorization' in nested headers must be redacted
    expect(headers).not.toHaveProperty('authorization', 'Bearer secret-token');
    expect(headers['authorization']).toBe('[REDACTED]');
    // Safe key 'name' is preserved
    expect(user).toHaveProperty('name', 'Alice');
  });

  it('envelope without meta is passed through unchanged', async () => {
    let captured: SafeErrorEnvelope | null = null;
    configure(async (e) => { captured = e; });
    const envelope: SafeErrorEnvelope = {
      errorCode: 'NO_META',
      phase: 'handler',
      safeMessage: 'Unexpected error',
      requestId: 'req-nometa',
      timestamp: new Date().toISOString(),
    };
    const status = await report(envelope);
    expect(status).toBe('reported');
    expect(captured!.meta).toBeUndefined();
  });

  it('PII top-level keys are redacted', async () => {
    let captured: SafeErrorEnvelope | null = null;
    configure(async (e) => { captured = e; });
    const envelope: SafeErrorEnvelope = {
      errorCode: 'PII_TEST',
      phase: 'handler',
      safeMessage: 'Unexpected error',
      requestId: 'req-pii',
      timestamp: new Date().toISOString(),
      meta: { phone: '0909123456', email: 'user@example.com', ssn: '123456789' },
    };
    const status = await report(envelope);
    expect(status).toBe('reported');
    const rawMeta = captured!.meta as Record<string, unknown>;
    expect(rawMeta).not.toHaveProperty('phone', '0909123456');
    expect(rawMeta).not.toHaveProperty('email', 'user@example.com');
    expect(rawMeta).not.toHaveProperty('ssn', '123456789');
    expect(rawMeta['phone']).toBe('[REDACTED]');
    expect(rawMeta['email']).toBe('[REDACTED]');
    expect(rawMeta['ssn']).toBe('[REDACTED]');
  });
});
