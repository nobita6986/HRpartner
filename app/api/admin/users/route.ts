/**
 * GET  /api/admin/users          — list users (ADMIN only)
 * POST /api/admin/users          — create user (ADMIN only)
 *
 * hrp-v6-admin-users-permissions:
 *   - GET: read-only list, mirror existing behavior.
 *   - POST: tạo tài khoản với mật khẩu tạm 16-char base64url (chỉ trả 1 lần).
 *     Bọc `withIdempotency` (TTL 24h) để chống retry tạo trùng; route truyền
 *     `sanitizeResponseForStorage` để strip `temporaryPassword` trước khi lưu
 *     vào `idempotency_keys.response` — retry trả về body KHÔNG có password.
 *
 * Auth: ADMIN only.
 * Errors:
 *   401 — missing/invalid auth.
 *   403 — non-ADMIN.
 *   400 — validation.
 *   409 — PHONE_TAKEN, IDEMPOTENCY_CONFLICT.
 *   201 — created.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SystemRole } from '@prisma/client';

import { getPrisma } from '@/src/lib/db';
import { AuthSessionError, getAuthContext } from '@/src/shared/auth/auth-context';
import { withAuthorizedDb } from '@/src/shared/auth/with-authorized-db';
import { withDbContext } from '@/src/shared/auth/with-db-context';
import {
  IdempotencyConflictError,
  withIdempotency,
} from '@/src/shared/integrity/idempotency';
import { z } from 'zod';
import {
  createUser,
  UserManagementServiceError,
  type CreateUserInput,
} from '@/src/domains/admin/user-management.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ADMIN_ROLES = new Set<SystemRole>([SystemRole.ADMIN]);

const ROUTE_KEY = 'POST:/api/admin/users';

const CreateUserSchema = z.object({
  name: z.string().min(1, 'Tên không được để trống').max(200, 'Tên quá dài'),
  phone: z
    .string()
    .min(8, 'Số điện thoại quá ngắn')
    .max(20, 'Số điện thoại quá dài')
    .regex(/^[0-9+\-()\s]+$/, 'Số điện thoại chỉ chứa chữ số và ký tự + - ( ) khoảng trắng'),
  role: z.nativeEnum(SystemRole, { errorMap: () => ({ message: 'Vai trò không hợp lệ' }) }),
  vendorId: z.string().min(1).nullable().optional(),
  reason: z.string().max(500).nullable().optional(),
});

function getIdempotencyKey(req: NextRequest): string | undefined {
  const k = req.headers.get('idempotency-key') ?? req.headers.get('x-idempotency-key');
  return k?.trim() || undefined;
}

function bigintSafe<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));
}

/** Map service error → HTTP response theo DEC-04. */
function mapServiceError(e: UserManagementServiceError): NextResponse {
  const status =
    e.code === 'PHONE_TAKEN'
      ? 409
      : e.code === 'PERMISSION_DENIED'
        ? 403
        : e.code === 'NOT_FOUND'
          ? 404
          : e.code === 'NO_OP'
            ? 400
            : 500;
  return NextResponse.json(
    { error: e.code, message: e.message, ...(e.details ? { details: e.details } : {}) },
    { status },
  );
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

  if (!ADMIN_ROLES.has(ctx.role)) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Only ADMIN can view all users.' }, { status: 403 });
  }

  const prisma = getPrisma();
  const { searchParams } = new URL(req.url);
  const take = Math.min(parseInt(searchParams.get('take') ?? '50', 10), 200);
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);
  const isActive = searchParams.get('isActive');
  const role = searchParams.get('role') ?? undefined;
  const search = searchParams.get('search') ?? undefined;

  const where: Record<string, unknown> = {};
  if (isActive !== undefined && isActive !== '') where.isActive = isActive === 'true';
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [rows, total] = await withAuthorizedDb(prisma, ctx, async (tx) => {
      return Promise.all([
        tx.user.findMany({
          where,
          select: { id: true, name: true, phone: true, role: true, vendorId: true, isActive: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
        tx.user.count({ where }),
      ]);
    });
    return NextResponse.json({ users: rows, total, take, skip });
  } catch {
    console.error('[api/admin/users GET] query failed');
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to query users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Only ADMIN can create users.' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY', message: 'Body phải là JSON hợp lệ' }, { status: 400 });
  }

  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }
  const input: CreateUserInput = {
    name: parsed.data.name,
    phone: parsed.data.phone,
    role: parsed.data.role,
    vendorId: parsed.data.vendorId ?? null,
    reason: parsed.data.reason ?? null,
  };

  const idempotencyKey = getIdempotencyKey(req);
  const prisma = getPrisma();

  // Không có idempotency key → chạy trực tiếp, response vẫn bao gồm password.
  if (!idempotencyKey) {
    try {
      const result = await withDbContext(prisma, ctx, (tx) => createUser(tx, ctx, input));
      return NextResponse.json(bigintSafe(result), { status: 201 });
    } catch (e) {
      if (e instanceof UserManagementServiceError) return mapServiceError(e);
      console.error('[api/admin/users POST] error:', e);
      return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create user' }, { status: 500 });
    }
  }

  // Có idempotency key → bọc. Sanitize `temporaryPassword` trước khi lưu cache.
  try {
    const outcome = await withIdempotency({
      prisma,
      route: ROUTE_KEY,
      actorId: ctx.userId,
      key: idempotencyKey,
      requestBody: { name: input.name, phone: input.phone, role: input.role },
      handler: async () => {
        const result = await withDbContext(prisma, ctx, (tx) => createUser(tx, ctx, input));
        return { body: result, statusCode: 201 };
      },
      // SECURITY (PHASE_KHOAHOC DoD): mật khẩu tạm chỉ hiển thị 1 lần ở response đầu
      // tiên; trước khi lưu vào `idempotency_keys.response` phải strip `temporaryPassword`.
      // Retry (replay) sẽ trả về body đã sanitize — KHÔNG leak secret qua cache.
      sanitizeResponseForStorage: (body) => {
        const b = (body ?? {}) as Record<string, unknown>;
        const { temporaryPassword: _drop, ...rest } = b;
        return rest;
      },
    });
    return NextResponse.json(bigintSafe({ ...(outcome.body as Record<string, unknown>), replayed: outcome.replayed }), {
      status: outcome.statusCode,
    });
  } catch (e) {
    if (e instanceof IdempotencyConflictError) {
      return NextResponse.json(
        { error: 'IDEMPOTENCY_CONFLICT', message: e.message },
        { status: 409 },
      );
    }
    if (e instanceof UserManagementServiceError) return mapServiceError(e);
    console.error('[api/admin/users POST idempotency] error:', e);
    return NextResponse.json({ error: 'INTERNAL', message: 'Failed to create user' }, { status: 500 });
  }
}
