/**
 * page.tsx — `/admin/recruiter-workbench` (P1-E1 UI).
 *
 * Server component. Fetches data via E0 read service inside `withDbContext`
 * (RLS GUC scoped to transaction). E0 is frozen; this page MUST NOT query
 * the DB directly, MUST NOT redefine the DTO, and MUST NOT derive
 * `nextAction`/`isOverdue`/`ageHours` itself.
 *
 * Frozen contract (TASK.md RQ-01, RQ-21, AC-01, AC-02, AC-09, AC-15):
 *   - Auth via `getServerSession()`; missing session → redirect to login.
 *   - Role gate: ADMIN | HR_MANAGER | HR_STAFF; other roles → forbidden panel.
 *   - URL search params parsed by E0 zod schema:
 *       omitted → safe defaults (`view=ALL` for ADMIN/HR_MANAGER,
 *                 `view=MINE` for HR_STAFF; `sort=ageDesc`; `pageSize=20`);
 *       invalid → render `<InvalidQueryPanel>`, NEVER call E0 service.
 *   - When E0 service throws PERMISSION_DENIED → render `<ForbiddenPanel>`,
 *     NOT the empty state.
 *   - No POST/PATCH/DELETE; this page is read-only.
 */

import * as React from 'react';
import { redirect } from 'next/navigation';
import { Briefcase } from 'lucide-react';

import { getServerSession } from '@/src/shared/auth/server-session';
import { getPrisma } from '@/src/lib/db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import { resolveEffectivePermissions } from '@/src/shared/auth/permission-resolver';
import {
  getRecruiterWorkbenchList,
} from '@/src/domains/talent/recruiter-workbench.read-service';
import {
  RECRUITER_WORKBENCH_VIEW_VALUES,
  RECRUITER_WORKBENCH_SORT_VALUES,
  type RecruiterWorkbenchCaseStatus,
} from '@/src/domains/talent/recruiter-workbench.types';

type View = (typeof RECRUITER_WORKBENCH_VIEW_VALUES)[number];
type Sort = (typeof RECRUITER_WORKBENCH_SORT_VALUES)[number];

import { parseRecruiterWorkbenchQuery } from './_lib/parse-filter';
import { RecruiterWorkbenchTable } from './_components/RecruiterWorkbenchTable';
import { FilterChips } from './_components/FilterChips';
import { SortDropdown } from './_components/SortDropdown';
import { PaginationControls } from './_components/PaginationControls';
import { InvalidQueryPanel } from './_components/InvalidQueryPanel';
import { ForbiddenPanel } from './_components/ForbiddenPanel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata = {
  title: 'Recruiter Workbench - Admin',
};

const ALLOWED_ROLES = new Set(['ADMIN', 'HR_MANAGER', 'HR_STAFF']);

const DEFAULT_SORT: Sort = 'ageDesc';

function defaultViewForRole(role: 'ADMIN' | 'HR_MANAGER' | 'HR_STAFF'): View {
  return role === 'HR_STAFF' ? 'MINE' : 'ALL';
}

function allowedViewsForRole(role: 'ADMIN' | 'HR_MANAGER' | 'HR_STAFF'): ReadonlyArray<View> {
  // HR_STAFF cannot request ALL or UNASSIGNED; this UI MUST NOT show those chips.
  if (role === 'HR_STAFF') return ['MINE'];
  // ADMIN/HR_MANAGER: show all three; UNASSIGNED chip visibility is also gated by
  // CAN_VIEW_UNASSIGNED_POOL (resolved here, kept consistent with the page logic).
  return [...RECRUITER_WORKBENCH_VIEW_VALUES];
}

function splitCaseStatuses(raw: string | undefined): RecruiterWorkbenchCaseStatus[] {
  if (raw === undefined || raw.length === 0) return [];
  const out: RecruiterWorkbenchCaseStatus[] = [];
  for (const part of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (
      part === 'OPEN' ||
      part === 'IN_PROGRESS' ||
      part === 'READY_TO_PLACE' ||
      part === 'CLOSED'
    ) {
      out.push(part);
    }
  }
  return out;
}

function parseOverdueFromQuery(value: string | string[] | undefined): boolean | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === undefined) return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null;
}

function parseSearchFromQuery(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === undefined) return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseSortFromQuery(value: string | string[] | undefined): Sort {
  const v = Array.isArray(value) ? value[0] : value;
  if (
    v === 'ageDesc' ||
    v === 'ageAsc' ||
    v === 'openedDesc' ||
    v === 'openedAsc'
  ) {
    return v;
  }
  return DEFAULT_SORT;
}

function parsePageSizeFromQuery(value: string | string[] | undefined): number {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === '20' || v === '50' || v === '100') return Number(v);
  return 20;
}

function parsePageFromQuery(value: string | string[] | undefined): number {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === undefined) return 1;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RecruiterWorkbenchPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  const session = await getServerSession();
  if (!session) {
    redirect('/auth/login?returnUrl=/admin/recruiter-workbench');
  }
  if (!ALLOWED_ROLES.has(session.role)) {
    return (
      <ForbiddenPanel reason={`Role '${session.role}' không thuộc allowlist ADMIN/HR_MANAGER/HR_STAFF`} />
    );
  }

  const rawSearchParams = await searchParams;
  const parsed = parseRecruiterWorkbenchQuery(rawSearchParams);
  if (!parsed.ok) {
    // RQ-21 / AC-01: explicit invalid → render validation panel, NEVER call service.
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-7 h-7" aria-hidden="true" />
            Recruiter Workbench
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Danh sách xử lý ứng viên cho recruiter (read-only).
          </p>
        </header>
        <InvalidQueryPanel issues={parsed.issues} />
      </div>
    );
  }

  // Apply role-based view default. The page is the only place that knows the role.
  const roleForFilter =
    session.role === 'ADMIN' || session.role === 'HR_MANAGER' || session.role === 'HR_STAFF'
      ? session.role
      : 'HR_STAFF'; // unreachable due to role gate above.
  const effectiveView = parsed.filter.view ?? defaultViewForRole(roleForFilter);

  // Authority check mirrors E0 route handler:
  //   HR_STAFF + ALL → forbidden
  //   HR_STAFF + UNASSIGNED → forbidden (page must not even attempt)
  if (roleForFilter === 'HR_STAFF' && (effectiveView === 'ALL' || effectiveView === 'UNASSIGNED')) {
    return (
      <ForbiddenPanel
        reason={`HR_STAFF không được phép dùng view=${effectiveView}; chỉ được dùng view=MINE.`}
      />
    );
  }

  // UNASSIGNED also needs CAN_VIEW_UNASSIGNED_POOL (mirror E0 RQ-06).
  let canViewUnassigned = true;
  if (effectiveView === 'UNASSIGNED') {
    const perms = await resolveEffectivePermissions({
      userId: session.userId,
      role: session.role,
    });
    canViewUnassigned = perms.has('CAN_VIEW_UNASSIGNED_POOL');
    if (!canViewUnassigned) {
      return (
        <ForbiddenPanel reason="Thiếu permission CAN_VIEW_UNASSIGNED_POOL để dùng view=UNASSIGNED." />
      );
    }
  }

  const finalFilter = { ...parsed.filter, view: effectiveView };

  // Call E0 service inside withDbContext for RLS.
  const prisma = getPrisma();
  let data;
  try {
    data = await withDbContext(prisma, session, async (tx) => {
      // Permissions mirror E0: pre-resolve the canSeeSensitive flag so the
      // service doesn't repeat the call. E0 has the same contract; we mirror
      // the public shape (`canSeeSensitive`) without importing its type.
      const perms = await resolveEffectivePermissions({
        userId: session.userId,
        role: session.role,
      });
      const canSeeSensitive = perms.has('CAN_VIEW_WORKER_SENSITIVE');
      return getRecruiterWorkbenchList(tx, session, finalFilter, { canSeeSensitive });
    });
  } catch (e) {
    // Catch the canonical 403 path; surface as forbidden panel instead of
    // a generic 500 page.
    if (e instanceof Error && e.message === 'PERMISSION_DENIED') {
      return (
        <ForbiddenPanel reason={e.message} />
      );
    }
    throw e;
  }

  // For URL-driven filter chip state, mirror parsed values back to the
  // client. These are intentionally independent of `finalFilter` so the
  // chips reflect the user-visible URL state (including `effectiveView`).
  const activeCaseStatuses: RecruiterWorkbenchCaseStatus[] = splitCaseStatuses(
    typeof rawSearchParams.caseStatus === 'string' ? rawSearchParams.caseStatus : undefined,
  );
  const activeView: View | null =
    typeof rawSearchParams.view === 'string'
      ? (rawSearchParams.view as View)
      : null;
  const activeOverdue = parseOverdueFromQuery(rawSearchParams.overdue);
  const activeSearch = parseSearchFromQuery(rawSearchParams.search);
  const activeSort = parseSortFromQuery(rawSearchParams.sort);
  const activePageSize = parsePageSizeFromQuery(rawSearchParams.pageSize);
  const activePage = parsePageFromQuery(rawSearchParams.page);

  const allowedViews = allowedViewsForRole(roleForFilter).filter(
    (v) => v !== 'UNASSIGNED' || canViewUnassigned,
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Briefcase className="w-7 h-7" aria-hidden="true" />
          Recruiter Workbench
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Danh sách xử lý ứng viên cho recruiter (read-only). Dữ liệu từ read-model P1-E0.
        </p>
      </header>

      <section
        aria-label="Bộ lọc"
        className="bg-white p-4 rounded-xl shadow-sm border border-slate-100"
      >
        <FilterChips
          activeCaseStatuses={activeCaseStatuses}
          activeView={activeView}
          activeOverdue={activeOverdue}
          activeSearch={activeSearch}
          allowedViews={allowedViews}
        />
        <div className="mt-4 pt-4 border-t border-slate-100">
          <SortDropdown activeSort={activeSort} />
        </div>
      </section>

      <RecruiterWorkbenchTable items={data.items} />

      <PaginationControls
        page={activePage}
        pageSize={activePageSize}
        total={data.total}
      />
    </div>
  );
}
