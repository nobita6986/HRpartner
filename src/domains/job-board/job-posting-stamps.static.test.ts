/**
 * job-posting-stamps.static.test.ts — hrp-p1-a0-1 / RQ-09 / DEC-01 / DEC-04.
 *
 * Fence tĩnh đọc file migration `prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql`
 * và đảm bảo nó thuộc dạng add-only (T0 §2 "Storage"):
 *   - Chỉ `ALTER TABLE ... ADD COLUMN` cho `is_hot` + `is_urgent` trên `job_postings`.
 *   - NOT NULL DEFAULT false.
 *   - KHÔNG DROP, KHÔNG RENAME, KHÔNG backfill từ bất kỳ cột nào khác.
 *   - KHÔNG có DML (UPDATE/INSERT/DELETE) — chỉ DDL.
 *
 * Không đọc một `DATABASE_URL` nào (`EV-09`); đây là static guard chạy ở lane unit, giữ
 * gate `prisma validate` ở lane integration.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const MIGRATION_PATH = 'prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql';

describe('hrp-p1-a0-1 — JobPosting stamp migration fence', () => {
  const sql = readFileSync(join(process.cwd(), MIGRATION_PATH), 'utf8');

  it('migration file tồn tại và là forward-only DDL', () => {
    expect(sql.length).toBeGreaterThan(0);
    // Bỏ SQL comments trước khi quét (giữ line numbers cho diagnostic).
    const stripped = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(stripped).not.toMatch(/\bDROP\s+/i);
    expect(stripped).not.toMatch(/\bRENAME\s+/i);
    // Không cho DML (UPDATE/INSERT/DELETE) — chỉ ADD COLUMN.
    expect(stripped).not.toMatch(/\bUPDATE\s+/i);
    expect(stripped).not.toMatch(/\bINSERT\s+INTO/i);
    expect(stripped).not.toMatch(/\bDELETE\s+FROM/i);
  });

  it('chỉ ADD COLUMN `is_hot` và `is_urgent` cho bảng `job_postings`', () => {
    expect(sql.toLowerCase()).toContain('alter table "job_postings"');
    expect(sql.toLowerCase()).toContain('add column "is_hot" boolean not null default false');
    expect(sql.toLowerCase()).toContain('add column "is_urgent" boolean not null default false');
    // Không ADD cột nào khác ngoài hai cột này.
    const addColumnMatches = sql.match(/add column/gi) ?? [];
    expect(addColumnMatches.length).toBe(2);
  });

  it('KHÔNG có backfill heuristic từ Project / urgency / salary / postedAt / hash', () => {
    // Bỏ SQL comments trước khi quét (giữ line numbers cho diagnostic).
    const stripped = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').toLowerCase();
    // Từ khoá backfill có thể bị detector bắt.
    expect(stripped).not.toContain('update');
    expect(stripped).not.toContain('case');
    expect(stripped).not.toContain('when ');
    expect(stripped).not.toContain('coalesce');
    expect(stripped).not.toContain('md5');
    expect(stripped).not.toContain('hash');
  });
});
