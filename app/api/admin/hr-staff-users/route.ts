/**
 * GET /api/admin/hr-staff-users — Scoped HR_STAFF user listing.
 *
 * P1-A0.4 B-09 — Selectable recruiter dropdown source for the
 * RecruiterAssignmentManager UI. Returns ACTIVE HR_STAFF users with
 * human-readable identity (name, email when present). The owning caller
 * is ADMIN/HR_MANAGER (the same gate the assignment route enforces).
 *
 * Why a dedicated endpoint (vs the existing /api/admin/users):
 *   - /api/admin/users is ADMIN-only (B-09 requires HR_MANAGER too).
 *   - The manager UI needs a narrow, role-scoped, ACTIVE-only HR_STAFF
 *     list with NO phone/credential PII surfaced — broader than what
 *     /api/admin/users provides.
 *
 * Owner semantics:
 *   - ADMIN → full visibility (no extra filter).
 *   - HR_MANAGER → only HR_STAFF users on the same project set as the
 *     manager. The RLS predicate for HR_MANAGER / Project narrows the
 *     `users` join automatically via `app.user_id` GUC.
 *
 * Response shape: `{ users: HrStaffUser[] }`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withAuthorizedDb } from '@/src/shared/auth/with-authorized-db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_ROLES = new Set(['ADMIN', 'HR_MANAGER'] as const);

export interface HrStaffUserDto {
  id: string;
  name: string | null;
  phone: string | null;
  role: 'HR_STAFF';
  isActive: boolean;
}

export async function GET(req: NextRequest) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }

  if (!ALLOWED_ROLES.has(ctx.role as 'ADMIN' | 'HR_MANAGER')) {
    return NextResponse.json(
      {
        error: 'ROLE_NOT_PERMITTED',
        message: `Role ${ctx.role} cannot list HR_STAFF users.`,
      },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(req.url);
  const take = Math.min(parseInt(searchParams.get('take') ?? '100', 10), 200);

  const prisma = getPrisma();
  try {
    const rows = await withAuthorizedDb(prisma, ctx, async (tx) => {
      return tx.user.findMany({
        where: { role: 'HR_STAFF', isActive: true },
        select: { id: true, name: true, phone: true, role: true, isActive: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take,
      });
    });
    const users: HrStaffUserDto[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      role: 'HR_STAFF',
      isActive: r.isActive,
    }));
    return NextResponse.json({ users });
  } catch {
    // RQ-06 / AC-07: NEVER log raw DB error (SQL / model / scope leak risk).
    console.error('[api/admin/hr-staff-users] query failed');
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to query HR_STAFF users' }, { status: 500 });
  }
}