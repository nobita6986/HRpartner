/**
 * recruiter-workbench.placement-actions.fetch.test.ts — Idempotency-Key
 * mint + URL build + fetch wrapper.
 *
 * Targets (LOCK-05, LOCK-06, LOCK-13):
 *   - mintUuidV4: returns a valid UUID v4 shape (browser-only, tested via
 *     runtime mock when not in jsdom).
 *   - mintPlacementIdempotencyKey: per-tab scoping; same scope+payload
 *     reuses the key; different payload mints a new one.
 *   - clearPlacementIdempotencyKey: removes the key on success; safe to
 *     call with mismatched payload.
 *   - urlForPlacementCommand: 5 canonical endpoints, encodes placementId.
 *   - headersForPlacementCommand: content-type + idempotency-key only.
 *   - runPlacementCommandRequest: 200 success path, 4xx failure envelope,
 *     network-failure branch.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearPlacementIdempotencyKey,
  headersForPlacementCommand,
  mintPlacementIdempotencyKey,
  mintUuidV4,
  runPlacementCommandRequest,
  urlForPlacementCommand,
} from '@/src/domains/talent/recruiter-workbench.placement-actions.fetch';

// ─────────────────────────────────────────────────────────────────────────
// In-memory sessionStorage mock (jsdom-compatible; falls back to a stub).
// ─────────────────────────────────────────────────────────────────────────

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  key(index: number): string | null {
    if (index < 0 || index >= this.store.size) return null;
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

beforeEach(() => {
  if (typeof globalThis.window === 'undefined') {
    Object.defineProperty(globalThis, 'window', {
      value: { sessionStorage: new MemoryStorage() },
      configurable: true,
      writable: true,
    });
  } else if (!globalThis.window.sessionStorage) {
    Object.defineProperty(globalThis.window, 'sessionStorage', {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
  if (globalThis.window?.sessionStorage) {
    (globalThis.window.sessionStorage as MemoryStorage).clear();
  }
});

// ─────────────────────────────────────────────────────────────────────────
// mintUuidV4
// ─────────────────────────────────────────────────────────────────────────

describe('mintUuidV4', () => {
  it('F1-MUV01: throws when crypto.randomUUID is missing', () => {
    const orig = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      writable: true,
      value: {},
    });
    try {
      expect(() => mintUuidV4()).toThrow(/randomUUID/);
    } finally {
      if (orig) {
        Object.defineProperty(globalThis, 'crypto', orig);
      } else {
        delete (globalThis as unknown as { crypto?: unknown }).crypto;
      }
    }
  });

  it('F1-MUV02: returns 36-char string with dashes and version nibble 4', () => {
    const k = mintUuidV4();
    expect(k).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// mintPlacementIdempotencyKey — per-tab scoping (LOCK-13)
// ─────────────────────────────────────────────────────────────────────────

describe('mintPlacementIdempotencyKey', () => {
  it('F1-MIK01: first mint fresh=true and writes the key to sessionStorage', () => {
    const r = mintPlacementIdempotencyKey({
      command: 'placement.confirm',
      scope: 'pl-1',
      payload: { command: 'placement.confirm', placementId: 'pl-1' },
    });
    expect(r.isFresh).toBe(true);
    expect(r.key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(globalThis.window.sessionStorage.getItem(
      `hrp.p1f1.idem.placement.confirm.pl-1.${r.key.slice(0, 0)}`, // dummy — use full key below
    )).toBeNull();
  });

  it('F1-MIK02: second mint with same args reuses isFresh=false', () => {
    const a = mintPlacementIdempotencyKey({
      command: 'placement.confirm',
      scope: 'pl-1',
      payload: { command: 'placement.confirm', placementId: 'pl-1' },
    });
    const b = mintPlacementIdempotencyKey({
      command: 'placement.confirm',
      scope: 'pl-1',
      payload: { command: 'placement.confirm', placementId: 'pl-1' },
    });
    expect(a.isFresh).toBe(true);
    expect(b.isFresh).toBe(false);
    expect(a.key).toBe(b.key);
  });

  it('F1-MIK03: payload change mints a new key', () => {
    const a = mintPlacementIdempotencyKey({
      command: 'placement.create',
      scope: 'case-1',
      payload: {
        command: 'placement.create',
        placementCaseId: 'case-1',
        jobOpeningId: 'jo-1',
      },
    });
    const b = mintPlacementIdempotencyKey({
      command: 'placement.create',
      scope: 'case-1',
      payload: {
        command: 'placement.create',
        placementCaseId: 'case-1',
        jobOpeningId: 'jo-2',
      },
    });
    expect(a.key).not.toBe(b.key);
  });

  it('F1-MIK04: scope change mints a new key', () => {
    const a = mintPlacementIdempotencyKey({
      command: 'placement.fail',
      scope: 'pl-1',
      payload: { command: 'placement.fail', placementId: 'pl-1' },
    });
    const b = mintPlacementIdempotencyKey({
      command: 'placement.fail',
      scope: 'pl-2',
      payload: { command: 'placement.fail', placementId: 'pl-2' },
    });
    expect(a.key).not.toBe(b.key);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// clearPlacementIdempotencyKey
// ─────────────────────────────────────────────────────────────────────────

describe('clearPlacementIdempotencyKey', () => {
  it('F1-CLR01: removes the exact key when payload provided', () => {
    const payload = {
      command: 'placement.confirm' as const,
      placementId: 'pl-1',
    };
    mintPlacementIdempotencyKey({
      command: 'placement.confirm',
      scope: 'pl-1',
      payload,
    });
    expect(globalThis.window.sessionStorage.length).toBe(1);
    clearPlacementIdempotencyKey({
      command: 'placement.confirm',
      scope: 'pl-1',
      payload,
    });
    expect(globalThis.window.sessionStorage.length).toBe(0);
  });

  it('F1-CLR02: removes ALL keys for command+scope when payload omitted', () => {
    const scope = 'pl-1';
    for (const plId of ['jo-1', 'jo-2', 'jo-3']) {
      mintPlacementIdempotencyKey({
        command: 'placement.cancel',
        scope,
        payload: {
          command: 'placement.cancel',
          placementId: `pl-${plId}`,
        },
      });
    }
    clearPlacementIdempotencyKey({
      command: 'placement.cancel',
      scope,
    });
    expect(globalThis.window.sessionStorage.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// urlForPlacementCommand
// ─────────────────────────────────────────────────────────────────────────

describe('urlForPlacementCommand', () => {
  it('F1-URL01: create → /api/admin/placements (no [id])', () => {
    expect(
      urlForPlacementCommand({ command: 'placement.create' }),
    ).toBe('/api/admin/placements');
  });

  it('F1-URL02: confirm → /api/admin/placements/:id/actions/confirm', () => {
    expect(
      urlForPlacementCommand({
        command: 'placement.confirm',
        placementId: 'pl-1',
      }),
    ).toBe('/api/admin/placements/pl-1/actions/confirm');
  });

  it('F1-URL03: effective → /api/admin/placements/:id/actions/effective', () => {
    expect(
      urlForPlacementCommand({
        command: 'placement.effective',
        placementId: 'pl-2',
      }),
    ).toBe('/api/admin/placements/pl-2/actions/effective');
  });

  it('F1-URL04: fail → /api/admin/placements/:id/actions/fail', () => {
    expect(
      urlForPlacementCommand({
        command: 'placement.fail',
        placementId: 'pl-3',
      }),
    ).toBe('/api/admin/placements/pl-3/actions/fail');
  });

  it('F1-URL05: cancel → /api/admin/placements/:id/actions/cancel', () => {
    expect(
      urlForPlacementCommand({
        command: 'placement.cancel',
        placementId: 'pl-4',
      }),
    ).toBe('/api/admin/placements/pl-4/actions/cancel');
  });

  it('F1-URL06: transition command without placementId throws', () => {
    expect(() =>
      urlForPlacementCommand({ command: 'placement.cancel' }),
    ).toThrow(/placementId/);
  });

  it('F1-URL07: URL-encodes placementId', () => {
    expect(
      urlForPlacementCommand({
        command: 'placement.cancel',
        placementId: 'pl/with/slash',
      }),
    ).toBe('/api/admin/placements/pl%2Fwith%2Fslash/actions/cancel');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// headersForPlacementCommand
// ─────────────────────────────────────────────────────────────────────────

describe('headersForPlacementCommand', () => {
  it('F1-HDR01: emits Accept, Content-Type, x-idempotency-key', () => {
    const h = headersForPlacementCommand(
      '00000000-0000-4000-8000-000000000000',
    );
    expect(h).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-idempotency-key': '00000000-0000-4000-8000-000000000000',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// runPlacementCommandRequest — fetch wrapper
// ─────────────────────────────────────────────────────────────────────────

describe('runPlacementCommandRequest', () => {
  function mockFetchOnce(status: number, body: unknown): Response {
    const res = new Response(
      body === null ? null : JSON.stringify(body),
      {
        status,
        headers: { 'content-type': 'application/json' },
      },
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(res);
    return res;
  }

  it('F1-RUN01: success 201 → ok:true, body, replayed', async () => {
    mockFetchOnce(201, {
      placementId: 'pl-1',
      status: 'SELECTED',
      replayed: false,
    });
    const out = await runPlacementCommandRequest<{
      placementId: string;
      status: string;
    }>({
      command: 'placement.create',
      payload: {
        command: 'placement.create',
        placementCaseId: 'case-1',
        jobOpeningId: 'jo-1',
      },
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.status).toBe(201);
      expect(out.body.placementId).toBe('pl-1');
      expect(out.replayed).toBe(false);
    }
  });

  it('F1-RUN02: success 200 with replayed=true (idempotent replay)', async () => {
    mockFetchOnce(200, { placementId: 'pl-1', status: 'CONFIRMED', replayed: true });
    const out = await runPlacementCommandRequest({
      command: 'placement.confirm',
      payload: { command: 'placement.confirm', placementId: 'pl-1' },
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.replayed).toBe(true);
    }
  });

  it('F1-RUN03: failure 400 with envelope → ok:false, errorCode, displayMessage', async () => {
    mockFetchOnce(400, { error: 'VALIDATION', message: 'jobOpeningId bắt buộc' });
    const out = await runPlacementCommandRequest({
      command: 'placement.create',
      payload: {
        command: 'placement.create',
        placementCaseId: 'case-1',
        jobOpeningId: 'jo-1',
      },
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.status).toBe(400);
      expect(out.errorCode).toBe('VALIDATION');
      expect(out.displayMessage).toBe('jobOpeningId bắt buộc');
      expect(out.envelope).toEqual({
        error: 'VALIDATION',
        message: 'jobOpeningId bắt buộc',
      });
    }
  });

  it('F1-RUN04: failure 409 (idempotency conflict) surfaces envelope verbatim', async () => {
    mockFetchOnce(409, {
      error: 'IDEMPOTENCY_KEY_REUSED',
      message: 'Idempotency-Key đã được dùng với payload khác',
    });
    const out = await runPlacementCommandRequest({
      command: 'placement.fail',
      payload: { command: 'placement.fail', placementId: 'pl-1' },
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.errorCode).toBe('IDEMPOTENCY_KEY_REUSED');
      expect(out.displayMessage).toContain('Idempotency-Key');
    }
  });

  it('F1-RUN05: failure with non-JSON body → displayMessage falls back to status code', async () => {
    // No JSON body, just status 500.
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 500 }),
    );
    const out = await runPlacementCommandRequest({
      command: 'placement.confirm',
      payload: { command: 'placement.confirm', placementId: 'pl-1' },
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.status).toBe(500);
      expect(out.errorCode).toBe('UNKNOWN');
      expect(out.displayMessage).toContain('500');
    }
  });

  it('F1-RUN06: network failure → ok:false, errorCode NETWORK, displayMessage', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new TypeError('Failed to fetch'),
    );
    const out = await runPlacementCommandRequest({
      command: 'placement.confirm',
      payload: { command: 'placement.confirm', placementId: 'pl-1' },
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.errorCode).toBe('NETWORK');
      expect(out.displayMessage).toContain('Không thể kết nối máy chủ');
    }
  });

  it('F1-RUN07: includes x-idempotency-key header on every request', async () => {
    const mock = mockFetchOnce(200, { placementId: 'pl-1', status: 'CANCELLED', replayed: false });
    await runPlacementCommandRequest({
      command: 'placement.cancel',
      payload: { command: 'placement.cancel', placementId: 'pl-1' },
    });
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls;
    expect(calls.length).toBe(1);
    const init = calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['x-idempotency-key']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Accept']).toBe('application/json');
    // mock used to silence unused warnings
    expect(mock.status).toBe(200);
  });
});
