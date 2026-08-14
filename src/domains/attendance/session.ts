/**
 * Auth helper — trích session user từ Next.js Request.
 * Production sẽ thay bằng `getServerSession()` từ NextAuth với role từ Worker.user.role.
 *
 * Stub này giả định Bearer token là `userId:role` để test nhanh.
 *
 * ⚠️ STUB AUTH — CHỈ DÙNG CHO DEV/TEST (V4):
 * Role lấy từ header do CLIENT tự khai — KHÔNG được deploy production.
 * Trước khi deploy: thay bằng JWT thật — đăng nhập mật khẩu (ADR-007 V4.2) — getServerSession thật.
 */
import { NextRequest } from 'next/server';
import { TicketActorRole } from '@prisma/client';

export interface SessionUser {
  id: string;
  role: TicketActorRole;
  name?: string;
  ipAddress?: string;
  userAgent?: string;
}

const VALID_ROLES: TicketActorRole[] = [
  'WORKER',
  'HR_STAFF',
  'HR_MANAGER',
  'ACCOUNTANT',
  'PM',
  'ADMIN',
];

export function getSessionUser(req: NextRequest): SessionUser {
  const auth = req.headers.get('authorization') ?? '';

  // Format test: "Bearer <userId>:<role>:<name>"
  const token = auth.replace(/^Bearer\s+/i, '');
  const parts = token.split(':');

  const userId = parts[0] || 'unknown';
  const role = (parts[1] as TicketActorRole) || 'WORKER';
  const name = parts.slice(2).join(':') || `User ${userId}`;

  if (!VALID_ROLES.includes(role)) {
    throw new Response(
      JSON.stringify({ error: 'INVALID_ROLE', message: `Role ${role} not recognized` }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    );
  }

  return {
    id: userId,
    role,
    name,
    ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  };
}

export function getIdempotencyKey(req: NextRequest): string | undefined {
  return req.headers.get('x-idempotency-key') ?? undefined;
}
