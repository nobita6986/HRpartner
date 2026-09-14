/**
 * normalize.ts — N1 intake writer (TASK hrp-v6-n1-intake-writer, DEC-02/03).
 *
 * Helper thuần (pure) để chuẩn hoá tín hiệu nhận dạng trước khi so khớp.
 *
 * Quy tắc (TIER0_HANDOVER.md §N1 + V6P-007A + DEC-02):
 *   - Phone VN: chỉ giữ chữ số; strip prefix `+84` hoặc `0` đầu; KHÔNG xử lý
 *     quốc tế ngoài VN (sẽ tách task khác khi cần).
 *   - FullName: lowercase + trim + collapse whitespace nhiều dấu cách về 1.
 *
 * Phone một mình KHÔNG chứng minh cùng người (DEC-02/RQ-03) — helper này chỉ
 * giúp chuẩn hoá input, KHÔNG tự merge.
 */

/**
 * Chuẩn hoá số điện thoại Việt Nam.
 *
 *   normalizePhone('+84 987 654 321') === '987654321'
 *   normalizePhone('0987654321')     === '987654321'
 *   normalizePhone('84 987 654 321') === '987654321'
 *   normalizePhone('')               === ''
 *   normalizePhone(null)             === ''
 *
 * KHÔNG throw; trả `''` khi input invalid để caller tự loại tín hiệu.
 */
export function normalizePhone(input: string | null | undefined): string {
  if (input == null) return '';
  const trimmed = String(input).trim();
  if (!trimmed) return '';
  // Chỉ giữ chữ số.
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  // Strip prefix quốc gia `84` hoặc `0` đầu (chỉ VN).
  if (digits.startsWith('84') && digits.length > 9) {
    return digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length > 1) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Chuẩn hoá họ tên.
 *
 *   normalizeFullName('  Nguyễn   Văn   A ') === 'nguyễn văn a'
 *   normalizeFullName('')                    === ''
 *   normalizeFullName('   ')                 === ''
 *   normalizeFullName(null)                  === ''
 */
export function normalizeFullName(input: string | null | undefined): string {
  if (input == null) return '';
  return String(input).trim().toLowerCase().replace(/\s+/g, ' ');
}
