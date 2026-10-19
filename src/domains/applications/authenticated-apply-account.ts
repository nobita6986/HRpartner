import { getPrisma } from '@/src/lib/db';
import type { AuthContext } from '@/src/shared/auth/auth-context';
import { withDbContext } from '@/src/shared/auth/with-db-context';

export function getAuthenticatedApplyAccount(ctx: AuthContext) {
  return withDbContext(getPrisma(), ctx, (tx) => tx.user.findUnique({
    where: { id: ctx.userId },
    select: { name: true, phone: true },
  }));
}
