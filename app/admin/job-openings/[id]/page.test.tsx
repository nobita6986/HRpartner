/**
 * app/admin/job-openings/[id]/page.test.tsx
 *
 * P1-A0.5 (canonical, contract v1.3 §STEP-09 / v1.2 §I-04 / AC-06).
 *
 * Page-level authorization test for `/admin/job-openings/[id]` — Server
 * Component. Verifies:
 *
 *   (1) No session → `redirect('/login?callback=...')` (no rendering).
 *   (2) ADMIN → page visible, server-derived flags (canClassify + canOpen).
 *   (3) HR_MANAGER → page visible, server-derived flags.
 *   (4) DIRECTOR/PM → read-only (page visible, both flags false).
 *   (5) Assigned HR_STAFF → page visible, canClassify false, canOpen true
 *       when all preconditions met.
 *   (6) Unassigned / revoked HR_STAFF → `notFound()` (fail-closed).
 *   (7) Unsupported role (VENDOR_*, WORKER) → `notFound()`.
 *   (8) Client Component NEVER receives actorId / assignment metadata.
 *
 * Strategy: mock `@/src/shared/auth/server-session` to inject synthetic
 * sessions; mock `@/src/lib/db` + `@/src/shared/auth/with-db-context` to
 * return a synthetic JobOpening snapshot; mock
 * `@/src/domains/staffing/job-opening-read.service` to control the DTO;
 * stub the `JobOpeningActions` Client Component to capture the props it
 * receives (this is how we verify what server-derived flags it sees).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// ── Mocks (hoisted) ──────────────────────────────────────────────────────

let mockSession: { userId: string; role: string } | null = null;
let mockOpeningDto: any = null;
let mockHrStaffAssigned = false;

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`__REDIRECT__:${url}`);
  },
  notFound: () => {
    throw new Error('__NOT_FOUND__');
  },
}));

vi.mock('@/src/shared/auth/server-session', () => ({
  getServerSession: vi.fn(async () => mockSession),
}));

vi.mock('@/src/lib/db', () => ({
  getPrisma: vi.fn(() => ({})),
}));

vi.mock('@/src/shared/auth/with-db-context', () => ({
  withDbContext: vi.fn(
    async (
      _prisma: unknown,
      _session: unknown,
      fn: (tx: any) => Promise<unknown>,
    ) => {
      const tx = {
        staffingOrderRecruiterAssignment: {
          findFirst: async () => (mockHrStaffAssigned ? { id: 'asg-1' } : null),
        },
      };
      return fn(tx);
    },
  ),
}));

vi.mock('@/src/domains/staffing/job-opening-read.service', () => ({
  getJobOpeningDetail: vi.fn(async () => mockOpeningDto),
}));

// Stub shared UI to keep markup tractable.
vi.mock('@/src/shared/ui/navigation/breadcrumb', () => ({
  Breadcrumb: () => null,
}));
vi.mock('@/src/shared/ui/data-display/related-objects', () => ({
  RelatedObjects: () => null,
}));
vi.mock('@/src/shared/ui/data-display/empty-state', () => ({
  EmptyState: () => null,
}));

// Stub the action island — capture the props it receives so we can assert
// the server-derived flags. The component tests cover its visibility matrix.
const stubbedActionsProps: Array<{ opening: { id: string }; flags: any }> = [];
vi.mock('./job-opening-actions', () => ({
  JobOpeningActions: (props: { opening: { id: string }; flags: any }) => {
    stubbedActionsProps.push(props);
    return null;
  },
}));

beforeEach(() => {
  mockSession = null;
  mockOpeningDto = null;
  mockHrStaffAssigned = false;
  stubbedActionsProps.length = 0;
});

import Page from './page';

function paramsPromise(id: string) {
  return Promise.resolve({ id });
}

function futureIso(): string {
  return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
}

function pastIso(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

function defaultOpeningDto(overrides: Partial<any> = {}): any {
  return {
    id: 'op-1',
    status: 'DRAFT',
    openedAt: null,
    closedAt: null,
    serviceModel: null,
    placementCount: 0,
    staffingOrder: {
      id: 'so-1',
      code: 'SO-1',
      title: 'Order 1',
      status: 'OPEN',
      deadlineDate: futureIso(),
      project: { id: 'p-1', code: 'P-1', name: 'Project 1' },
    },
    slot: {
      id: 'slot-1',
      positionCode: 'DEV',
      positionTitle: 'Developer',
      validTo: futureIso(),
      slotsFilled: 0,
      slotsNeeded: 1,
    },
    jobPosting: null,
    metrics: { submissionsCount: 0, assignmentsCount: 0 },
    associatedSlots: [],
    ...overrides,
  };
}

async function renderPage(id = 'op-1'): Promise<string> {
  const element = await Page({ params: paramsPromise(id) });
  return renderToStaticMarkup(element);
}

describe('/admin/job-openings/[id] — page-level authorization (AC-06 / v1.2 §I-04)', () => {
  // (1) No session → redirect
  it('(1) no session → redirect to /login?callback=... (no rendering)', async () => {
    mockSession = null;
    await expect(renderPage()).rejects.toThrow(/^__REDIRECT__:/);
    await expect(renderPage()).rejects.toThrow(/\/login\?callback=/);
    // No DB hit, no action island rendered.
    expect(stubbedActionsProps).toHaveLength(0);
  });

  // (2) ADMIN
  it('(2) ADMIN + DRAFT + serviceModel=null → canClassify true, canOpen false (NULL serviceModel)', async () => {
    mockSession = { userId: 'admin-1', role: 'ADMIN' };
    mockOpeningDto = defaultOpeningDto();
    const html = await renderPage();
    expect(html).toContain('Tuyển dụng (Opening)');
    expect(stubbedActionsProps).toHaveLength(1);
    const flags = stubbedActionsProps[0].flags;
    expect(flags.canClassify).toBe(true);
    expect(flags.canOpen).toBe(false); // serviceModel NULL → 422 on /open
    expect(flags.blockedReason).toContain('phân loại ServiceModel');
    expect(flags.currentStatus).toBe('DRAFT');
    expect(stubbedActionsProps[0].opening).toEqual({ id: 'op-1' });
  });

  it('(2b) ADMIN + DRAFT + serviceModel set + all preconditions → canClassify + canOpen true', async () => {
    mockSession = { userId: 'admin-1', role: 'ADMIN' };
    mockOpeningDto = defaultOpeningDto({ serviceModel: 'STAFFING_SUPPLY' });
    await renderPage();
    const flags = stubbedActionsProps[0].flags;
    expect(flags.canClassify).toBe(true);
    expect(flags.canOpen).toBe(true);
    expect(flags.blockedReason).toBeNull();
  });

  // (3) HR_MANAGER
  it('(3) HR_MANAGER → page visible, server-derived flags', async () => {
    mockSession = { userId: 'mgr-1', role: 'HR_MANAGER' };
    mockOpeningDto = defaultOpeningDto({ serviceModel: 'RECRUITMENT_SERVICE' });
    await renderPage();
    const flags = stubbedActionsProps[0].flags;
    expect(flags.canClassify).toBe(true);
    expect(flags.canOpen).toBe(true);
  });

  // (4) DIRECTOR/PM
  it('(4) DIRECTOR → page visible, both flags false (read-only)', async () => {
    mockSession = { userId: 'dir-1', role: 'DIRECTOR' };
    mockOpeningDto = defaultOpeningDto({ serviceModel: 'STAFFING_SUPPLY' });
    await renderPage();
    const flags = stubbedActionsProps[0].flags;
    expect(flags.canClassify).toBe(false);
    expect(flags.canOpen).toBe(false);
  });

  it('(4) PM → page visible, both flags false (read-only)', async () => {
    mockSession = { userId: 'pm-1', role: 'PM' };
    mockOpeningDto = defaultOpeningDto({ serviceModel: 'STAFFING_SUPPLY' });
    await renderPage();
    const flags = stubbedActionsProps[0].flags;
    expect(flags.canClassify).toBe(false);
    expect(flags.canOpen).toBe(false);
  });

  // (5) Assigned HR_STAFF
  it('(5) assigned HR_STAFF + DRAFT + serviceModel set + all preconditions → canClassify false, canOpen true', async () => {
    mockSession = { userId: 'staff-1', role: 'HR_STAFF' };
    mockHrStaffAssigned = true;
    mockOpeningDto = defaultOpeningDto({ serviceModel: 'STAFFING_SUPPLY' });
    await renderPage();
    const flags = stubbedActionsProps[0].flags;
    expect(flags.canClassify).toBe(false); // HR_STAFF never classifies
    expect(flags.canOpen).toBe(true);
    expect(flags.currentServiceModel).toBe('STAFFING_SUPPLY');
  });

  it('(5b) assigned HR_STAFF + DRAFT + NULL serviceModel → canOpen false + blockedReason', async () => {
    mockSession = { userId: 'staff-1', role: 'HR_STAFF' };
    mockHrStaffAssigned = true;
    mockOpeningDto = defaultOpeningDto({ serviceModel: null });
    await renderPage();
    const flags = stubbedActionsProps[0].flags;
    expect(flags.canClassify).toBe(false);
    expect(flags.canOpen).toBe(false);
    expect(flags.blockedReason).toContain('phân loại ServiceModel');
  });

  // (6) Unassigned / revoked HR_STAFF → notFound
  it('(6) unassigned HR_STAFF → notFound (fail-closed)', async () => {
    mockSession = { userId: 'staff-2', role: 'HR_STAFF' };
    mockHrStaffAssigned = false;
    mockOpeningDto = defaultOpeningDto();
    await expect(renderPage()).rejects.toThrow('__NOT_FOUND__');
    expect(stubbedActionsProps).toHaveLength(0);
  });

  // (7) Unsupported role
  it('(7) VENDOR_ADMIN → notFound', async () => {
    mockSession = { userId: 'va-1', role: 'VENDOR_ADMIN' };
    mockOpeningDto = defaultOpeningDto();
    await expect(renderPage()).rejects.toThrow('__NOT_FOUND__');
  });

  it('(7) WORKER → notFound', async () => {
    mockSession = { userId: 'w-1', role: 'WORKER' };
    mockOpeningDto = defaultOpeningDto();
    await expect(renderPage()).rejects.toThrow('__NOT_FOUND__');
  });

  // (8) No actor / assignment metadata forwarded to Client Component
  it('(8) Client Component receives ONLY opening.id + flags (no actor/assignment/PII)', async () => {
    mockSession = { userId: 'admin-1', role: 'ADMIN' };
    mockOpeningDto = defaultOpeningDto({ serviceModel: 'STAFFING_SUPPLY' });
    await renderPage();
    const props = stubbedActionsProps[0];
    // Allowed shape: opening.id + flags (with safe fields).
    expect(Object.keys(props)).toEqual(['opening', 'flags']);
    expect(Object.keys(props.opening)).toEqual(['id']);
    expect(props.opening.id).toBe('op-1');
    // Flags MUST NOT contain actorId, assignmentId, assigneeId.
    const flagsKeys = Object.keys(props.flags);
    expect(flagsKeys).not.toContain('actorId');
    expect(flagsKeys).not.toContain('assigneeId');
    expect(flagsKeys).not.toContain('assignmentId');
    // No PII.
    const flagsStr = JSON.stringify(props.flags);
    expect(flagsStr).not.toContain('admin-1');
    expect(flagsStr).not.toContain('@');
  });

  // Bonus: blocked reason messages
  it('blockedReason reflects deadline passed', async () => {
    mockSession = { userId: 'mgr-1', role: 'HR_MANAGER' };
    mockOpeningDto = defaultOpeningDto({
      serviceModel: 'STAFFING_SUPPLY',
      staffingOrder: {
        id: 'so-1', code: 'SO-1', title: 'Order 1',
        status: 'OPEN', deadlineDate: pastIso(),
        project: { id: 'p-1', code: 'P-1', name: 'Project 1' },
      },
    });
    await renderPage();
    const flags = stubbedActionsProps[0].flags;
    expect(flags.canOpen).toBe(false);
    expect(flags.blockedReason).toContain('quá hạn');
  });

  it('blockedReason reflects slot over-filled', async () => {
    mockSession = { userId: 'mgr-1', role: 'HR_MANAGER' };
    mockOpeningDto = defaultOpeningDto({
      serviceModel: 'STAFFING_SUPPLY',
      slot: {
        id: 'slot-1', positionCode: 'DEV', positionTitle: 'Developer',
        validTo: null, slotsFilled: 5, slotsNeeded: 5,
      },
    });
    await renderPage();
    const flags = stubbedActionsProps[0].flags;
    expect(flags.canOpen).toBe(false);
    expect(flags.blockedReason).toContain('chỉ tiêu');
  });

  it('blockedReason reflects parent order not OPEN', async () => {
    mockSession = { userId: 'mgr-1', role: 'HR_MANAGER' };
    mockOpeningDto = defaultOpeningDto({
      serviceModel: 'STAFFING_SUPPLY',
      staffingOrder: {
        id: 'so-1', code: 'SO-1', title: 'Order 1',
        status: 'CLOSED', deadlineDate: null,
        project: { id: 'p-1', code: 'P-1', name: 'Project 1' },
      },
    });
    await renderPage();
    const flags = stubbedActionsProps[0].flags;
    expect(flags.canOpen).toBe(false);
    expect(flags.blockedReason).toContain('StaffingOrder ở trạng thái CLOSED');
  });
});
