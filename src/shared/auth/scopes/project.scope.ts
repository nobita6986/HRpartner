/**
 * scopes/project.scope.ts — Phase 2 / RQ-04 / DEC-05/06
 *
 * Project (OutsourcingProject) scope builder theo visibility matrix §5.3.
 */
import { Prisma } from '@prisma/client';
import { AuthScopeError } from '../with-auth-scope';
import type { AuthContext } from '../auth-context';

export function buildProjectScope(ctx: AuthContext): Prisma.ProjectWhereInput {
  switch (ctx.role) {
    case 'ADMIN':
    case 'HR_MANAGER':
    case 'DIRECTOR':
    case 'SALE':
      return {};

    case 'PM':
      return { pmUserId: ctx.userId };

    case 'WORKER':
      return {
        OR: [
          { isPublic: true },
          {
            assignments: {
              some: {
                status: 'ACTIVE',
                worker: { accountUserId: ctx.userId },
              },
            },
          },
        ],
      };

    case 'MKT':
      return { isPublic: true };

    case 'VENDOR_ADMIN':
    case 'VENDOR_STAFF': {
      if (!ctx.vendorId) {
        throw new AuthScopeError('DENY_BY_DEFAULT', 'VENDOR role thiếu vendorId', {
          userId: ctx.userId,
          role: ctx.role,
        });
      }
      return {
        OR: [
          { isPublic: true },
          { submissions: { some: { vendorId: ctx.vendorId } } },
        ],
      };
    }

    case 'CTV':
      return { isPublic: true };

    case 'HR_STAFF':
    case 'ACCOUNTANT':
    case 'EMPLOYEE':
    default:
      // HR_STAFF/ACCOUNTANT có thể đọc project list (audit) — Phase 2 cho qua
      // nhưng row scope phải qua L2 RLS. Phase 3 sẽ narrow.
      if (ctx.role === 'HR_STAFF' || ctx.role === 'ACCOUNTANT') {
        return {};
      }
      throw new AuthScopeError('DENY_BY_DEFAULT', `Role ${ctx.role} không có scope đọc Project`, {
        userId: ctx.userId,
        role: ctx.role,
      });
  }
}