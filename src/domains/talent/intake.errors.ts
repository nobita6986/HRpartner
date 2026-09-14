/**
 * intake.errors.ts — N1 intake writer domain errors.
 *
 * Domain errors cho intake pipeline (TASK hrp-v6-n1-intake-writer).
 * `IdempotencyConflictError` đã được export từ `src/shared/integrity/idempotency.ts`;
 * re-import đây để caller chỉ cần một import point.
 */
export { IdempotencyConflictError } from '@/src/shared/integrity/idempotency';

/** Lỗi validation input intake. Caller map 400 INVALID_INPUT. */
export class IntakeValidationError extends Error {
  constructor(
    public readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = 'IntakeValidationError';
  }
}

/** Lỗi khi cố set identity fields của một profile đã tồn tại (out of scope phase này). */
export class IdentityFieldsImmutableError extends Error {
  constructor(profileId: string) {
    super(`Identity fields of LaborProfile ${profileId} are immutable via intake writer`);
    this.name = 'IdentityFieldsImmutableError';
  }
}

/** Lỗi khi actor cố declare partnerRef không hợp lệ. */
export class InvalidPartnerRefError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPartnerRefError';
  }
}
