/**
 * scopes/worker-portal.scope.ts — V5-M1-06b / RQ-02 / DEC-08
 *
 * L1 scope builder cho 3 model mà worker-portal + attendance đọc qua boundary
 * canonical (`withAuthorizedDb`): Ticket, AttendanceEvent, Site. Mirror đúng
 * ma trận RLS M13 (`20260821103500_m13_restore_rls_matrix`) để L1 ⊆ L2:
 *
 *  - tickets  USING: root OR hrp_worker_visible_for(worker_id)
 *  - attendance_events USING: ADMIN/HR_MANAGER/HR_STAFF OR PM(project) OR WORKER(own)
 *  - sites    USING: hrp_project_visible_for(project_id)
 *
 * Deny-by-default: role không khai báo scope → throw AuthScopeError (fail-closed),
 * đồng bộ style với worker/project/ctv scope. Root (ADMIN/HR_MANAGER/DIRECTOR)
 * passthrough ở L1 nên nhánh root chỉ để tài liệu hoá (không reach runtime).
 */
import { Prisma } from '@prisma/client';
import { AuthScopeError } from '../with-auth-scope';
import type { AuthContext } from '../auth-context';
import { buildWorkerScope } from './worker.scope';
import { buildProjectScope } from './project.scope';

/**
 * Ticket scope — WORKER chỉ thấy ticket của chính mình; role có visibility Worker
 * (HR_STAFF/SALE/PM/VENDOR/CTV) thấy ticket của worker trong tầm nhìn (reuse
 * buildWorkerScope qua relation `worker`). Còn lại DENY_BY_DEFAULT.
 */
export function buildTicketScope(ctx: AuthContext): Prisma.TicketWhereInput {
  switch (ctx.role) {
    case 'ADMIN':
    case 'HR_MANAGER':
    case 'DIRECTOR':
      return {};

    case 'WORKER':
      return { workerId: ctx.workerId ?? '__no_worker_ctx__' };

    case 'HR_STAFF':
    case 'SALE':
    case 'PM':
    case 'VENDOR_ADMIN':
    case 'VENDOR_STAFF':
    case 'CTV':
      // Ticket visible ⇔ worker của ticket visible với role hiện tại.
      return { worker: buildWorkerScope(ctx) };

    default:
      throw new AuthScopeError('DENY_BY_DEFAULT', `Role ${ctx.role} không có scope đọc Ticket`, {
        userId: ctx.userId,
        role: ctx.role,
      });
  }
}

/**
 * AttendanceEvent scope — WORKER chỉ thấy attendance của chính mình
 * (`workerId = ctx.workerId`, server-derived). HR_STAFF full (RLS USING cho phép),
 * PM theo project. Còn lại DENY_BY_DEFAULT.
 *
 * Lưu ý: đây là builder cho READ. INSERT attendance KHÔNG đi L1/L2-worker vì RLS
 * WITH CHECK loại WORKER — xem `with-system-db.ts` (check-in write hẹp, elevated).
 */
export function buildAttendanceEventScope(ctx: AuthContext): Prisma.AttendanceEventWhereInput {
  switch (ctx.role) {
    case 'ADMIN':
    case 'HR_MANAGER':
    case 'DIRECTOR':
    case 'HR_STAFF':
      return {};

    case 'WORKER':
      return { workerId: ctx.workerId ?? '__no_worker_ctx__' };

    case 'PM':
      return { project: buildProjectScope(ctx) };

    default:
      throw new AuthScopeError(
        'DENY_BY_DEFAULT',
        `Role ${ctx.role} không có scope đọc AttendanceEvent`,
        { userId: ctx.userId, role: ctx.role },
      );
  }
}

/**
 * Site scope — visibility đi theo project (`hrp_project_visible_for`). Dùng lại
 * buildProjectScope qua relation `project`. WORKER thấy site của project public
 * hoặc project có assignment ACTIVE của mình; geofence read còn AND thêm điều kiện
 * assignment ACTIVE ở callsite (DEC-04 — không quét toàn bộ Site).
 */
export function buildSiteScope(ctx: AuthContext): Prisma.SiteWhereInput {
  switch (ctx.role) {
    case 'ADMIN':
    case 'HR_MANAGER':
    case 'DIRECTOR':
    case 'SALE':
    case 'HR_STAFF':
      return {};

    case 'PM':
    case 'WORKER':
    case 'MKT':
    case 'VENDOR_ADMIN':
    case 'VENDOR_STAFF':
    case 'CTV':
      return { project: buildProjectScope(ctx) };

    default:
      throw new AuthScopeError('DENY_BY_DEFAULT', `Role ${ctx.role} không có scope đọc Site`, {
        userId: ctx.userId,
        role: ctx.role,
      });
  }
}
