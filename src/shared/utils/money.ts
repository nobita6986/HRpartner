/**
 * Money utility — BigInt VND nguyên (ADR-010)
 *
 * Quy tắc bất biến:
 *   - Mọi giá trị tiền trong domain là BigInt, đơn vị đồng nguyên (VND).
 *   - KHÔNG dùng Number/float cho tiền (sai số xu khi cộng dồn).
 *   - Làm tròn theo policy tại 1 nơi duy nhất: roundHalfDownVnd().
 *
 * Quy ước decimal cho hours/qty vẫn dùng Prisma.Decimal — KHÔNG convert sang Number.
 */

/**
 * Làm tròn tiền VND theo NĐ 123/2020 (làm tròn xuống đồng).
 * Ví dụ: 1500.4 → 1500 ; 1500.6 → 1501 (banker's rounding).
 *
 * Input có thể là BigInt | number | string (chuỗi decimal).
 * Output: BigInt.
 */
export function roundHalfDownVnd(value: bigint | number | string): bigint {
  if (typeof value === 'bigint') return value;

  // Parse string/number → BigInt bằng cách nhân với 100 (2 chữ số thập phân),
  // rồi chia + làm tròn xuống.
  // Ví dụ: "1500.49" → 150049n → /100n = 1500n
  const s = typeof value === 'number' ? value.toString() : value;
  const negative = s.startsWith('-');
  const abs = negative ? s.slice(1) : s;
  const [intPart, fracPart = ''] = abs.split('.');

  // Pad fraction tới 2 chữ số
  const frac2 = (fracPart + '00').slice(0, 2);
  const totalCents = BigInt(intPart) * 100n + BigInt(frac2);

  // Làm tròn xuống (floor) — policy HRP cho tiền phải trả NLĐ
  const rounded = totalCents / 100n;

  return negative ? -rounded : rounded;
}

/**
 * Cộng 2 BigInt an toàn. Ném lỗi nếu tràn (gần như không xảy ra với VND).
 */
export function addVnd(a: bigint, b: bigint): bigint {
  return a + b;
}

/**
 * Trừ 2 BigInt an toàn.
 */
export function subVnd(a: bigint, b: bigint): bigint {
  return a - b;
}

/**
 * Nhân BigInt với hệ số decimal (Prisma.Decimal trả về string).
 * Ví dụ: 10_000_000n × "0.08" → 800_000n (BHXH 8%).
 *
 * Quy tắc: rate là chuỗi decimal (vd "0.08", "1.5", "0.005"),
 * KHÔNG dùng float để tránh sai số.
 */
export function mulRateVnd(amount: bigint, rate: string): bigint {
  // Tách phần nguyên và phần thập phân của rate (tối đa 6 chữ số sau dấu .)
  const negative = rate.startsWith('-');
  const abs = negative ? rate.slice(1) : rate;
  const [intPart, fracPart = ''] = abs.split('.');

  if (fracPart.length > 6) {
    throw new Error(`rate precision > 6 decimals not supported: ${rate}`);
  }

  // Nhân rate thành BigInt nguyên (scale = 10^fracLen)
  const scale = 10n ** BigInt(fracPart.length);
  const rateBig = BigInt(intPart) * scale + BigInt((fracPart + '0'.repeat(fracPart.length)).slice(0, fracPart.length));

  // amount * rateBig / scale → kết quả BigInt
  const result = (amount * rateBig) / scale;
  return negative ? -result : result;
}

/**
 * Min(BigInt, BigInt) — BigInt không có Math.min native.
 */
export function minVnd(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

/**
 * Max(BigInt, BigInt)
 */
export function maxVnd(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

/**
 * Chuyển BigInt sang chuỗi hiển thị VND có dấu phân cách hàng nghìn.
 * Ví dụ: 1500000n → "1.500.000"
 */
export function formatVnd(amount: bigint): string {
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const s = abs.toString();
  const padded = s.padStart(3, '0');
  const groups = [padded.slice(-3)];
  for (let i = padded.length - 3; i > 0; i -= 3) {
    groups.unshift(padded.slice(Math.max(0, i - 3), i));
  }
  return (negative ? '-' : '') + groups.join('.');
}

/**
 * Đảm bảo BigInt >= 0; trả về 0n nếu âm.
 */
export function nonNegativeVnd(amount: bigint): bigint {
  return amount < 0n ? 0n : amount;
}
