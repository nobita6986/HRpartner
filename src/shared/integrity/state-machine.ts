/**
 * Generic state machine (Phase 3 / RQ-04 / DEC-04 / PHASE_KHOAHOC DoD).
 *
 * Compile-time safe: truyền union types S (status) và A (action) để TypeScript
 * phát hiện sai key. Ví dụ Ticket: TicketStatus & TicketAction.
 *
 * Throws IllegalTransitionError khi:
 *   - Không có transition cho (from, action) — vd PENDING → PAY (chỉ APPROVED mới PAY).
 *   - Role không thuộc allowedRoles.
 *   - EntityType không thuộc ticketTypes (vd APPROVE_FINAL không dùng cho OTHER).
 *
 * Route handler chuyển IllegalTransitionError thành HTTP 409:
 *   { error: 'ILLEGAL_TRANSITION', reason: '...' }
 *
 * Phase 3 dùng cho Ticket; helper sẵn sàng cho Statement/Timesheet/PayRun/WorkerAssignment/SourceClaim (Phase 4).
 */

export class IllegalTransitionError extends Error {
  constructor(
    public readonly code:
      | 'NO_SUCH_TRANSITION'
      | 'ROLE_NOT_ALLOWED'
      | 'TYPE_NOT_ALLOWED',
    message: string,
    public readonly context: {
      from: string;
      action: string;
      role?: string;
      allowedTypes?: readonly string[];
      actualType?: string;
    },
  ) {
    super(message);
    this.name = 'IllegalTransitionError';
  }
}

export interface TransitionDef<S extends string, R extends string = string> {
  to: S;
  allowedRoles: readonly R[];
  /** Một số action chỉ hợp lệ với loại entity cụ thể (vd ADVANCE_SALARY cho PAY). */
  ticketTypes?: readonly string[];
  /** Optional: ghi thêm thông tin cho audit log (vd fromAction). */
  meta?: Record<string, unknown>;
}

export type TransitionMap<S extends string, A extends string, R extends string = string> = {
  readonly [K in S]?: Readonly<Partial<Record<A, TransitionDef<S, R>>>>;
};

export interface GuardOptions<R extends string, T extends string = string> {
  /** Role actor (vd 'ADMIN', 'WORKER'). */
  actorRole: R;
  /** Optional: loại entity (vd 'ADVANCE_SALARY'). */
  entityType?: T;
}

/**
 * Guard: kiểm tra (from, action) có hợp lệ không.
 * Trả về `to` (status đích) nếu hợp lệ.
 * Throw IllegalTransitionError nếu không.
 */
export function guardTransition<
  S extends string,
  A extends string,
  R extends string = string,
  T extends string = string,
>(
  from: S,
  action: A,
  map: TransitionMap<S, A, R>,
  options: GuardOptions<R, T>,
): S {
  const fromMap = map[from];
  if (!fromMap) {
    throw new IllegalTransitionError(
      'NO_SUCH_TRANSITION',
      `Status "${from}" has no transitions defined`,
      { from, action, role: options.actorRole },
    );
  }

  const transition = fromMap[action];
  if (!transition) {
    throw new IllegalTransitionError(
      'NO_SUCH_TRANSITION',
      `Action "${action}" not allowed from status "${from}"`,
      { from, action, role: options.actorRole },
    );
  }

  if (!transition.allowedRoles.includes(options.actorRole)) {
    throw new IllegalTransitionError(
      'ROLE_NOT_ALLOWED',
      `Role "${options.actorRole}" cannot perform action "${action}" on status "${from}"`,
      { from, action, role: options.actorRole, allowedTypes: transition.allowedRoles as readonly string[] },
    );
  }

  if (transition.ticketTypes && options.entityType !== undefined) {
    if (!transition.ticketTypes.includes(options.entityType)) {
      throw new IllegalTransitionError(
        'TYPE_NOT_ALLOWED',
        `Action "${action}" only valid for types: ${transition.ticketTypes.join(', ')}`,
        {
          from,
          action,
          role: options.actorRole,
          allowedTypes: transition.ticketTypes,
          actualType: options.entityType,
        },
      );
    }
  }

  return transition.to;
}

/**
 * Trả về true nếu (from, action) hợp lệ — không throw.
 * Dùng cho UI ẩn nút không hợp lệ.
 */
export function canTransition<
  S extends string,
  A extends string,
  R extends string = string,
  T extends string = string,
>(
  from: S,
  action: A,
  map: TransitionMap<S, A, R>,
  options: GuardOptions<R, T>,
): boolean {
  try {
    guardTransition(from, action, map, options);
    return true;
  } catch {
    return false;
  }
}

/**
 * Liệt kê các action hợp lệ từ `from` theo role.
 * Dùng cho UI render action menu.
 */
export function allowedActions<
  S extends string,
  A extends string,
  R extends string = string,
  T extends string = string,
>(
  from: S,
  map: TransitionMap<S, A, R>,
  options: GuardOptions<R, T>,
): readonly A[] {
  const fromMap = map[from];
  if (!fromMap) return [];
  const result: A[] = [];
  for (const action of Object.keys(fromMap) as A[]) {
    if (canTransition(from, action, map, options)) {
      result.push(action);
    }
  }
  return result;
}
