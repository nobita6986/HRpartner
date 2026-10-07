/**
 * GET   /api/admin/users/[id]  — read user + grants (ADMIN only)
 * PATCH /api/admin/users/[id]  — update user (ADMIN only)
 *
 * hrp-v6-admin-users-permissions:
 *   - GET: trả về user public + grants (service `getUserWithGrants`).
 *   - PATCH: cập nhật name/phone/role/vendorId/isActive. Bảo vệ Admin cuối cùng
 *     + self-modification (SELF_DEMOTION_BLOCKED, SELF_DEACTIVATION_BLOCKED,
 *     SELF_MODIFICATION_BLOCKED, LAST_ADMIN_PROTECTED) — đã enforce ở service.
 *
 * Idempotency: PATCH không bọc `withIdempotency` (PATCH idempotent tự nhiên
 * cho cùng payload — service detect NO_OP). Nếu sau này cần bọc, dùng cùng
 * pattern như POST.
 *
 * Auth: ADMIN only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SystemRole } from '@prisma/client';

import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  getUserWithGrants,
  updateUser,
  UserManagementServiceError,
  type UpdateUserInput,
} from '@/src/domains/admin/user-management.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = new Set<SystemRole>([SystemRole.ADMIN]);

const UpdateUserSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    phone: z
      .string()
      .min(8)
      .max(20)
      .regex(/^[0-9+\-()\s]+$/)
      .optional(),
    role: z.nativeEnum(SystemRole).optional(),
    vendorId: z.string().min(1).nullable().optional(),
    isActive: z.boolean().optional(),
    reason: z.string().max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Phải có ít nhất một trường để cập nhật',
  });

function mapServiceError(e: UserManagementServiceError): NextResponse {
  // DEC-04: 4 self-mod + last-admin + NO_OP + NOT_FOUND.
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

export async function GET(
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
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Only ADMIN can view users.' }, { status: 403 });
  }

  const { id } = await ctxRoute.params;
  if (!id) {
    return NextResponse.json({ error: 'INVALID_ID', message: 'Missing user id' }, { status: 400 });
  }

  try {
    const result = await withDbContext(getPrisma(), ctx, (tx) => getUserWithGrants(tx, ctx, id));
    if (!result) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Không tìm thấy người dùng.' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof UserManagementServiceError) return mapServiceError(e);
    console.error('[api/admin/users/[id] GET] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to load user' }, { status: 500 });
  }
}

export async function PATCH(
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
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Only ADMIN can update users.' }, { status: 403 });
  }

  const { id } = await ctxRoute.params;
  if (!id) {
    return NextResponse.json({ error: 'INVALID_ID', message: 'Missing user id' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON hợp lệ' }, { status: 400 });
  }

  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input: UpdateUserInput = {
    name: parsed.data.name,
    phone: parsed.data.phone,
    role: parsed.data.role,
    vendorId: parsed.data.vendorId,
    isActive: parsed.data.isActive,
    reason: parsed.data.reason,
  };

  try {
    const result = await withDbContext(getPrisma(), ctx, (tx) => updateUser(tx, ctx, id, input));
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof UserManagementServiceError) return mapServiceError(e);
    console.error('[api/admin/users/[id] PATCH] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to update user' }, { status: 500 });
  }
}
