/**
 * JWT helpers for the shared HRP identity boundary.
 *
 * jose HS256, secret từ ENV `JWT_SECRET` (>= 32 ký tự), exp 8h (DEC-02).
 * Edge-safe: chỉ import jose + process.env — middleware.ts chạy Edge runtime.
 * TUYỆT ĐỐI không nhận role/identity từ header tự khai (DEC-02, EV-03).
 */
import { SignJWT, jwtVerify } from 'jose';
import type { SystemRole } from '@prisma/client';

export const JWT_ALG = 'HS256' as const;
export const JWT_TTL_SECONDS = 8 * 60 * 60; // 8 giờ (DEC-02)

/**
 * Khớp enum SystemRole (prisma/schema.prisma:105-119) — giữ đồng bộ khi schema đổi.
 * Dùng để validate payload lúc verify (fail-closed, không nhận role lạ).
 */
const SYSTEM_ROLES: readonly string[] = [
  'ADMIN',
  'HR_MANAGER',
  'DIRECTOR',
  'HR_STAFF',
  'SALE',
  'PM',
  'ACCOUNTANT',
  'MKT',
  'VENDOR_ADMIN',
  'VENDOR_STAFF',
  'CTV',
  'WORKER',
  'EMPLOYEE',
] as const;

export interface AuthClaims {
  /** userId (User.id) */
  sub: string;
  /** SystemRole — không chứa PII trong token (TASK §4.3) */
  role: SystemRole;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET missing or shorter than 32 chars');
  }
  return new TextEncoder().encode(secret);
}

/** Sign JWT HS256: claims { sub: userId, role }, exp 8h. */
export async function signJwt(userId: string, role: SystemRole): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: JWT_ALG })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${JWT_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

/**
 * Verify JWT. Token giả mạo / sai chữ ký / hết hạn / payload thiếu sub|role → throw.
 * Middleware/route catch → 401 (fail-closed, không crash — RQ-03).
 */
export async function verifyJwt(token: string): Promise<AuthClaims> {
  const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: [JWT_ALG] });
  if (typeof payload.sub !== 'string' || payload.sub === '') {
    throw new Error('INVALID_JWT: missing sub');
  }
  if (typeof payload.role !== 'string' || !SYSTEM_ROLES.includes(payload.role)) {
    throw new Error('INVALID_JWT: missing or unknown role');
  }
  return { sub: payload.sub, role: payload.role as SystemRole };
}
