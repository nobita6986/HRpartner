/**
 * identity-verification-ui.ts — Domain-owned dictionary for LaborProfile
 * identity verification (T1B Wave 1 Foundation).
 *
 * Binding per EP §3.2.10 (T0 §2 #16):
 *   VERIFIED   → Đã xác minh
 *   PENDING   → Đang chờ xác minh
 *   REJECTED  → Bị từ đối
 *   (other)   → KEEP_CANONICAL_IDENTIFIER (fallback to canonical enum string)
 *
 * Boundary rule:
 * - This file is owned by `src/domains/talent/`. It does NOT live in the
 *   shared cross-module glossary because it is domain enum-specific.
 * - It does NOT own identity-verification audit / authority / RLS / lifecycle —
 *   those live in the LaborProfile read-service.
 */

export const IDENTITY_VERIFICATION_LABELS: Readonly<Record<string, string>> = {
  VERIFIED: 'Đã xác minh',
  PENDING: 'Đang chờ xác minh',
  REJECTED: 'Bị từ chối',
};

/**
 * Lookup helper. Returns the binding Vietnamese label for an IdentityVerification
 * value. Falls back to the canonical enum value (KEEP_CANONICAL_IDENTIFIER) when
 * the value is not in the dictionary — see EP §3.6 / EP §3.2.10.
 */
export function identityVerificationLabel(value: string | null | undefined): string {
  if (!value) return '';
  return IDENTITY_VERIFICATION_LABELS[value] ?? value;
}

/** Tone helper for the presentation primitive — derived from the binding. */
export function identityVerificationTone(
  value: string | null | undefined,
): 'SUCCESS' | 'WARN' | 'NEUTRAL' {
  if (value === 'VERIFIED') return 'SUCCESS';
  if (value === 'PENDING') return 'WARN';
  return 'NEUTRAL';
}