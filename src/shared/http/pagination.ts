/**
 * pagination.ts — shared HTTP pagination utilities.
 *
 * Tiêu chí (theo Tier 0 directive 13/09/2026 11:03):
 *  - Tái sử dụng cùng logic clamp ở nhiều layer (client + API route + service).
 *  - KHÔNG throw — fallback về default nếu input NaN/âm/0/vượt max
 *    (giảm thiểu 500 do malformed query string).
 *  - Number nguyên dương có giới hạn: clamp về [1, max], 0 → default, âm → default,
 *    NaN/Infinity → default.
 */

/** Clamp về số nguyên dương có giới hạn.
 *
 * Quy tắc (fail-safe):
 *  - `undefined` | `null` | `NaN` | `Infinity` -> `opts.default`
 *  - Số ≤ 0 (kể cả 0 và âm) -> `opts.default`
 *  - Số > `opts.max` -> `opts.max`
 *  - Số dương hợp lệ -> `Math.trunc(value)` (bỏ phần thập phân)
 */
export function clampPositiveInt(
  value: number | undefined,
  opts: { default: number; max: number },
): number {
  if (value === undefined || value === null) return opts.default;
  if (!Number.isFinite(value)) return opts.default;
  const truncated = Math.trunc(value);
  if (truncated <= 0) return opts.default;
  return Math.min(opts.max, truncated);
}

/**
 * Parse + clamp pagination từ URLSearchParams.
 *
 * Lưu ý:
 *  - `?take=abc` -> `parseInt` trả NaN → `Number.isFinite(NaN)` false → fallback default.
 *  - `?take=` (chuỗi rỗng) -> `parseInt('')` trả NaN -> fallback default.
 *  - `?take=` bị bỏ -> undefined -> fallback default.
 *  - `?take=-5` -> `parseInt('-5')` = -5 → bị clampPositiveInt đẩy về default.
 *
 * @returns `{ take, skip }` đã clamp về khoảng hợp lệ.
 */
export interface PaginationDefaults {
  defaultTake: number;
  maxTake: number;
  defaultSkip?: number;
  maxSkip?: number;
}

export function parsePaginationFromUrl(
  searchParams: URLSearchParams,
  defaults: PaginationDefaults,
): { take: number; skip: number } {
  const rawTake = Number(searchParams.get('take'));
  const take = clampPositiveInt(
    Number.isFinite(rawTake) ? rawTake : undefined,
    { default: defaults.defaultTake, max: defaults.maxTake },
  );

  const rawSkip = Number(searchParams.get('skip'));
  const skip = clampPositiveInt(
    Number.isFinite(rawSkip) ? rawSkip : undefined,
    {
      default: defaults.defaultSkip ?? 0,
      max: defaults.maxSkip ?? 1_000_000,
    },
  );

  return { take, skip };
}
