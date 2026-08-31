/**
 * public-select.static.test.ts — hotfix-02 / RQ-03 / STEP-03 / AC-03.
 *
 * Lớp lỗi mà file này canh nằm trong QUERY ENGINE của Prisma, không nằm trong mã JS của ta:
 * select một quan hệ BẮT BUỘC (`@relation` không dấu hỏi) trên bảng mà principal công khai
 * `MKT` không đọc được thì `findMany` ném
 *   `Inconsistent query result: Field clientCompany is required to return data, got null instead`
 * TRƯỚC khi mapper `toDto` chạy. Vì vậy optional-chaining trong mapper là vô hiệu, và
 * `vi.fn().mockResolvedValue([...])` trên `findMany` KHÔNG BAO GIỜ tái lập được sự cố
 * (hotfix-01: 1418 test xanh song song với 500 cứng trên production — EV-07).
 *
 * Hàng rào duy nhất chạy được ở lane unit là đọc chính cây nguồn. Detector này cố tình
 * dùng allowlist khoá: thêm BẤT KỲ khoá nào vào `publicSelect` cũng phải sửa file này một
 * cách có ý thức, không thể vô tình kéo lại một bảng bị RLS che.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const SERVICE = 'src/domains/job-board/public.service.ts';
/** Bỏ comment để chú thích không đổi được kết luận của detector theo cả hai chiều. */
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const code = strip(readFileSync(join(process.cwd(), SERVICE), 'utf8'));

/** Khối khai báo `publicSelect`: từ `const publicSelect` tới declaration top-level kế tiếp. */
function publicSelectBlock(): string {
  const start = code.indexOf('const publicSelect');
  expect(start, `${SERVICE}: không tìm thấy khai báo publicSelect`).toBeGreaterThanOrEqual(0);
  const end = code.indexOf('export async function', start);
  expect(end, `${SERVICE}: không tìm thấy điểm kết thúc khối publicSelect`).toBeGreaterThan(start);
  return code.slice(start, end);
}

/** Khoá ở mức ngoài cùng của object literal trong `publicSelect`, bỏ qua mọi nhánh lồng. */
function topLevelSelectKeys(block: string): string[] {
  const body = block.slice(block.indexOf('({') + 2);
  const keys: string[] = [];
  let depth = 0;
  let token = '';
  for (const ch of body) {
    if (ch === '{' || ch === '[' || ch === '(') { depth += 1; token = ''; continue; }
    if (ch === '}' || ch === ']' || ch === ')') { if (depth === 0) break; depth -= 1; token = ''; continue; }
    if (depth > 0) continue;
    if (ch === ':') { const key = token.trim(); if (key) keys.push(key); token = ''; continue; }
    if (ch === ',') { token = ''; continue; }
    token += ch;
  }
  return keys.sort();
}

describe('public job projection — không select quan hệ bắt buộc bị RLS che (RQ-03)', () => {
  it('khối publicSelect không chứa khoá quan hệ clientCompany', () => {
    expect(publicSelectBlock()).not.toContain('clientCompany');
  });

  it('publicSelect chỉ gồm scalar của Project cộng đúng một quan hệ staffingOrders', () => {
    expect(topLevelSelectKeys(publicSelectBlock())).toEqual([
      'code', 'id', 'name', 'siteAddress', 'staffingOrders',
    ]);
  });

  it('toDto không deref quan hệ khách hàng, industry suy từ text với fallback null', () => {
    expect(code).not.toContain('clientCompany');
    expect(code).toContain('inferIndustry(searchableText, null)');
  });
});
