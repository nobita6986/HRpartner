/**
 * POST /api/admin/users/[id]/reactivate  — kích hoạt lại tài khoản (isActive=true).
 *
 * hrp-v6-admin-users-permissions (mirror /deactivate). Tách file để Next.js
 * App Router tạo route riêng và không cần phân biệt action trong handler.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SystemRole } from '@prisma/client';

import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  reactivateUser,
  UserManagementServiceError,
} from '@/src/domains/admin/user-management.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = new Set<SystemRole>([SystemRole.ADMIN]);

function mapServiceError(e: UserManagementServiceError): NextResponse {
  const status: Record<string, number> = {
    PERMISSION_DENIED: 403,
    NOT_FOUND: 404,
    PHONE_TAKEN: 409,
    LAST_ADMIN_PROTECTED: 409,
    SELF_DEMOTION_BLOCKED: 409,
    SELF_DEACTIVATION_BLOCKED: 409,
    SELF_MODIFICATION_BLOCKED: 409,
    NO_OP: 400,
  };
  return NextResponse.json(
    { error: e.code, message: e.message, ...(e.details ? { details: e.details } : {}) },
    { status: status[e.code] ?? 500 },
  );
}

export async function POST(
  req: NextRequest,
  ctxRoute: { params: Promise<{ id: string }> },
) {
  let ctx;
  try {
    ctx = await getAuthContext(req);
  } catch (e) {
    if (e instanceof AuthSessionError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to build auth context' }, { status: 500 });
  }
  if (!ADMIN_ROLES.has(ctx.role)) {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Only ADMIN can reactivate users.' },
      { status: 403 },
    );
  }

  const { id } = await ctxRoute.params;
  if (!id) {
    return NextResponse.json({ error: 'INVALID_ID', message: 'Missing user id' }, { status: 400 });
  }

  let reason: string | null = null;
  try {
    const text = await req.text();
    if (text) {
      const parsed = JSON.parse(text) as { reason?: unknown };
      if (typeof parsed.reason === 'string') reason = parsed.reason.slice(0, 500);
    }
  } catch {
    // ignore
  }

  try {
    const result = await withDbContext(getPrisma(), ctx, (tx) => reactivateUser(tx, ctx, id, reason));
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof UserManagementServiceError) return mapServiceError(e);
    console.error('[api/admin/users/[id]/reactivate] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to reactivate user' }, { status: 500 });
  }
}
