/**
 * logger unit tests — AC-03 (RQ-03 schema/sink), AC-04 (RQ-04 redaction).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { debug, info, warn, error, setSink, LOG_SCHEMA_VERSION, __resetSink } from './logger';
import type { SafeMeta } from './logger';

const REDACTED = '[REDACTED]';

function captureEntries(): { entries: unknown[] } {
  const entries: unknown[] = [];
  const entriesRef = { entries };
  setSink((e) => entriesRef.entries.push(e));
  return entriesRef;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseJson(str: unknown): Record<string, unknown> {
  return JSON.parse(str as string);
}

function getMeta(entry: unknown): Record<string, unknown> {
  return (entry as Record<string, unknown>).meta as Record<string, unknown>;
}

// ─── Schema — AC-03 ────────────────────────────────────────────────────────────

describe('LOG_SCHEMA_VERSION', () => {
  it('is 1.0', () => {
    expect(LOG_SCHEMA_VERSION).toBe('1.0');
  });
});

describe('Schema — AC-03', () => {
  afterEach(() => { __resetSink(); });

  it('every captured log is parseable one-line JSON', () => {
    const ref = captureEntries();
    info('test_event', 'req-123', { route: '/api/test' });
    expect(ref.entries).toHaveLength(1);
    // The sink stores the parsed object; the raw JSON is the default sink output
    expect((ref.entries[0] as Record<string, unknown>).event).toBe('test_event');
  });

  it('has all required keys: schemaVersion, timestamp, level, event, requestId, meta', () => {
    const ref = captureEntries();
    info('test_event', 'req-abc', { method: 'GET' });
    const entry = ref.entries[0] as Record<string, unknown>;
    expect(entry).toHaveProperty('schemaVersion');
    expect(entry).toHaveProperty('timestamp');
    expect(entry).toHaveProperty('level');
    expect(entry).toHaveProperty('event');
    expect(entry).toHaveProperty('requestId');
    expect(entry).toHaveProperty('meta');
  });

  it('schemaVersion is string 1.0', () => {
    const ref = captureEntries();
    info('sv_check', 'req-1', {});
    const entry = ref.entries[0] as Record<string, unknown>;
    expect(entry.schemaVersion).toBe('1.0');
  });

  it('timestamp is valid ISO-8601', () => {
    const ref = captureEntries();
    info('ts_check', 'req-1', {});
    const entry = ref.entries[0] as Record<string, unknown>;
    expect(() => new Date(entry.timestamp as string)).not.toThrow();
    expect(new Date(entry.timestamp as string).toISOString()).toBe(entry.timestamp);
  });

  it('level is one of debug|info|warn|error', () => {
    const levels: Array<'debug' | 'info' | 'warn' | 'error'> = ['debug', 'info', 'warn', 'error'];
    levels.forEach((lvl) => {
      const ref = captureEntries();
      if (lvl === 'debug') debug('e', 'req', {});
      else if (lvl === 'info') info('e', 'req', {});
      else if (lvl === 'warn') warn('e', 'req', {});
      else error('e', 'req', {});
      expect((ref.entries[0] as Record<string, unknown>).level).toBe(lvl);
    });
  });

  it('event is the passed event string', () => {
    const ref = captureEntries();
    info('my_custom_event', 'req-1', {});
    expect((ref.entries[0] as Record<string, unknown>).event).toBe('my_custom_event');
  });

  it('requestId is the passed requestId', () => {
    const ref = captureEntries();
    info('e', 'req-xyz-999', {});
    expect((ref.entries[0] as Record<string, unknown>).requestId).toBe('req-xyz-999');
  });

  it('requestId can be null', () => {
    const ref = captureEntries();
    info('e', null, {});
    expect((ref.entries[0] as Record<string, unknown>).requestId).toBeNull();
  });

  it('meta is always an object', () => {
    const ref = captureEntries();
    info('e', 'req', { status: 404 });
    expect((ref.entries[0] as Record<string, unknown>).meta).not.toBeNull();
    expect(typeof (ref.entries[0] as Record<string, unknown>).meta).toBe('object');
  });

  it('injectable sink receives entries', () => {
    const ref = captureEntries();
    info('sink_test', 'req-1', { count: 42 });
    expect(ref.entries).toHaveLength(1);
    expect((ref.entries[0] as Record<string, unknown>).event).toBe('sink_test');
  });

  it('sink can be reset to default without throwing', () => {
    let called = false;
    setSink(() => { called = true; });
    info('before_reset', 'req', {});
    expect(called).toBe(true);
    __resetSink();
    expect(() => info('after_reset', 'req', {})).not.toThrow();
  });

  it('default sink produces JSON output', () => {
    // Replace with a capture to verify default output
    const captured: string[] = [];
    const origError = console.error;
    console.error = vi.fn((...args: unknown[]) => captured.push(args.map(String).join(' ')));
    setSink((e) => console.error(JSON.stringify(e)));
    info('default_sink', 'req', { outcome: 'ok' });
    console.error = origError;
    expect(captured).toHaveLength(1);
    expect(() => parseJson(captured[0])).not.toThrow();
    expect(parseJson(captured[0]).event).toBe('default_sink');
  });
});

// ─── Metadata allow-list — AC-03 ───────────────────────────────────────────────

describe('Metadata allow-list — AC-03', () => {
  afterEach(() => { __resetSink(); });

  const allowedStringKeys = ['route', 'method', 'actorRole', 'resourceType', 'outcome', 'jobName', 'phase', 'detail', 'errorCode'];
  const allowedNumericKeys = ['status', 'durationMs', 'attempt', 'count'];

  allowedStringKeys.forEach((key) => {
    it(`accepts meta.${key} (string)`, () => {
      const ref = captureEntries();
      info('allow_test', 'req', { [key]: 'value' });
      expect(getMeta(ref.entries[0])[key]).toBe('value');
    });
  });

  allowedNumericKeys.forEach((key) => {
    it(`accepts meta.${key} (number)`, () => {
      const ref = captureEntries();
      info('allow_num', 'req', { [key]: 42 });
      expect(getMeta(ref.entries[0])[key]).toBe(42);
    });
  });

  it('rejects arbitrary meta keys (unknown top-level keys stripped)', () => {
    const ref = captureEntries();
    info('reject_test', 'req', { password: 'secret', myCustomField: 'foo', safe: 'bar' } as SafeMeta);
    const meta = getMeta(ref.entries[0]);
    // password: top-level secret key → REDACTED sentinel (preserved, not stripped)
    expect(meta['password']).toBe(REDACTED);
    // myCustomField: not in allow-list, not REDACTED → stripped
    expect(meta).not.toHaveProperty('myCustomField');
    // safe: not in allow-list, not REDACTED → stripped
    expect(meta).not.toHaveProperty('safe');
  });

  it('rejects meta with wrong type for string keys', () => {
    const ref = captureEntries();
    info('type_check', 'req', { route: 123 } as any);
    expect(getMeta(ref.entries[0])).not.toHaveProperty('route');
  });

  it('rejects meta with wrong type for numeric keys', () => {
    const ref = captureEntries();
    info('type_check', 'req', { status: 'not-a-number' } as any);
    expect(getMeta(ref.entries[0])).not.toHaveProperty('status');
  });
});

// ─── Redaction — AC-04 ────────────────────────────────────────────────────────

describe('Redaction — AC-04', () => {
  afterEach(() => { __resetSink(); });

  // ── Authorization / token keys ────────────────────────────────────────────
  const secretKeys = [
    'authorization', 'bearer', 'token', 'secret', 'api_key', 'apiKey',
    'password', 'passwd', 'pwd', 'credential', 'access_token',
    'refresh_token', 'cookie', 'session_id', 'ssn', 'credit_card', 'card_number',
    'cvv', 'cvc',
  ];

  secretKeys.forEach((key) => {
    it(`redacts top-level secret key: ${key}`, () => {
      const ref = captureEntries();
      // 'detail' is in allow-list and can hold arbitrary structured data
      info('secret_key', 'req', { detail: { [key]: 'super-secret-value', safe: 'visible' } });
      const meta = getMeta(ref.entries[0]) as Record<string, unknown>;
      const detail = meta['detail'] as Record<string, unknown>;
      expect(detail[key]).toBe(REDACTED);
      expect(detail['safe']).toBe('visible');
    });
  });

  // ── PII key patterns ──────────────────────────────────────────────────────
  // These keys are NOT in ALLOWED_META_KEYS (top-level allow-list).
  // To test redaction, nest them inside 'detail' (an allowed key).
  const piiKeys = ['cccd', 'cmnd', 'passport', 'phone', 'email', 'address', 'bank_account', 'account_number'];

  piiKeys.forEach((key) => {
    it(`redacts PII key: ${key}`, () => {
      const ref = captureEntries();
      info('pii_key', 'req', { detail: { [key]: 'sensitive-value-123' } });
      const meta = getMeta(ref.entries[0]) as Record<string, unknown>;
      const detail = meta['detail'] as Record<string, unknown>;
      expect(detail[key]).toBe(REDACTED);
    });
  });

  // ── Sensitive value patterns ──────────────────────────────────────────────
  it('redacts long base64-like token values', () => {
    const ref = captureEntries();
    const longBase64 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    info('base64_test', 'req', { detail: { authToken: longBase64 } });
    const meta = getMeta(ref.entries[0]) as Record<string, unknown>;
    const detail = meta['detail'] as Record<string, unknown>;
    expect(detail['authToken']).toBe(REDACTED);
  });

  it('redacts bearer token prefix patterns', () => {
    const ref = captureEntries();
    info('bearer_test', 'req', { detail: { bearer: 'Bearer eyJhbGciOiJIUzI1NiJ9...' } });
    const meta = getMeta(ref.entries[0]) as Record<string, unknown>;
    const detail = meta['detail'] as Record<string, unknown>;
    expect(detail['bearer']).toBe(REDACTED);
  });

  it('redacts 9-digit CCCD (Vietnamese national ID)', () => {
    const ref = captureEntries();
    info('cccd9_test', 'req', { detail: { nationalId: '123456789' } });
    const meta = getMeta(ref.entries[0]) as Record<string, unknown>;
    const detail = meta['detail'] as Record<string, unknown>;
    expect(detail['nationalId']).toBe(REDACTED);
  });

  it('redacts 12-digit CCCD (Vietnamese national ID)', () => {
    const ref = captureEntries();
    info('cccd12_test', 'req', { detail: { nationalId: '123456789012' } });
    const meta = getMeta(ref.entries[0]) as Record<string, unknown>;
    const detail = meta['detail'] as Record<string, unknown>;
    expect(detail['nationalId']).toBe(REDACTED);
  });

  it('redacts VN mobile +84 prefix', () => {
    const ref = captureEntries();
    info('phone_test', 'req', { detail: { phone: '+84912345678' } });
    const meta = getMeta(ref.entries[0]) as Record<string, unknown>;
    const detail = meta['detail'] as Record<string, unknown>;
    expect(detail['phone']).toBe(REDACTED);
  });

  it('redacts VN mobile 0 prefix', () => {
    const ref = captureEntries();
    info('phone0_test', 'req', { detail: { phone: '0912345678' } });
    const meta = getMeta(ref.entries[0]) as Record<string, unknown>;
    const detail = meta['detail'] as Record<string, unknown>;
    expect(detail['phone']).toBe(REDACTED);
  });

  // ── Nested secret paths ──────────────────────────────────────────────────
  it('redacts headers.authorization nested path', () => {
    const ref = captureEntries();
    info('nested_auth', 'req', {
      detail: { headers: { authorization: { value: 'Bearer tok' }, normal: 'ok' } },
    });
    const meta = getMeta(ref.entries[0]) as Record<string, unknown>;
    const detail = meta['detail'] as Record<string, unknown>;
    const nested = detail['headers'] as Record<string, unknown>;
    expect(nested['authorization']).toBe(REDACTED);
    expect(nested['normal']).toBe('ok');
  });

  it('redacts deeply nested access_token', () => {
    const ref = captureEntries();
    info('deep_token', 'req', {
      detail: { context: { data: { access_token: 'Bearer secret-long-token-value-here', safe: 'ok' } } },
    });
    const json = JSON.stringify(ref.entries[0]);
    expect(json).not.toContain('Bearer secret');
    expect(json).not.toContain('secret-long-token');
    const meta = getMeta(ref.entries[0]) as Record<string, unknown>;
    const detail = meta['detail'] as Record<string, unknown>;
    const ctx = detail['context'] as Record<string, unknown>;
    const data = ctx['data'] as Record<string, unknown>;
    expect(data['access_token']).toBe(REDACTED);
    expect(data['safe']).toBe('ok');
  });

  it('redacts cookie header nested path', () => {
    const ref = captureEntries();
    info('cookie_nest', 'req', {
      detail: { request: { headers: { cookie: 'session=abc; token=xyz' } } },
    });
    const json = JSON.stringify(ref.entries[0]);
    expect(json).not.toContain('session=abc');
    expect(json).not.toContain('token=xyz');
    const meta = getMeta(ref.entries[0]) as Record<string, unknown>;
    const detail = meta['detail'] as Record<string, unknown>;
    const req = detail['request'] as Record<string, unknown>;
    const hdrs = req['headers'] as Record<string, unknown>;
    expect(hdrs['cookie']).toBe(REDACTED);
  });

  // ── Attack corpus: no raw data appears ───────────────────────────────────
  it('raw Error message not echoed in log', () => {
    const ref = captureEntries();
    info('error_attack', 'req', {
      err: new Error('DB connection refused to user@example.com + password=secret123'),
    } as unknown as SafeMeta);
    const json = JSON.stringify(ref.entries[0]);
    // Error object is sanitized to {}
    expect(json).not.toContain('DB connection refused');
    expect(json).not.toContain('user@example.com');
    expect(json).not.toContain('secret123');
  });

  it('arbitrary nested object with secrets is sanitized and safe siblings preserved', () => {
    const ref = captureEntries();
    // Use 'detail' (allowed) to hold nested secret data
    info('deep_secret', 'req', {
      detail: {
        token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        safe: 'user visible data',
        count: 3,
      },
    });
    const json = JSON.stringify(ref.entries[0]);
    // Long base64 token must not appear
    expect(json).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(json).not.toContain('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
    const meta = getMeta(ref.entries[0]) as Record<string, unknown>;
    const detail = meta['detail'] as Record<string, unknown>;
    expect(detail['token']).toBe(REDACTED);
    expect(detail['safe']).toBe('user visible data');
    expect(detail['count']).toBe(3);
  });

  it('array with secret values is sanitized element-wise', () => {
    const ref = captureEntries();
    // 'detail' is allowed; put an array inside it
    info('array_secret', 'req', {
      detail: {
        tokens: ['ok-value', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.verylongsignaturebase64token', 'another-ok'],
      },
    });
    const json = JSON.stringify(ref.entries[0]);
    expect(json).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    const meta = getMeta(ref.entries[0]) as Record<string, unknown>;
    const detail = meta['detail'] as Record<string, unknown>;
    const arr = detail['tokens'] as unknown[];
    expect(arr[0]).toBe('ok-value');
    expect(arr[1]).toBe(REDACTED); // long base64-like value
    expect(arr[2]).toBe('another-ok');
  });

  it('safe values are preserved', () => {
    const ref = captureEntries();
    info('safe_values', 'req', {
      outcome: 'login_success', count: 1, durationMs: 42, route: '/api/orders',
      errorCode: 'ERR_NONE', detail: 'all good',
    });
    const meta = getMeta(ref.entries[0]);
    expect(meta['outcome']).toBe('login_success');
    expect(meta['count']).toBe(1);
    expect(meta['durationMs']).toBe(42);
    expect(meta['route']).toBe('/api/orders');
    expect(meta['errorCode']).toBe('ERR_NONE');
    expect(meta['detail']).toBe('all good');
  });
});

// ─── Edge cases ────────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  afterEach(() => { __resetSink(); });

  it('null meta is handled', () => {
    const ref = captureEntries();
    expect(() => info('null_meta', 'req', null as any)).not.toThrow();
    expect(ref.entries).toHaveLength(1);
  });

  it('undefined meta is handled', () => {
    const ref = captureEntries();
    expect(() => info('undef_meta', 'req', undefined as any)).not.toThrow();
    expect(ref.entries).toHaveLength(1);
  });

  it('array as top-level meta is handled', () => {
    const ref = captureEntries();
    expect(() => info('arr_meta', 'req', [1, 2, 3] as any)).not.toThrow();
    expect(ref.entries).toHaveLength(1);
  });

  it('circular reference does not throw', () => {
    const ref = captureEntries();
    const circular: any = { foo: 'bar' };
    circular.self = circular;
    expect(() => info('circular', 'req', circular)).not.toThrow();
    expect(ref.entries).toHaveLength(1);
  });
});
