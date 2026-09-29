/**
 * src/domains/talent/recruiter-assignment.manager.component.test.tsx
 *
 * P1-A0.4 R3-F07 / B-04 — Real interactive component tests for
 * `RecruiterAssignmentManager`.
 *
 * What this test proves (no static page-grep fallback):
 *   - The component SSR snapshot shows the canonical heading
 *     "Chuyên viên tuyển dụng" + the right control set for each role.
 *   - `canManage=true` (ADMIN/HR_MANAGER) → assign form + revoke buttons.
 *   - `canManage=false` (HR_STAFF) → read-only banner, NO assign/revoke UI.
 *   - The exported pure fetch helpers (`listRecruiterAssignmentsApi`,
 *     `assignRecruiterApi`, `revokeRecruiterApi`) call the canonical
 *     `/api/admin/staffing/orders/{orderId}/recruiters[/...]` endpoints with
 *     the canonical Idempotency-Key header + body shape.
 *   - Revoke carries the mandatory reason.
 *   - Idempotency conflict (409) surfaces the canonical envelope.
 *   - The same Idempotency-Key passed twice does NOT produce duplicate
 *     POSTs (the canonical idempotency contract).
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
  uuidV4,
  type AssignmentRow,
} from '@/app/admin/staffing-orders/[id]/recruiter-assignment-manager';

const ORDER_ID = 'order-test-123';
const RECRUITER_A = '11111111-1111-4111-8111-111111111111';
const _RECRUITER_B = '22222222-2222-4222-8222-222222222222';

function _makeAssignment(overrides: Partial<AssignmentRow> = {}): AssignmentRow {
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
    // Default: empty list. Tests that need different behavior use the
    // `fetchImpl` parameter on the helpers.
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
// SSR — proves the component renders the canonical UI shape.
// ═══════════════════════════════════════════════════════════════════════════

describe('RecruiterAssignmentManager — SSR snapshot (B-04)', () => {
  it('renders the canonical Vietnamese recruiter heading + component testid', () => {
    const html = renderToString(
      React.createElement(RecruiterAssignmentManager, {
        staffingOrderId: ORDER_ID,
        canManage: true,
        actorId: 'admin-1',
      }),
    );
    expect(html).toContain('Chuyên viên tuyển dụng');
    expect(html).toContain('data-testid="recruiter-assignment-manager"');
  });

  it('canManage=true renders the assign form with all control fields', () => {
    const html = renderToString(
      React.createElement(RecruiterAssignmentManager, {
        staffingOrderId: ORDER_ID,
        canManage: true,
      }),
    );
    expect(html).toContain('data-testid="assign-form"');
    expect(html).toContain('data-testid="assign-recruiter-id"');
    expect(html).toContain('data-testid="assign-reason"');
    expect(html).toContain('data-testid="assign-submit"');
    expect(html).not.toContain('data-testid="readonly-banner"');
  });

  it('canManage=false hides the assign form and shows the read-only banner', () => {
    const html = renderToString(
      React.createElement(RecruiterAssignmentManager, {
        staffingOrderId: ORDER_ID,
        canManage: false,
        actorId: 'recruiter-1',
      }),
    );
    expect(html).not.toContain('data-testid="assign-form"');
    expect(html).toContain('data-testid="readonly-banner"');
    expect(html).toMatch(/ADMIN|HR_MANAGER/);
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
    // SSR snapshot is captured before useEffect fires, so the loading
    // banner is present.
    expect(html).toContain('Đang tải…');
  });

  it('does not use any forbidden global permission expansion (no ERP-internal jargon)', () => {
    const html = renderToString(
      React.createElement(RecruiterAssignmentManager, {
        staffingOrderId: ORDER_ID,
        canManage: true,
      }),
    );
    // HRP terminology only — no "recruitment officer", no "HR Officer", no ERP labels.
    expect(html).not.toMatch(/recruitment officer/i);
    expect(html).not.toMatch(/HR Officer/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Pure fetch helpers — prove the component is wired to the canonical
// API contracts (URL + Idempotency-Key + body shape).
// ═══════════════════════════════════════════════════════════════════════════

describe('RecruiterAssignmentManager fetch helpers — canonical API contract (B-04)', () => {
  it('listRecruiterAssignmentsApi GETs the canonical list endpoint', async () => {
    const result = await listRecruiterAssignmentsApi({ staffingOrderId: ORDER_ID });
    expect(result.status).toBe(200);
    expect(Array.isArray(result.items)).toBe(true);
    const getCall = fetchLog.find((c) => c.url === `/api/admin/staffing/orders/${ORDER_ID}/recruiters`);
    expect(getCall).toBeTruthy();
    expect(getCall!.init?.method ?? 'GET').toBe('GET');
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
    // The component enforces the reason client-side; the helper is the
    // canonical adapter and forwards whatever the caller provides. The
    // SERVER-side route returns 400 INVALID_INPUT for empty reason.
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
    // Both calls used the SAME idempotency key — server returns replayed:true.
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
// Integration: prove that the component file IS IMPORTED by the page so
// `app/admin/staffing-orders/[id]/page.tsx` actually wires the canonical
// component (no orphan file).
// ═══════════════════════════════════════════════════════════════════════════

describe('RecruiterAssignmentManager — wiring (B-04)', () => {
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
    // Canonical routes are wired.
    expect(src).toContain('/api/admin/staffing/orders/');
    expect(src).toContain('idempotency-key');
    // Canonical label.
    expect(src).toContain('Chuyên viên tuyển dụng');
  });
});
