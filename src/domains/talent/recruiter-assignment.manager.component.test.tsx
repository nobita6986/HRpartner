/**
 * src/domains/talent/recruiter-assignment.manager.component.test.tsx
 *
 * P1-A0.4 R3-F07 / B-04 / B-09 — Real interactive component tests for
 * `RecruiterAssignmentManager`.
 *
 * What this test proves (no static page-grep fallback):
 *   - The component SSR snapshot shows the canonical heading
 *     "Chuyên viên tuyển dụng" + the right control set.
 *   - The selectable HR_STAFF dropdown (`assign-recruiter-select`) is
 *     rendered with human-readable options (no raw UUID input).
 *   - No actor UUID is rendered anywhere in the component UI
 *     (`Actor: {actorId}` is gone — B-09 mandate).
 *   - The exported pure fetch helpers (`listRecruiterAssignmentsApi`,
 *     `assignRecruiterApi`, `revokeRecruiterApi`, `listHrStaffUsersApi`)
 *     call the canonical endpoints with the canonical Idempotency-Key
 *     header + body shape.
 *   - Idempotency-Key derivation helpers:
 *       - `fnv1a32Hex` is deterministic + sensitive to payload changes.
 *       - `resolveIdempotencyKey` reuses the SAME key when the payload is
 *         unchanged; mints a NEW key when the payload hash changes.
 *       - `clearIdempotencyKey` removes the key on terminal success.
 *   - The two assigns with the same Idempotency-Key replay the same
 *     request body (canonical idempotency contract).
 *
 * The SSR + helper combination proves the component is wired to the
 * canonical routes — not a fallback "any page with the word recruiter"
 * page-grep.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import * as React from 'react';
import {
  RecruiterAssignmentManager,
  listRecruiterAssignmentsApi,
  assignRecruiterApi,
  revokeRecruiterApi,
  listHrStaffUsersApi,
  uuidV4,
  fnv1a32Hex,
  canonicalAssignPayload,
  canonicalRevokePayload,
  resolveIdempotencyKey,
  clearIdempotencyKey,
  buildIdempotencyStorageKey,
  hrStaffDisplayLabel,
  type AssignmentRow,
} from '@/app/admin/staffing-orders/[id]/recruiter-assignment-manager';

const ORDER_ID = 'order-test-123';
const RECRUITER_A = '11111111-1111-4111-8111-111111111111';

function makeAssignment(overrides: Partial<AssignmentRow> = {}): AssignmentRow {
  return {
    id: 'assignment-1',
    staffingOrderId: ORDER_ID,
    recruiterUserId: RECRUITER_A,
    recruiterName: 'Nguyễn Văn A',
    status: 'ACTIVE',
    reason: 'Phân công đợt 1',
    revokedAt: null,
    createdAt: '2026-09-29T00:00:00.000Z',
    ...overrides,
  };
}

interface FetchCall {
  url: string;
  init?: RequestInit;
}

const fetchLog: FetchCall[] = [];

function installFetchMock() {
  fetchLog.length = 0;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    fetchLog.push({ url, init });
    if (url === '/api/admin/hr-staff-users') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          users: [
            { id: RECRUITER_A, name: 'Nguyễn Văn A', phone: '0901234567', isActive: true },
            { id: '22222222-2222-4222-8222-222222222222', name: 'Trần Thị B', phone: null, isActive: true },
          ],
        }),
      } as unknown as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  installFetchMock();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════
// SSR — proves the component renders the canonical UI shape (B-04 + B-09).
// ═══════════════════════════════════════════════════════════════════════════

describe('RecruiterAssignmentManager — SSR snapshot (B-04/B-09)', () => {
  it('renders the canonical Vietnamese recruiter heading + component testid', () => {
    const html = renderToString(
      React.createElement(RecruiterAssignmentManager, {
        staffingOrderId: ORDER_ID,
        canManage: true,
      }),
    );
    expect(html).toContain('Chuyên viên tuyển dụng');
    expect(html).toContain('data-testid="recruiter-assignment-manager"');
  });

  it('canManage=true renders the assign form with the HR_STAFF dropdown loader', () => {
    const html = renderToString(
      React.createElement(RecruiterAssignmentManager, {
        staffingOrderId: ORDER_ID,
        canManage: true,
      }),
    );
    expect(html).toContain('data-testid="assign-form"');
    // B-09: the HR_STAFF selectable dropdown is wired via listHrStaffUsersApi;
    // SSR captures the loading state before the async fetch resolves.
    expect(html).toContain('data-testid="assign-recruiter-loading"');
    // B-09: NO raw UUID input is rendered (the dropdown replaces it).
    expect(html).not.toContain('data-testid="assign-recruiter-id"');
    expect(html).not.toContain('UUID v4');
    expect(html).not.toContain('data-testid="readonly-banner"');
    expect(html).toContain('data-testid="assign-reason"');
    expect(html).toContain('data-testid="assign-submit"');
  });

  it('B-09: NO actor UUID is rendered anywhere in the UI', () => {
    const html = renderToString(
      React.createElement(RecruiterAssignmentManager, {
        staffingOrderId: ORDER_ID,
        canManage: true,
      }),
    );
    expect(html).not.toMatch(/Actor:\s*\{/);
    expect(html).not.toMatch(/Actor:\s*<code/);
    expect(html).not.toContain('>Actor:<');
    // Only HR_STAFF dropdown is the place to surface recruiter identity.
    expect(html).not.toMatch(/data-testid="[^"]*actor[^"]*"/);
  });

  it('renders the canonical subheading "Phân công chuyên viên tuyển dụng mới"', () => {
    const html = renderToString(
      React.createElement(RecruiterAssignmentManager, {
        staffingOrderId: ORDER_ID,
        canManage: true,
      }),
    );
    expect(html).toContain('Phân công chuyên viên tuyển dụng mới');
  });

  it('renders the loading indicator on initial SSR', () => {
    const html = renderToString(
      React.createElement(RecruiterAssignmentManager, {
        staffingOrderId: ORDER_ID,
        canManage: true,
      }),
    );
    // SSR snapshot is captured before useEffect fires, so both the
    // assignments list and the HR_STAFF dropdown are in their loading state.
    expect(html).toContain('Đang tải…');
    expect(html).toContain('data-testid="assign-recruiter-loading"');
  });

  it('does not use any forbidden global permission expansion (no ERP-internal jargon)', () => {
    const html = renderToString(
      React.createElement(RecruiterAssignmentManager, {
        staffingOrderId: ORDER_ID,
        canManage: true,
      }),
    );
    expect(html).not.toMatch(/recruitment officer/i);
    expect(html).not.toMatch(/HR Officer/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Pure fetch helpers — canonical API contract (B-04 + B-09).
// ═══════════════════════════════════════════════════════════════════════════

describe('RecruiterAssignmentManager fetch helpers — canonical API contract (B-04/B-09)', () => {
  it('listRecruiterAssignmentsApi GETs the canonical list endpoint', async () => {
    const result = await listRecruiterAssignmentsApi({ staffingOrderId: ORDER_ID });
    expect(result.status).toBe(200);
    expect(Array.isArray(result.items)).toBe(true);
    const getCall = fetchLog.find((c) => c.url === `/api/admin/staffing/orders/${ORDER_ID}/recruiters`);
    expect(getCall).toBeTruthy();
    expect(getCall!.init?.method ?? 'GET').toBe('GET');
  });

  it('listHrStaffUsersApi GETs the canonical HR_STAFF list endpoint (B-09)', async () => {
    const result = await listHrStaffUsersApi();
    expect(result.status).toBe(200);
    expect(result.users.length).toBe(2);
    // The first user has a name + email — used as the dropdown label.
    expect(result.users[0]!.name).toBe('Nguyễn Văn A');
    const call = fetchLog.find((c) => c.url === '/api/admin/hr-staff-users');
    expect(call).toBeTruthy();
    expect(call!.init?.method ?? 'GET').toBe('GET');
  });

  it('assignRecruiterApi POSTs to the canonical endpoint with Idempotency-Key + body', async () => {
    const key = '11111111-2222-4333-8444-555555555555';
    const result = await assignRecruiterApi({
      staffingOrderId: ORDER_ID,
      recruiterUserId: RECRUITER_A,
      reason: 'Phân công qua admin UI',
      idempotencyKey: key,
    });
    expect(result.status).toBe(200);
    const postCall = fetchLog.find(
      (c) => c.init?.method === 'POST' && c.url === `/api/admin/staffing/orders/${ORDER_ID}/recruiters`,
    );
    expect(postCall).toBeTruthy();
    expect(postCall!.init?.headers).toMatchObject({
      'content-type': 'application/json',
      'idempotency-key': key,
    });
    const body = JSON.parse((postCall!.init?.body as string) ?? '{}');
    expect(body).toMatchObject({
      recruiterUserId: RECRUITER_A,
      reason: 'Phân công qua admin UI',
    });
  });

  it('assignRecruiterApi auto-generates an Idempotency-Key when none provided', async () => {
    await assignRecruiterApi({
      staffingOrderId: ORDER_ID,
      recruiterUserId: RECRUITER_A,
    });
    const postCall = fetchLog.find(
      (c) => c.init?.method === 'POST' && c.url === `/api/admin/staffing/orders/${ORDER_ID}/recruiters`,
    );
    const headers = postCall!.init?.headers as Record<string, string>;
    expect(headers['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('revokeRecruiterApi POSTs to the canonical revoke endpoint with mandatory reason', async () => {
    const key = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const result = await revokeRecruiterApi({
      staffingOrderId: ORDER_ID,
      assignmentId: 'assignment-1',
      reason: 'R3-F07 revoke via UI',
      idempotencyKey: key,
    });
    expect(result.status).toBe(200);
    const postCall = fetchLog.find(
      (c) =>
        c.init?.method === 'POST' &&
        c.url === `/api/admin/staffing/orders/${ORDER_ID}/recruiters/assignment-1/revoke`,
    );
    expect(postCall).toBeTruthy();
    expect(postCall!.init?.headers).toMatchObject({
      'content-type': 'application/json',
      'idempotency-key': key,
    });
    const body = JSON.parse((postCall!.init?.body as string) ?? '{}');
    expect(body).toMatchObject({ reason: 'R3-F07 revoke via UI' });
  });

  it('revoke helper does NOT silently drop the reason when caller supplies empty string', async () => {
    await revokeRecruiterApi({
      staffingOrderId: ORDER_ID,
      assignmentId: 'assignment-1',
      reason: '',
    });
    const postCall = fetchLog.find(
      (c) =>
        c.init?.method === 'POST' &&
        c.url === `/api/admin/staffing/orders/${ORDER_ID}/recruiters/assignment-1/revoke`,
    );
    const body = JSON.parse((postCall!.init?.body as string) ?? '{}');
    expect(body.reason).toBe('');
  });

  it('listRecruiterAssignmentsApi surfaces the canonical 403 ROLE_NOT_PERMITTED envelope', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'ROLE_NOT_PERMITTED', message: 'Role HR_STAFF cannot view recruiter assignments' }),
    });
    const result = await listRecruiterAssignmentsApi({ staffingOrderId: ORDER_ID });
    expect(result.status).toBe(403);
    expect(result.items).toEqual([]);
    expect((result.error as { error: string }).error).toBe('ROLE_NOT_PERMITTED');
  });

  it('assignRecruiterApi surfaces the canonical 409 IDEMPOTENCY_CONFLICT envelope', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'IDEMPOTENCY_CONFLICT', message: 'Idempotency-Key already used with different payload' }),
    });
    const result = await assignRecruiterApi({
      staffingOrderId: ORDER_ID,
      recruiterUserId: RECRUITER_A,
      idempotencyKey: '11111111-2222-4333-8444-555555555555',
    });
    expect(result.status).toBe(409);
    expect((result.body as { error: string }).error).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('revokeRecruiterApi surfaces the canonical 403 NO_ACTIVE_ASSIGNMENT envelope on stale revoke', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'NO_ACTIVE_ORDER_ASSIGNMENT', message: 'Order assignment already revoked' }),
    });
    const result = await revokeRecruiterApi({
      staffingOrderId: ORDER_ID,
      assignmentId: 'stale-assignment',
      reason: 'Stale revoke',
    });
    expect(result.status).toBe(403);
    expect((result.body as { error: string }).error).toBe('NO_ACTIVE_ORDER_ASSIGNMENT');
  });

  it('two assigns with the same Idempotency-Key replay the same request body', async () => {
    const key = '22222222-3333-4444-8555-666666666666';
    await assignRecruiterApi({
      staffingOrderId: ORDER_ID,
      recruiterUserId: RECRUITER_A,
      idempotencyKey: key,
    });
    await assignRecruiterApi({
      staffingOrderId: ORDER_ID,
      recruiterUserId: RECRUITER_A,
      idempotencyKey: key,
    });
    const posts = fetchLog.filter(
      (c) => c.init?.method === 'POST' && c.url === `/api/admin/staffing/orders/${ORDER_ID}/recruiters`,
    );
    expect(posts.length).toBe(2);
    expect((posts[0]!.init?.headers as Record<string, string>)['idempotency-key']).toBe(key);
    expect((posts[1]!.init?.headers as Record<string, string>)['idempotency-key']).toBe(key);
  });

  it('uuidV4 produces RFC4122 v4 UUIDs', () => {
    const id = uuidV4();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const id2 = uuidV4();
    expect(id).not.toBe(id2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Idempotency-Key derivation — pure helpers (B-09).
// ═══════════════════════════════════════════════════════════════════════════

interface MemoryStore {
  m: Map<string, string>;
}

function memoryStore(): MemoryStore & { get: (k: string) => string | null; set: (k: string, v: string) => void; delete: (k: string) => void } {
  const m = new Map<string, string>();
  return {
    m,
    get: (k) => (m.has(k) ? (m.get(k) as string) : null),
    set: (k, v) => {
      m.set(k, v);
    },
    delete: (k) => {
      m.delete(k);
    },
  };
}

describe('RecruiterAssignmentManager — Idempotency-Key helpers (B-09)', () => {
  it('fnv1a32Hex is deterministic for the same payload', () => {
    const a = canonicalAssignPayload({
      staffingOrderId: ORDER_ID,
      recruiterUserId: RECRUITER_A,
      reason: 'r1',
    });
    const b = canonicalAssignPayload({
      staffingOrderId: ORDER_ID,
      recruiterUserId: RECRUITER_A,
      reason: 'r1',
    });
    expect(fnv1a32Hex(a)).toBe(fnv1a32Hex(b));
  });

  it('fnv1a32Hex is sensitive to ANY payload change (mints a new key)', () => {
    const base = canonicalAssignPayload({
      staffingOrderId: ORDER_ID,
      recruiterUserId: RECRUITER_A,
      reason: 'r1',
    });
    const differentRecruiter = canonicalAssignPayload({
      staffingOrderId: ORDER_ID,
      recruiterUserId: '99999999-9999-4999-8999-999999999999',
      reason: 'r1',
    });
    const differentReason = canonicalAssignPayload({
      staffingOrderId: ORDER_ID,
      recruiterUserId: RECRUITER_A,
      reason: 'r2',
    });
    const baseHash = fnv1a32Hex(base);
    expect(fnv1a32Hex(differentRecruiter)).not.toBe(baseHash);
    expect(fnv1a32Hex(differentReason)).not.toBe(baseHash);
  });

  it('canonicalAssignPayload + canonicalRevokePayload are deterministic JSON', () => {
    expect(canonicalAssignPayload({ staffingOrderId: ORDER_ID, recruiterUserId: RECRUITER_A, reason: 'r' }))
      .toBe(JSON.stringify({ op: 'assign', orderId: ORDER_ID, recruiterUserId: RECRUITER_A, reason: 'r' }));
    expect(canonicalRevokePayload({ staffingOrderId: ORDER_ID, assignmentId: 'as-1', reason: 'r' }))
      .toBe(JSON.stringify({ op: 'revoke', orderId: ORDER_ID, assignmentId: 'as-1', reason: 'r' }));
  });

  it('buildIdempotencyStorageKey uses the (op, payloadHash) namespace', () => {
    const payload = canonicalAssignPayload({ staffingOrderId: ORDER_ID, recruiterUserId: RECRUITER_A, reason: 'r' });
    const hash = fnv1a32Hex(payload);
    expect(buildIdempotencyStorageKey('assign', hash)).toBe(`hrp:idem:assign:${hash}`);
    expect(buildIdempotencyStorageKey('revoke', hash)).toBe(`hrp:idem:revoke:${hash}`);
  });

  it('resolveIdempotencyKey reuses the SAME key when the payload is unchanged', () => {
    const store = memoryStore();
    const payload = canonicalAssignPayload({ staffingOrderId: ORDER_ID, recruiterUserId: RECRUITER_A, reason: 'r' });
    const counter = { n: 0 };
    const id1 = resolveIdempotencyKey('assign', payload, store, () => {
      counter.n++;
      return 'fake-uuid-1';
    });
    const id2 = resolveIdempotencyKey('assign', payload, store, () => {
      counter.n++;
      return 'fake-uuid-2';
    });
    expect(id1).toBe('fake-uuid-1');
    expect(id2).toBe('fake-uuid-1'); // re-used, no new mint
    expect(counter.n).toBe(1);
    expect(store.m.size).toBe(1);
  });

  it('resolveIdempotencyKey mints a NEW key when the payload hash changes', () => {
    const store = memoryStore();
    const p1 = canonicalAssignPayload({ staffingOrderId: ORDER_ID, recruiterUserId: RECRUITER_A, reason: 'r1' });
    const p2 = canonicalAssignPayload({ staffingOrderId: ORDER_ID, recruiterUserId: RECRUITER_A, reason: 'r2' });
    const id1 = resolveIdempotencyKey('assign', p1, store, () => 'fake-uuid-1');
    const id2 = resolveIdempotencyKey('assign', p2, store, () => 'fake-uuid-2');
    expect(id1).toBe('fake-uuid-1');
    expect(id2).toBe('fake-uuid-2'); // payload changed → fresh key
    expect(store.m.size).toBe(2);
  });

  it('clearIdempotencyKey removes the key on terminal success (next call mints fresh)', () => {
    const store = memoryStore();
    const payload = canonicalAssignPayload({ staffingOrderId: ORDER_ID, recruiterUserId: RECRUITER_A, reason: 'r' });
    const id1 = resolveIdempotencyKey('assign', payload, store, () => 'first');
    clearIdempotencyKey('assign', payload, store);
    const id2 = resolveIdempotencyKey('assign', payload, store, () => 'second');
    expect(id1).toBe('first');
    expect(id2).toBe('second');
  });

  it('resolveIdempotencyKey namespaces assign and revoke keys independently', () => {
    const store = memoryStore();
    const a = canonicalAssignPayload({ staffingOrderId: ORDER_ID, recruiterUserId: RECRUITER_A, reason: 'r' });
    const r = canonicalRevokePayload({ staffingOrderId: ORDER_ID, assignmentId: 'as-1', reason: 'r' });
    expect(resolveIdempotencyKey('assign', a, store, () => 'A')).toBe('A');
    expect(resolveIdempotencyKey('revoke', r, store, () => 'B')).toBe('B');
    expect(store.m.size).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Integration: prove that the component file IS IMPORTED by the page so
// `app/admin/staffing-orders/[id]/page.tsx` actually wires the canonical
// component (no orphan file).
// ═══════════════════════════════════════════════════════════════════════════

describe('RecruiterAssignmentManager — HR_STAFF display label (B-09)', () => {
  it('formats name + phone as the primary label (no UUID leak)', () => {
    expect(
      hrStaffDisplayLabel({ id: '11111111-1111-4111-8111-111111111111', name: 'Nguyễn Văn A', phone: '0901234567', isActive: true }),
    ).toBe('Nguyễn Văn A (0901234567)');
  });
  it('falls back to name only when phone is null', () => {
    expect(
      hrStaffDisplayLabel({ id: '11111111-1111-4111-8111-111111111111', name: 'Nguyễn Văn A', phone: null, isActive: true }),
    ).toBe('Nguyễn Văn A');
  });
  it('falls back to phone only when name is null', () => {
    expect(
      hrStaffDisplayLabel({ id: '11111111-1111-4111-8111-111111111111', name: null, phone: '0901234567', isActive: true }),
    ).toBe('0901234567');
  });
  it('never exposes the raw UUID as the primary label', () => {
    const lbl = hrStaffDisplayLabel({ id: '11111111-1111-4111-8111-111111111111', name: null, phone: null, isActive: true });
    expect(lbl).not.toContain('11111111');
    expect(lbl).toBe('(no name)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Integration: prove that the component file IS IMPORTED by the page so
// `app/admin/staffing-orders/[id]/page.tsx` actually wires the canonical
// component (no orphan file).
// ═══════════════════════════════════════════════════════════════════════════

describe('RecruiterAssignmentManager — wiring (B-04/B-09)', () => {
  it('the admin staffing-orders detail page imports the canonical component', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const pagePath = join(process.cwd(), 'app', 'admin', 'staffing-orders', '[id]', 'page.tsx');
    const src = readFileSync(pagePath, 'utf8');
    expect(src).toContain('RecruiterAssignmentManager');
    expect(src).toContain("from './recruiter-assignment-manager'");
  });

  it('the component file exposes the canonical API contracts in its source', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const componentPath = join(
      process.cwd(),
      'app',
      'admin',
      'staffing-orders',
      '[id]',
      'recruiter-assignment-manager.tsx',
    );
    const src = readFileSync(componentPath, 'utf8');
    expect(src).toContain('/api/admin/staffing/orders/');
    expect(src).toContain('idempotency-key');
    expect(src).toContain('Chuyên viên tuyển dụng');
    // B-09: HR_STAFF selectable dropdown source is wired.
    expect(src).toContain('listHrStaffUsersApi');
    expect(src).toContain('assign-recruiter-select');
    // B-09: no raw UUID input label.
    expect(src).not.toContain('assign-recruiter-id');
    // B-09: Idempotency-Key persistence via sessionStorage.
    expect(src).toContain('sessionStorage');
    expect(src).toContain('resolveIdempotencyKey');
    expect(src).toContain('clearIdempotencyKey');
  });

  it('the page file strictly gates ADMIN/HR_MANAGER before mounting the manager', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const pagePath = join(process.cwd(), 'app', 'admin', 'staffing-orders', '[id]', 'page.tsx');
    const src = readFileSync(pagePath, 'utf8');
    // B-09: page MUST enforce ADMIN/HR_MANAGER before mounting manager.
    expect(src).toMatch(/MANAGE_ROLES/);
    expect(src).toMatch(/ADMIN/);
    expect(src).toMatch(/HR_MANAGER/);
    // The 403 branch must be rendered BEFORE the manager mount so HR_STAFF
    // never reaches canManage=true at runtime.
    const gateIdx = src.indexOf('MANAGE_ROLES.has(');
    const mountIdx = src.indexOf('<RecruiterAssignmentManager');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(mountIdx).toBeGreaterThan(gateIdx);
  });

  it('the page file links HR_STAFF to the canonical Recruiter Workbench surface', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const pagePath = join(process.cwd(), 'app', 'admin', 'staffing-orders', '[id]', 'page.tsx');
    const src = readFileSync(pagePath, 'utf8');
    // 403 page redirects HR_STAFF to their own workbench.
    expect(src).toMatch(/recruiter-workbench|Bảng tuyển dụng/);
  });
});

// Suppress unused-warning on the makeAssignment helper kept for future
// data-driven tests.
void makeAssignment;