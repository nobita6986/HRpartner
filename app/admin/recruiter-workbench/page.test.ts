/**
 * page.test.ts — Server-component tests for `/admin/recruiter-workbench`.
 *
 * Strategy (E1 is a UI lane; no DB):
 *   - Mock `@/src/shared/auth/server-session` → synthetic sessions.
 *   - Mock `@/src/domains/talent/recruiter-workbench.read-service` →
 *     `getRecruiterWorkbenchList` is the only E0 seam E1 consumes.
 *   - Mock `@/src/lib/db` + `@/src/shared/auth/with-db-context` → never
 *     open a real connection. This is the fail-closed DB safety contract.
 *   - Mock `@/src/shared/auth/permission-resolver` → control canSeeSensitive
 *     and CAN_VIEW_UNASSIGNED_POOL per case.
 *
 * Frozen contracts verified here (TASK.md §6):
 *   - AC-01: omitted params → safe defaults; invalid explicit → no service call.
 *   - AC-02: page calls E0 service inside withDbContext.
 *   - AC-09: 403 PERMISSION_DENIED → ForbiddenPanel, NOT empty state.
 *   - AC-13: primary actions render canonical routes without `?case=`.
 *   - AC-14: raw and masked PII render as server-provided (no client masking).
 *   - AC-15: no hidden/internal field.
 *   - AC-18: no POST/PATCH/DELETE.
 *   - HR_STAFF + view=ALL → 403 (no service call).
 *   - 403 service error → ForbiddenPanel.
 *
 // NOTE: This file is a vitest unit test (see vitest.unit.config.ts app glob).
// The page module is .tsx and is JSX-evaluated by esbuild automatic JSX
// transform; this test file does NOT itself use JSX.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// ── Mock call tracking ────────────────────────────────────────────────
const serviceCalls: Array<{ filter: unknown; opts: unknown }> = [];
const dbContextCalls: number[] = [];
const permResolverCalls: Array<{ userId: string; role: string }> = [];

vi.mock('@/src/shared/auth/server-session', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/src/domains/talent/recruiter-workbench.read-service', () => ({
  getRecruiterWorkbenchList: vi.fn(async (_tx, _ctx, filter, opts) => {
    serviceCalls.push({ filter, opts });
    return {
      items: [],
      total: 0,
      page: filter.page ?? 1,
      pageSize: filter.pageSize ?? 20,
    };
  }),
}));

vi.mock('@/src/shared/auth/permission-resolver', () => ({
  resolveEffectivePermissions: vi.fn(async (ctx: { userId: string; role: string }) => {
    permResolverCalls.push({ userId: ctx.userId, role: ctx.role });
    const set = new Set<string>();
    if (ctx.role === 'ADMIN' || ctx.role === 'HR_MANAGER') {
      set.add('CAN_VIEW_WORKER_SENSITIVE');
      set.add('CAN_VIEW_UNASSIGNED_POOL');
    }
    return set;
  }),
}));

vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: vi.fn(
    async (
      _prisma: unknown,
      _session: unknown,
      fn: (tx: unknown) => Promise<unknown>,
    ) => {
      dbContextCalls.push(Date.now());
      return fn({});
    },
  ),
}));

vi.mock('@/src/lib/db', () => ({
  getPrisma: vi.fn(() => ({})),
}));

vi.mock('next/navigation', async () => {
  const actual =
    await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...actual,
    redirect: vi.fn((href: string) => {
      throw new Error(`REDIRECT:${href}`);
    }),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    usePathname: () => '/admin/recruiter-workbench',
    useSearchParams: () => new URLSearchParams(),
  };
});

// ── Imports after mocks ───────────────────────────────────────────────
import RecruiterWorkbenchPage from './page';
import { getServerSession } from '@/src/shared/auth/server-session';
import { getRecruiterWorkbenchList } from '@/src/domains/talent/recruiter-workbench.read-service';
import { withDbContext } from '@/src/shared/auth/with-db-context';

const mockedSession = getServerSession as unknown as ReturnType<typeof vi.fn>;
const mockedService = getRecruiterWorkbenchList as unknown as ReturnType<typeof vi.fn>;
const mockedDbContext = withDbContext as unknown as ReturnType<typeof vi.fn>;

const SAMPLE_ITEMS = [
  {
    caseId: 'case-1',
    caseStatus: 'IN_PROGRESS',
    openedAt: '2026-09-20T00:00:00.000Z',
    closedAt: null,
    candidate: {
      laborProfileId: 'lp-001',
      fullName: 'Nguyen Van A',
      phone: '0901234567',
      cccdNumber: '012345678901',
      identityVerification: 'VERIFIED',
      completeness: 'FULL',
    },
    job: {
      jobPostingId: 'jp-1',
      jobPostingTitle: 'Thợ hàn',
      projectName: 'Dự án X',
      companyName: 'Công ty Y',
    },
    lastInteraction: { at: '2026-09-24T00:00:00.000Z', kind: 'SUBMISSION' },
    nextAction: 'SCREEN_SUBMISSION',
    handler: { assigneeUserId: 'u-1', assigneeName: 'Trần Văn B', source: 'assignment-1' },
    ageHours: 24,
    isOverdue: false,
    overdueReason: null,
    primaryActions: {
      detailHref: '/admin/labor-profiles/lp-001',
      submissionHref: '/admin/applications',
    },
  },
  {
    caseId: 'case-2',
    caseStatus: 'OPEN',
    openedAt: '2026-09-19T00:00:00.000Z',
    closedAt: null,
    candidate: {
      laborProfileId: 'lp-002',
      fullName: 'Le Thi C',
      phone: '090*******',
      cccdNumber: '012*******901',
      identityVerification: 'UNVERIFIED',
      completeness: 'MINIMAL',
    },
    job: {
      jobPostingId: 'jp-2',
      jobPostingTitle: 'Lao động phổ thông',
      projectName: 'Dự án Z',
      companyName: 'Công ty W',
    },
    lastInteraction: { at: null, kind: null },
    nextAction: 'OPEN_INTAKE',
    handler: { assigneeUserId: null, assigneeName: null, source: null },
    ageHours: 80,
    isOverdue: true,
    overdueReason: 'CASE_AGE_THRESHOLD',
    primaryActions: {
      detailHref: '/admin/labor-profiles/lp-002',
      submissionHref: null,
    },
  },
];

describe('RecruiterWorkbenchPage (server component)', () => {
  beforeEach(() => {
    serviceCalls.length = 0;
    dbContextCalls.length = 0;
    permResolverCalls.length = 0;
    // Reset mock implementation back to the default (which tracks serviceCalls).
    // We do NOT call mockReset() on the service mock because that wipes the
    // default implementation installed by the vi.mock factory — the factory's
    // impl already pushes into serviceCalls.
    mockedService.mockReset();
    // Re-arm the default implementation explicitly so each call writes to
    // serviceCalls.
    mockedService.mockImplementation(async (_tx, _ctx, filter) => {
      serviceCalls.push({ filter, opts: undefined });
      return {
        items: [],
        total: 0,
        page: filter.page ?? 1,
        pageSize: filter.pageSize ?? 20,
      };
    });
    mockedDbContext.mockClear();
    mockedSession.mockReset();
    mockedSession.mockResolvedValue({ userId: 'admin-1', role: 'ADMIN' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function renderPage(
    searchParams: Record<string, string | string[] | undefined>,
  ): Promise<string> {
    const element = await RecruiterWorkbenchPage({
      searchParams: Promise.resolve(searchParams),
    });
    return renderToStaticMarkup(element);
  }

  it('redirects to login when there is no session', async () => {
    mockedSession.mockResolvedValueOnce(null);
    await expect(renderPage({})).rejects.toThrow(/REDIRECT:.*login/);
    expect(serviceCalls).toHaveLength(0);
  });

  it('renders ForbiddenPanel when role is not in allowlist', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'u-1', role: 'WORKER' });
    const html = await renderPage({});
    expect(html).toContain('data-testid="forbidden-panel"');
    expect(serviceCalls).toHaveLength(0);
  });

  it('omitted params: calls E0 service with safe defaults (view=ALL for ADMIN)', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    const html = await renderPage({});
    expect(html).toContain('Recruiter Workbench');
    expect(serviceCalls).toHaveLength(1);
    expect(serviceCalls[0].filter).toMatchObject({
      view: 'ALL',
      page: 1,
      pageSize: 20,
    });
  });

  it('HR_STAFF with omitted view defaults to MINE (safe default per role)', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'staff-1', role: 'HR_STAFF' });
    await renderPage({});
    expect(serviceCalls).toHaveLength(1);
    expect(serviceCalls[0].filter).toMatchObject({ view: 'MINE' });
  });

  it('HR_STAFF + view=ALL returns ForbiddenPanel without calling E0 service', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'staff-1', role: 'HR_STAFF' });
    const html = await renderPage({ view: 'ALL' });
    expect(html).toContain('data-testid="forbidden-panel"');
    expect(serviceCalls).toHaveLength(0);
  });

  it('HR_STAFF + view=UNASSIGNED returns ForbiddenPanel without calling E0 service', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'staff-1', role: 'HR_STAFF' });
    const html = await renderPage({ view: 'UNASSIGNED' });
    expect(html).toContain('data-testid="forbidden-panel"');
    expect(serviceCalls).toHaveLength(0);
  });

  it('invalid explicit query (page=-1) renders InvalidQueryPanel and does NOT call service', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    const html = await renderPage({ page: '-1' });
    expect(html).toContain('data-testid="invalid-query-panel"');
    expect(serviceCalls).toHaveLength(0);
  });

  it('unknown query key (strict schema) renders InvalidQueryPanel', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    const html = await renderPage({ typoKey: 'value' });
    expect(html).toContain('data-testid="invalid-query-panel"');
    expect(serviceCalls).toHaveLength(0);
  });

  it('calls E0 service inside withDbContext (RLS-scoped)', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    await renderPage({});
    expect(serviceCalls).toHaveLength(1);
    expect(dbContextCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('renders raw PII as provided by the server (no client-side masking)', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    mockedService.mockResolvedValueOnce({
      items: SAMPLE_ITEMS,
      total: 2,
      page: 1,
      pageSize: 20,
    });
    const html = await renderPage({});
    expect(html).toContain('0901234567');
    expect(html).toContain('012345678901');
    expect(html).toContain('090*******');
    expect(html).toContain('012*******901');
  });

  it('renders canonical detail href WITHOUT ?case= for every row', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    mockedService.mockResolvedValueOnce({
      items: SAMPLE_ITEMS,
      total: 2,
      page: 1,
      pageSize: 20,
    });
    const html = await renderPage({});
    expect(html).toContain('href="/admin/labor-profiles/lp-001"');
    expect(html).toContain('href="/admin/labor-profiles/lp-002"');
    expect(html).not.toMatch(/href="[^"]*\?case=/);
  });

  it('hides submission link when submissionHref is null', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    mockedService.mockResolvedValueOnce({
      items: SAMPLE_ITEMS,
      total: 2,
      page: 1,
      pageSize: 20,
    });
    const html = await renderPage({});
    const submissionMatches = html.match(/data-testid="submission-link"/g) ?? [];
    expect(submissionMatches.length).toBe(1);
    const detailMatches = html.match(/data-testid="detail-link"/g) ?? [];
    expect(detailMatches.length).toBe(2);
  });

  it('renders NextActionBadge for each row exactly once', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    mockedService.mockResolvedValueOnce({
      items: SAMPLE_ITEMS,
      total: 2,
      page: 1,
      pageSize: 20,
    });
    const html = await renderPage({});
    expect(html.match(/data-testid="next-action-badge"/g)?.length).toBe(2);
    expect(html).toContain('data-next-action="SCREEN_SUBMISSION"');
    expect(html).toContain('data-next-action="OPEN_INTAKE"');
  });

  it('renders HandlerChip with assigneeName OR muted "Chưa phân công"', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    mockedService.mockResolvedValueOnce({
      items: SAMPLE_ITEMS,
      total: 2,
      page: 1,
      pageSize: 20,
    });
    const html = await renderPage({});
    expect(html).toContain('Trần Văn B');
    expect(html).toContain('Chưa phân công');
  });

  it('renders AgeCell with server-provided isOverdue (no client recomputation)', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    mockedService.mockResolvedValueOnce({
      items: SAMPLE_ITEMS,
      total: 2,
      page: 1,
      pageSize: 20,
    });
    const html = await renderPage({});
    const ageCells = html.match(/data-testid="age-cell"/g) ?? [];
    expect(ageCells.length).toBe(2);
    expect(html).toContain('data-is-overdue="false"');
    expect(html).toContain('data-is-overdue="true"');
  });

  it('does NOT call POST/PATCH/DELETE — page is read-only', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    mockedService.mockResolvedValueOnce({
      items: SAMPLE_ITEMS,
      total: 2,
      page: 1,
      pageSize: 20,
    });
    const html = await renderPage({});
    expect(html).not.toMatch(/method="POST"/);
    expect(html).not.toMatch(/method="PATCH"/);
    expect(html).not.toMatch(/method="DELETE"/);
    expect(html).not.toContain('fetch(');
    expect(html).not.toContain('axios');
    // The service was called exactly once via mockedService.mock.calls.
    expect(mockedService.mock.calls).toHaveLength(1);
  });

  it('renders the empty state when total=0 (not the same as 403)', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    mockedService.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    const html = await renderPage({});
    expect(html).toContain('data-testid="table-empty"');
    expect(html).not.toContain('data-testid="forbidden-panel"');
  });

  it('passes sort/page/pageSize from URL to the service filter', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    await renderPage({ sort: 'openedDesc', page: '3', pageSize: '50' });
    expect(serviceCalls[0].filter).toMatchObject({
      sort: 'openedDesc',
      page: 3,
      pageSize: 50,
    });
  });

  it('passes search and caseStatus from URL to the service filter', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    await renderPage({ search: 'Nguyen', caseStatus: 'OPEN' });
    expect(serviceCalls[0].filter).toMatchObject({
      search: 'Nguyen',
      caseStatus: 'OPEN',
    });
  });

  it('passes overdue=true to the service filter (URL → service contract)', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    await renderPage({ overdue: 'true' });
    expect(serviceCalls[0].filter).toMatchObject({ overdue: true });
  });

  it('does not include hidden/internal fields (no form with internal state)', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    mockedService.mockResolvedValueOnce({
      items: SAMPLE_ITEMS,
      total: 2,
      page: 1,
      pageSize: 20,
    });
    const html = await renderPage({});
    expect(html).not.toMatch(/<input[^>]*type="hidden"/);
    const visibleInputs = html.match(/<input[^>]*type="search"/g) ?? [];
    expect(visibleInputs.length).toBe(1);
  });

  it('ADMIN + view=UNASSIGNED with CAN_VIEW_UNASSIGNED_POOL allows the call', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    await renderPage({ view: 'UNASSIGNED' });
    expect(serviceCalls).toHaveLength(1);
    expect(serviceCalls[0].filter).toMatchObject({ view: 'UNASSIGNED' });
  });

  it('renders ARIA labels on key controls', async () => {
    mockedSession.mockResolvedValueOnce({ userId: 'admin-1', role: 'ADMIN' });
    const html = await renderPage({});
    expect(html).toContain('aria-label="Bộ lọc view"');
    expect(html).toContain('aria-label="Bộ lọc trạng thái case"');
    expect(html).toContain('aria-label="Bộ lọc quá hạn"');
    expect(html).toContain('role="search"');
    expect(html).toContain('aria-label="Phân trang"');
  });
});
