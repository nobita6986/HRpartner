/**
 * public-read-guc.static.test.ts — V5-go-live-04 / RQ-03, RQ-07 / STEP-06 / AC-03.
 *
 * Detector tĩnh đọc cây nguồn THẬT. Chốt đúng cơ chế đã lọt qua mọi gate trước đó:
 * một đường đọc vô danh gọi `prisma.$transaction` trần thì không GUC nào được set,
 * `hrp_project_visible_for` so sánh với NULL, và 3 bảng FORCE RLS trả 0 dòng — im lặng,
 * không lỗi, gate vẫn xanh.
 *
 * Ba đường dẫn viết CỨNG (DEC-08 + RISK-07): thêm một call site vô danh mới thì phải
 * sửa test này một cách có ý thức, không thể vô tình bỏ sót.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = process.cwd();
const HELPER = 'src/shared/auth/with-public-db.ts';
/** Toàn bộ đường đọc DB vô danh của repo — kiểm kê §4.2 task go-live-04. */
const PUBLIC_READ_CALL_SITES = [
  'app/api/jobs/route.ts',
  'app/api/jobs/[slug]/route.ts',
  'app/job-board/page.tsx',
];

const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
/** Bỏ comment: detector không được để chú thích "đánh lừa". */
const strip = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('public read path — GUC principal (RQ-03/RQ-04/RQ-05)', () => {
  it('cả BA call site vô danh không còn $transaction trần', () => {
    for (const file of PUBLIC_READ_CALL_SITES) {
      const code = strip(read(file));
      expect(code, file).not.toContain('$transaction');
      expect(code, file).not.toMatch(/prisma\.(project|staffingOrder|staffingOrderSlot)\./);
    }
  });

  it('cả BA call site đều đi qua đúng helper công khai', () => {
    for (const file of PUBLIC_READ_CALL_SITES) {
      const code = strip(read(file));
      expect(code, file).toContain("from '@/src/shared/auth/with-public-db'");
      expect(code, file).toContain('withPublicDb(');
    }
  });

  it("helper đặt role 'MKT' và KHÔNG chứa 'ADMIN' (DEC-02)", () => {
    const code = strip(read(HELPER));
    expect(code).toContain("'MKT'");
    expect(code).not.toContain('ADMIN');
    expect(code).toContain('applyRlsContext');
    expect(code).toMatch(/system:/);
  });

  it('helper có marker read-only transaction-local (DEC-03)', () => {
    const code = strip(read(HELPER));
    expect(code).toContain('transaction_read_only');
    expect(code).toMatch(/set_config\('\$\{PUBLIC_READ_ONLY_GUC\}',\s*'on',\s*true\)/);
    // CẤM nuốt lỗi thành danh sách rỗng — helper không được có catch nào.
    expect(code).not.toMatch(/\bcatch\b/);
  });

  it('không có set_config lẻ ngoài helper trên ba call site (DEC-08)', () => {
    for (const file of PUBLIC_READ_CALL_SITES) {
      const code = strip(read(file));
      expect(code, file).not.toContain('set_config');
      expect(code, file).not.toContain('applyRlsContext');
    }
  });
});
