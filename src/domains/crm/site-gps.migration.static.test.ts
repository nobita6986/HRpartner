/**
 * site-gps.migration.static.test.ts — hrp-t1a-android-gps-project-site-config (AC-10).
 *
 * Static guard (filesystem đọc chính migration — không DB):
 *   - additive: CHỈ ADD COLUMN geo_confirmed_at / geo_confirmed_by_id + FK users
 *     ON DELETE SET NULL; KHÔNG backfill, KHÔNG INSERT/UPDATE/DELETE/GRANT;
 *   - idempotent (IF NOT EXISTS guard + DO block);
 *   - final assertion: 2 cột + FK SET NULL phải có, fail ⇒ RAISE EXCEPTION;
 *   - KHÔNG nằm trong prisma/migrations auto-run khác (file là migration thật
 *     ship-only; chú thích "NOT APPLIED TO PRODUCTION" bắt buộc).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATION = join(
  process.cwd(),
  'prisma',
  'migrations',
  '20261019010000_site_gps_confirmation',
  'migration.sql',
);

const sql = readFileSync(MIGRATION, 'utf8');

describe('migration 20261019010000_site_gps_confirmation (AC-10)', () => {
  it('ADD COLUMN geo_confirmed_at + geo_confirmed_by_id (nullable, idempotent guard)', () => {
    expect(sql).toMatch(/ADD COLUMN geo_confirmed_at TIMESTAMP\(3\)/);
    expect(sql).toMatch(/ADD COLUMN geo_confirmed_by_id TEXT/);
    expect(sql.match(/ADD COLUMN geo_confirmed_at/g)?.length).toBe(1);
    expect(sql.match(/ADD COLUMN geo_confirmed_by_id/g)?.length).toBe(1);
  });

  it('FK users ON DELETE SET NULL (audit actor identity không chặn xoá user)', () => {
    expect(sql).toContain('sites_geo_confirmed_by_id_fkey');
    expect(sql).toMatch(
      /FOREIGN KEY \(geo_confirmed_by_id\) REFERENCES users\(id\)\s+ON DELETE SET NULL ON UPDATE CASCADE/,
    );
  });

  it('forward-only: không INSERT/UPDATE/DELETE/GRANT/COPY (dữ liệu)', () => {
    expect(/(^|\n)\s*(INSERT|UPDATE|DELETE|GRANT|COPY)\b/i.test(sql)).toBe(false);
  });

  it('final assertion: 2 cột + FK SET NULL; fail ⇒ RAISE EXCEPTION rollback', () => {
    expect(sql).toContain('site_gps_confirmation assertion failed');
    const assertBlock = sql.split('SECTION 2')[1] ?? '';
    expect(assertBlock).toContain('geo_confirmed_at');
    expect(assertBlock).toContain('geo_confirmed_by_id');
    expect(assertBlock).toMatch(/ON DELETE SET NULL%/);
    expect(assertBlock).toContain('RAISE EXCEPTION');
  });

  it('idempotent: IF NOT EXISTS guards (nhất định không tạo trùng khi chạy lại)', () => {
    expect(sql).toContain('IF NOT EXISTS');
    expect(sql).toContain('NOT APPLIED TO PRODUCTION');
  });

  it('schema Site có marker fields (Prisma mirror) + relation User nullable', () => {
    const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8');
    expect(schema).toContain('geoConfirmedAt   DateTime? @map("geo_confirmed_at")');
    expect(schema).toContain('geoConfirmedById String?   @map("geo_confirmed_by_id")');
    expect(schema).toMatch(/geoConfirmedBy User\? @relation\("SiteGeoConfirmedBy", fields: \[geoConfirmedById\], references: \[id\], onDelete: SetNull\)/);
  });
});
