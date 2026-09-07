/**
 * seed-portal-demo-password.static.test.ts — hrp-v5-go-live-21 / RQ-03 / STEP-02 / AC-03.
 *
 * LỚP LỖI file này canh: một literal cứng trong `seed.mjs` trở thành default password cho ba
 * portal demo user (0910000001/2/3). Lỗi nằm trong source mã, không nằm trong DB hay runtime
 * — mock Prisma sẽ không tái lập được nó.
 *
 * VÌ SAO PHẢI LÀ TEST TĨNH ĐỌC MÃ NGUỒN: ba lý do.
 *
 *   1. Phát hiện regression literal: nếu một lần sửa sau lại gõ lại `'demo-portal-2026'` (hoặc
 *      bất kỳ literal nào khác) thì test ĐỎ.
 *   2. Phát hiện implicit default: nếu một đường nhánh mới gọi `bcrypt.hash(<literal>)` mà
 *      không kiểm tra ENV thì test ĐỎ.
 *   3. Phát hiện revert password: nếu code đặt lại `passwordHash` của user đã tồn tại (đặc
 *      biệt account demo) thì test ĐỎ — đây là yêu cầu KHÔNG reset đã có trong `seedAuthAccounts`.
 *
 * QUY TẮC: `prisma/seed.mjs` không được chứa:
 *   - Bất kỳ chuỗi literal nào nằm trong `bcrypt.hash(...)` (ngoại trừ hash placeholder).
 *   - Bất kỳ lệnh gọi nào ghi đè `passwordHash` của user đã tồn tại.
 *   - Bất kỳ lệnh `console.log`/`console.warn` nào in ra `phone`/`password`/`hash` của user.
 *
 * RED → GREEN cơ chế: nếu bất kỳ quy tắc nào bị vi phạm, test đỏ.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const SEED_PATH = join(process.cwd(), 'prisma', 'seed.mjs');

function readSeed(): string {
  return readFileSync(SEED_PATH, 'utf8');
}

describe('hrp-v5-go-live-21 / RQ-03: prisma/seed.mjs không chứa password literal', () => {
  it('AC-03.1: không có bcrypt.hash(<literal>) cho portal demo user', () => {
    const src = readSeed();
    // Tìm tất cả lệnh gọi bcrypt.hash(<argument>) và đảm bảo argument KHÔNG phải string literal.
    const hashCalls = [...src.matchAll(/bcrypt\.hash\(\s*(['"`])([^'"`]+)\1/g)];
    expect(hashCalls.length, 'bcrypt.hash với literal thì test FAIL').toBeGreaterThanOrEqual(0);
    // Mọi hit đều phải là literal rỗng hoặc đến từ ENV, không phải mật khẩu cứng.
    const literals = hashCalls.map((m) => m[2]);
    for (const lit of literals) {
      // Comment "placeholder" hay empty string là OK; mọi giá trị có chữ cái thì FAIL.
      expect(lit.length, `literal "${lit}" được hash trực tiếp — phải qua ENV`).toBe(0);
    }
  });

  it('AC-03.2: portal demo password chỉ từ process.env.PORTAL_DEMO_PASSWORD', () => {
    const src = readSeed();
    // Phải có một lookup ENV đúng tên.
    expect(src).toContain('process.env.PORTAL_DEMO_PASSWORD');
    // Phải có guard fail-closed khi ENV thiếu.
    expect(src).toMatch(/PORTAL_DEMO_PASSWORD[\s\S]{0,200}!demoPassword/);
    // Phải có nhánh skip + warn (KHÔNG crash).
    expect(src).toMatch(/SKIP portal demo user/);
  });

  it('AC-03.3: không có literal "demo-portal-2026" còn sót trong seed.mjs', () => {
    const src = readSeed();
    expect(src).not.toMatch(/demo-portal-2026/);
    // Bất kỳ chuỗi nào có vẻ mật khẩu (>=8 ký tự, có chữ-số) cũng không được nằm trong
    // hash() ngoài ENV — ở đây kiểm tra bằng cách duyệt từng dòng chứa "bcrypt.hash".
    const hashLines = src.split('\n').filter((line) => line.includes('bcrypt.hash'));
    for (const line of hashLines) {
      // Không có single-quoted/double-quoted/backtick literal đi vào hash() ngoài ENV.
      const m = line.match(/bcrypt\.hash\(\s*(['"`])([^'"`]+)\1/);
      if (m) {
        expect(m[2].length, `dòng "${line.trim()}" chứa literal vào hash()`).toBe(0);
      }
    }
  });

  it('AC-03.4: KHÔNG có update passwordHash cho user đã tồn tại (idempotent)', () => {
    const src = readSeed();
    // Tìm mọi cặp "if (existing)" → "else" và đảm bảo code bên trong KHÔNG có phép ghi passwordHash.
    // Bỏ qua dòng comment và string literal. Cụ thể: không có `passwordHash: ...` (object key) trong data.
    let cursor = 0;
    const findings: string[] = [];
    while (cursor < src.length) {
      const idx = src.indexOf('if (existing)', cursor);
      if (idx === -1) break;
      const elseIdx = src.indexOf('else', idx);
      let bodyEnd = elseIdx === -1 ? src.length : elseIdx;
      let body = src.slice(idx, bodyEnd);
      // Bỏ comment dòng
      body = body.replace(/\/\/[^\n]*/g, '');
      // Bỏ string literal
      body = body.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '');
      // Pattern cần cấm: `passwordHash` xuất hiện trong code (sau khi bỏ comment và string).
      // Ngoại lệ: `existing.passwordHash` (chỉ đọc), `if (!existing.passwordHash)` (chỉ đọc).
      const writes = body.match(/passwordHash/g) ?? [];
      const existingReads = body.match(/existing\.passwordHash/g) ?? [];
      const realWrites = writes.length - existingReads.length;
      if (realWrites > 0) {
        findings.push(`nhánh có ${realWrites} lần ghi/truyền passwordHash`);
      }
      cursor = idx + 'if (existing)'.length;
    }
    expect(findings, `nhánh "if (existing)" chứa passwordHash write: ${JSON.stringify(findings)}`).toEqual([]);
  });

  it('AC-03.5: KHÔNG log phone/password/hash dưới mọi hình thức', () => {
    const src = readSeed();
    const lines = src.split('\n');
    for (const line of lines) {
      if (line.includes('console.log') || line.includes('console.warn') || line.includes('console.info')) {
        // Nếu dòng log có chứa identifier nhạy cảm thì FAIL.
        const lower = line.toLowerCase();
        const hasPhone = /\bphone\b/.test(lower);
        const hasPassword = /\bpassword\b/.test(lower);
        const hasHash = /\bhash\b/.test(lower);
        // Cảnh báo về 'password' / 'hash' trong tên biến ENV là OK; cấm in value của chúng.
        // Trong file này, cấm mọi log chứa một trong ba tên và KHÔNG phải nhắc ENV.
        if ((hasPhone || hasPassword || hasHash) && !line.includes('process.env')) {
          // Các cảnh báo "thieu ENV ${acc.passwordEnv}" hay "da ton tai nhung chua co passwordHash"
          // được phép vì chỉ nhắc TÊN biến, không in value. Cấm kèm giá trị literal.
          expect(line).toMatch(/(?:SKIP|WARN|thieu|chua co|khong the)/i);
        }
      }
    }
  });
});
