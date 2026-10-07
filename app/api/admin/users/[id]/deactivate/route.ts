/**
 * POST /api/admin/users/[id]/deactivate — vô hiệu hóa tài khoản (isActive=false).
 *
 * hrp-v6-admin-users-permissions:
 *   - Bảo vệ admin cuối cùng (LAST_ADMIN_PROTECTED 409).
 *   - Chống tự vô hiệu hóa (SELF_DEACTIVATION_BLOCKED 409).
 *
 * Auth: ADMIN only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SystemRole } from '@prisma/client';

import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { z } from 'zod';
import {
  deactivateUser,
  isUserMutationSerializationConflict,
  UserManagementServiceError,
  withSerializableUserManagementDb,
} from '@/src/domains/admin/user-management.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = new Set<SystemRole>([SystemRole.ADMIN]);
const ReasonSchema = z.object({ reason: z.string().trim().min(1, 'Lý do thao tác là bắt buộc').max(500) });

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
    VALIDATION: 400,
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
      { error: 'FORBIDDEN', message: 'Only ADMIN can deactivate users.' },
      { status: 403 },
    );
  }

  const { id } = await ctxRoute.params;
  if (!id) {
    return NextResponse.json({ error: 'INVALID_ID', message: 'Missing user id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON hợp lệ' }, { status: 400 });
  }
  const parsed = ReasonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Lý do thao tác là bắt buộc.', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await withSerializableUserManagementDb(getPrisma(), ctx, (tx) => deactivateUser(tx, ctx, id, parsed.data.reason));
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof UserManagementServiceError) return mapServiceError(e);
    if (isUserMutationSerializationConflict(e)) {
      return NextResponse.json({ error: 'CONCURRENT_MODIFICATION', message: 'Dữ liệu người dùng vừa thay đổi; vui lòng tải lại và thử lại.' }, { status: 409 });
    }
    console.error('[api/admin/users/[id]/deactivate] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to deactivate user' }, { status: 500 });
  }
}
