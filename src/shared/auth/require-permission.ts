/**
 * Require Permission Helper — Phase 1 identity-core (RQ-05, DEC-05).
 *
 * Helper check quyền:
 *  - Throw AuthError('PERMISSION_DENIED') nếu thiếu → caller map 403 { reason: 'thiếu <CODE>' }.
 *  - Có log structured (consola.warn — KHÔNG log token/secret).
 *  - KHÔNG nhận role tự khai (chỉ AuthContext từ JWT).
 */
import { AuthError, hasPermission } from './permission-resolver';
export { AuthError } from './permission-resolver';
import type { AuthContext } from './auth-context';
import type { PermissionCode } from './permission-catalog';

/**
 * Throw AuthError('PERMISSION_DENIED') nếu user không có quyền code.
 * Trả AuthContext khi pass (cho fluent chain).
 */
export async function requirePermission(
  ctx: AuthContext,
  code: PermissionCode,
): Promise<AuthContext> {
  const ok = await hasPermission({ userId: ctx.userId, role: ctx.role }, code);
  if (!ok) {
    // Audit log structured — không in role/secret
    console.warn(
      JSON.stringify({
        evt: 'permission_denied',
        userId: ctx.userId,
        role: ctx.role,
        requiredCode: code,
      }),
    );
    throw new AuthError(
      'PERMISSION_DENIED',
      `thiếu ${code}`,
      { userId: ctx.userId, requiredCode: code },
    );
  }
  return ctx;
}

/**
 * Require ANY of multiple codes (OR).
 */
export async function requireAnyPermission(
  ctx: AuthContext,
  codes: readonly PermissionCode[],
): Promise<AuthContext> {
  for (const code of codes) {
    if (await hasPermission({ userId: ctx.userId, role: ctx.role }, code)) {
      return ctx;
    }
  }
  console.warn(
    JSON.stringify({
      evt: 'permission_denied_any',
      userId: ctx.userId,
      role: ctx.role,
      requiredCodes: codes,
    }),
  );
  throw new AuthError(
    'PERMISSION_DENIED',
    `thiếu 1 trong: ${codes.join(', ')}`,
    { userId: ctx.userId, requiredCodes: codes },
  );
}

/**
 * Map AuthError → HTTP 403 với reason tiếng Việt.
 * Dùng trong route handler.
 */
export function toForbiddenResponse(err: AuthError): {
  status: 403;
  body: { error: 'FORBIDDEN'; reason: string };
} {
  return {
    status: 403,
    body: { error: 'FORBIDDEN', reason: err.message },
  };
}
