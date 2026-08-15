/**
 * @hrp/money - BigInt VND helpers (HRP ADR-010)
 *
 * Source: src/shared/utils/money.ts (Phase 0 - moved without logic changes).
 * Re-exported for use as a workspace package via tsconfig paths alias `@hrp/money`.
 *
 * Quy tac:
 *   - Moi gia tri tien trong domain la BigInt, don vi dong nguyen (VND).
 *   - KHONG dung Number/float cho tien (sai so xu khi cong don).
 *   - Lam tron theo policy tai 1 noi duy nhat: roundHalfDownVnd().
 */
export {
  roundHalfDownVnd,
  addVnd,
  subVnd,
  mulRateVnd,
  minVnd,
  maxVnd,
  formatVnd,
  nonNegativeVnd,
} from '../../../src/shared/utils/money';
