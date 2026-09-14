/**
 * placement.errors.ts — N3 domain errors (DEC-05/06/07/08/09/12).
 *
 * Phân biệt rõ các loại lỗi để caller (UI/API) hiển thị thông điệp phù hợp.
 *
 * Quy ước:
 *   - Validation/contract lỗi → PlacementValidationError (400-class).
 *   - State machine lỗi → InvalidStateTransitionError (409-class).
 *   - Không tìm thấy row → PlacementNotFoundError (404-class).
 *   - Race/idempotency conflict → PlacementIdempotencyConflictError (409-class).
 */

/** Base — không instantiate trực tiếp. */
export abstract class PlacementError extends Error {
  abstract readonly code: string;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** Lỗi validation/contract: FK chain broken, ServiceModel NULL, evidence thiếu, v.v. */
export class PlacementValidationError extends PlacementError {
  readonly code = 'PLACEMENT_VALIDATION_ERROR';
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** Transition không hợp lệ theo state machine. */
export class InvalidStateTransitionError extends PlacementError {
  readonly code = 'INVALID_STATE_TRANSITION';
  constructor(
    message: string,
    public readonly from?: string,
    public readonly to?: string,
    public readonly reason?: string,
  ) {
    super(message);
  }
}

/** Không tìm thấy Placement theo id. */
export class PlacementNotFoundError extends PlacementError {
  readonly code = 'PLACEMENT_NOT_FOUND';
  constructor(public readonly placementId: string) {
    super(`Placement not found: ${placementId}`);
  }
}

/** Race/idempotency conflict — khi DB-level constraint bắt conflict và caller cần xử lý. */
export class PlacementIdempotencyConflictError extends PlacementError {
  readonly code = 'PLACEMENT_IDEMPOTENCY_CONFLICT';
  constructor(message: string, public readonly conflictingPlacementId?: string) {
    super(message);
  }
}
