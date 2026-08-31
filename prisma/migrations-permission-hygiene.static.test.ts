/**
 * migrations-permission-hygiene.static.test.ts — go-live-11 / RQ-06 / STEP-02 / AC-06.
 *
 * LỚP LỖI file này canh: idiom nâng-rồi-hạ membership khi chuyển quyền sở hữu hàm
 * SECURITY DEFINER. PostgreSQL 16 đòi role đang chạy migration phải là thành viên của
 * role đích trong đúng khoảnh khắc `ALTER ... OWNER TO`, nên hai migration MP-2 nâng
 * membership lên rồi hạ xuống bằng `WITH SET FALSE`. Nhưng `WITH SET FALSE` chỉ tắt
 * khả năng `SET ROLE` — nó KHÔNG xoá membership. Quyền tồn dư ở lại im lặng: không
 * lỗi, không log, không test nào đỏ.
 *
 * VÌ SAO PHẢI LÀ TEST TĨNH ĐỌC MÃ NGUỒN: lớp lỗi này nằm trong catalog quyền của
 * PostgreSQL, không nằm trong mã JS. Mock `prisma.$queryRaw` không bao giờ tái lập
 * được nó (bài học hotfix-02 `DEC-06` và go-live-03 `FUP-04`: 1400+ test xanh song
 * song với defect thật ở lớp DB). Hàng rào chạy được ở lane unit là đọc chính các file
 * migration bằng filesystem thật.
 *
 * QUY TẮC: file migration nào dùng `WITH SET FALSE` thì phải thu hồi membership của
 * chính role đó trong cùng file. Hai ngoại lệ có tên nằm trong `APPLIED_BEFORE_RULE`
 * — chúng đã áp lên `hrp-live` và lịch sử migration là append-only (DEC-02), nên
 * chúng được đóng bằng migration của task này chứ không bằng cách sửa file cũ.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const MIGRATIONS_ROOT = join(process.cwd(), 'prisma', 'migrations');

/**
 * DEC-06 — allowlist có tên, kèm lý do. Chỉ đúng hai file đã áp lên live trước khi
 * quy tắc này tồn tại. Thêm tên mới vào đây là hành động có ý thức, phải giải trình.
 */
const APPLIED_BEFORE_RULE: Record<string, string> = {
  '20260823101500_mp2_apply_tracking': '�� �p l�n live 23/08, du?c d�ng bang migration 20260831160000_public_rpc_residual_grant_revoke c?a go-live-11',
  '20260831103000_marketplace_search_tracking_profile': '�� �p l�n live 31/08, du?c d�ng bang migration 20260831160000_public_rpc_residual_grant_revoke c?a go-live-11',
};

interface MigrationFile {
  /** Tên thư mục migration — đúng định danh mà Prisma và người vận hành dùng. */
  dir: string;
  relPath: string;
  /** SQL đã bỏ comment: chú thích không được tạo ra hay che đi vi phạm. */
  sql: string;
}

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');

/** Đi đệ quy để khớp đúng nghĩa `prisma/migrations/**\/migration.sql` của RQ-06. */
function collectMigrations(root: string, dirName = ''): MigrationFile[] {
  const found: MigrationFile[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectMigrations(full, entry.name));
    } else if (entry.name === 'migration.sql') {
      found.push({
        dir: dirName,
        relPath: `prisma/migrations/${dirName}/migration.sql`,
        sql: stripComments(readFileSync(full, 'utf8')),
      });
    }
  }
  return found;
}

const migrations = collectMigrations(MIGRATIONS_ROOT);

/** Tên role bị nâng membership trên mỗi dòng có `WITH SET FALSE`. */
function rolesLoweredWithSetFalse(sql: string): string[] {
  const roles = new Set<string>();
  for (const line of sql.split(/\r?\n/)) {
    if (!/WITH SET FALSE/i.test(line)) continue;
    const m = /GRANT\s+"?([A-Za-z_][A-Za-z0-9_$]*)"?\s+TO\b/i.exec(line);
    roles.add(m ? m[1] : '<không xác định được tên role>');
  }
  return [...roles];
}

describe('migration permission hygiene — quét được cây migration thật (RQ-06)', () => {
  it('có ít nhất một file migration.sql được đọc từ filesystem', () => {
    expect(migrations.length).toBeGreaterThan(0);
    expect(migrations.every(m => m.sql.length > 0 && m.dir.length > 0)).toBe(true);
  });
});

describe('migration permission hygiene — WITH SET FALSE phải kèm REVOKE (RQ-06)', () => {
  it('không file migration nào nâng membership rồi bỏ lại quyền tồn dư', () => {
    const violations: string[] = [];
    for (const m of migrations) {
      for (const role of rolesLoweredWithSetFalse(m.sql)) {
        if (m.dir in APPLIED_BEFORE_RULE) continue;
        const revoked = new RegExp(`REVOKE\\s+"?${role}"?\\s+FROM`, 'i').test(m.sql);
        if (!revoked) violations.push(`${m.dir} (role ${role})`);
      }
    }
    expect(
      violations,
      `Migration dùng 'WITH SET FALSE' mà không thu hồi membership trong cùng file: ` +
        `${violations.join(', ')}. 'WITH SET FALSE' chỉ tắt SET ROLE, membership vẫn còn ` +
        `và vẫn kéo theo đặc quyền. Thêm REVOKE vào cùng file, hoặc — nếu file đã áp lên ` +
        `live — ghi tên nó vào APPLIED_BEFORE_RULE kèm lý do.`,
    ).toEqual([]);
  });
});

describe('migration permission hygiene — allowlist không được mục ruỗng (DEC-06)', () => {
  it('mọi tên trong allowlist đều còn tồn tại trong cây migration', () => {
    const known = new Set(migrations.map(m => m.dir));
    const stale = Object.keys(APPLIED_BEFORE_RULE).filter(dir => !known.has(dir));
    expect(stale, `Allowlist trỏ tới migration không còn tồn tại: ${stale.join(', ')}`).toEqual([]);
  });

  it('mọi mục allowlist đều ghi lý do, không để chuỗi rỗng', () => {
    const unexplained = Object.entries(APPLIED_BEFORE_RULE)
      .filter(([, reason]) => reason.trim().length < 10)
      .map(([dir]) => dir);
    expect(unexplained, `Mục allowlist thiếu lý do: ${unexplained.join(', ')}`).toEqual([]);
  });
});
