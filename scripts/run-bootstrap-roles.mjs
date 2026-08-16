/**
 * scripts/run-bootstrap-roles.mjs (STEP-01 — one-time setup, NOT a Prisma migration)
 *
 * Idempotent role bootstrap cho Neon DB dev theo DEC-09 A:
 *   - app_user_writer: web runtime HRP (Next.js). KHÔNG superuser/BYPASSRLS/owner; không member hrp_etl.
 *   - app_user: read-only web (audit). Tạo sẵn cho Phase 3+.
 *   - hrp_etl: appBCC ETL — chỉ portal_timesheets + public.USAGE.
 *
 * Yêu cầu: connecting user phải có quyền CREATE ROLE.
 * Đọc password từ env (đặt trong .env): PIPE_ROLE_WRITER_PASSWORD, PIPE_ROLE_READER_PASSWORD,
 * PIPE_ROLE_ETL_PASSWORD.
 *
 * Sau khi chạy xong:
 *   - Verify role separation bằng scripts/verify-role-separation.mjs
 *   - Update .env: DATABASE_URL=...app_user_writer...; APPBCC_DATABASE_URL=...hrp_etl...
 *
 * KHÔNG xoá file này — cần re-run khi reset DB dev.
 */
import { PrismaClient } from '@prisma/client';

const adminPrisma = new PrismaClient();

const WRITER_PASSWORD = process.env.PIPE_ROLE_WRITER_PASSWORD;
const READER_PASSWORD = process.env.PIPE_ROLE_READER_PASSWORD;
const ETL_PASSWORD = process.env.PIPE_ROLE_ETL_PASSWORD;

if (!WRITER_PASSWORD || !READER_PASSWORD || !ETL_PASSWORD) {
  console.error('FAIL: missing one of PIPE_ROLE_*_PASSWORD env vars');
  process.exit(1);
}

const out = (k, v) => console.log(`${k}=${v}`);

try {
  // 1. Tạo role app_user_writer (NOLOGIN=false — cần login từ xa)
  //    NOSUPERUSER + NOBYPASSRLS + NOCREATEDB + NOCREATEROLE + NOREPLICATION
  await adminPrisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user_writer') THEN
        CREATE ROLE app_user_writer
          WITH LOGIN PASSWORD '${WRITER_PASSWORD}'
          NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
      ELSE
        ALTER ROLE app_user_writer WITH LOGIN PASSWORD '${WRITER_PASSWORD}';
      END IF;
    END$$;
  `);
  out('ROLE_CREATED', 'app_user_writer');

  await adminPrisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user
          WITH LOGIN PASSWORD '${READER_PASSWORD}'
          NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
      ELSE
        ALTER ROLE app_user WITH LOGIN PASSWORD '${READER_PASSWORD}';
      END IF;
    END$$;
  `);
  out('ROLE_CREATED', 'app_user');

  await adminPrisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hrp_etl') THEN
        CREATE ROLE hrp_etl
          WITH LOGIN PASSWORD '${ETL_PASSWORD}'
          NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
      ELSE
        ALTER ROLE hrp_etl WITH LOGIN PASSWORD '${ETL_PASSWORD}';
      END IF;
    END$$;
  `);
  out('ROLE_CREATED', 'hrp_etl');

  // 2. Schema-level grants (USAGE)
  await adminPrisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO app_user_writer, app_user, hrp_etl`);
  out('GRANT_SCHEMA', 'public.usage');

  // 3. app_user_writer: full DML on Phase 2 tables (Phase 2 RLS sẽ scope row visibility).
  //    Cấp grants cho TẤT CẢ bảng public (kể cả portal_timesheets để app runtime vẫn hoạt động).
  //    Quyền gì: SELECT, INSERT, UPDATE, DELETE — KHÔNG TRUNCATE, KHÔNG DROP, KHÔNG CREATE.
  await adminPrisma.$executeRawUnsafe(`
    GRANT SELECT, INSERT, UPDATE, DELETE
    ON ALL TABLES IN SCHEMA public
    TO app_user_writer
  `);
  await adminPrisma.$executeRawUnsafe(`
    GRANT USAGE, SELECT
    ON ALL SEQUENCES IN SCHEMA public
    TO app_user_writer
  `);
  // Default privileges cho tables tạo sau (idempotent)
  await adminPrisma.$executeRawUnsafe(`
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user_writer
  `);
  await adminPrisma.$executeRawUnsafe(`
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO app_user_writer
  `);
  out('GRANT_DML', 'app_user_writer ON ALL TABLES');

  // 4. app_user: read-only — SELECT only
  await adminPrisma.$executeRawUnsafe(`
    GRANT SELECT
    ON ALL TABLES IN SCHEMA public
    TO app_user
  `);
  await adminPrisma.$executeRawUnsafe(`
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO app_user
  `);
  out('GRANT_DML', 'app_user SELECT ONLY');

  // 5. hrp_etl: CHỈ portal_timesheets (theo EV-03 + DEC-09 A)
  //    + USAGE schema public (cần cho SELECT).
  await adminPrisma.$executeRawUnsafe(`
    GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE portal_timesheets
    TO hrp_etl
  `);
  out('GRANT_ETL', 'hrp_etl ON portal_timesheets');

  // 6. Verify memberships — app_user_writer KHÔNG được member hrp_etl (DEC-09 A cấm)
  const verify = await adminPrisma.$queryRawUnsafe(`
    SELECT
      (SELECT rolbypassrls FROM pg_roles WHERE rolname='app_user_writer') AS writer_bypass,
      (SELECT rolbypassrls FROM pg_roles WHERE rolname='app_user') AS reader_bypass,
      (SELECT rolbypassrls FROM pg_roles WHERE rolname='hrp_etl') AS etl_bypass,
      (SELECT 1 FROM pg_auth_members m JOIN pg_roles r1 ON r1.oid=m.roleid JOIN pg_roles r2 ON r2.oid=m.member
        WHERE r1.rolname='app_user_writer' AND r2.rolname='hrp_etl') AS writer_member_etl
  `);
  out('VERIFY_WRITER_BYPASSRLS', verify[0].writer_bypass);
  out('VERIFY_READER_BYPASSRLS', verify[0].reader_bypass);
  out('VERIFY_ETL_BYPASSRLS', verify[0].etl_bypass);
  out('VERIFY_WRITER_NOT_MEMBER_ETL', verify[0].writer_member_etl === null ? 'PASS' : 'FAIL');

  if (verify[0].writer_bypass !== false || verify[0].reader_bypass !== false || verify[0].etl_bypass !== false) {
    throw new Error('BYPASSRLS verification failed — một role vẫn có BYPASSRLS=true');
  }
  if (verify[0].writer_member_etl !== null) {
    throw new Error('app_user_writer is member of hrp_etl — phạm DEC-09 A cấm');
  }

  console.log('BOOTSTRAP_OK');
} catch (e) {
  console.error('BOOTSTRAP_ERR', String(e.message || e).split('\n').slice(0, 3).join(' | '));
  process.exit(1);
} finally {
  await adminPrisma.$disconnect();
}