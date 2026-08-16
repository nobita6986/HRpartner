/**
 * scripts/verify-role-separation.mjs (STEP-01 verify)
 * Đọc-only verify: runtime user (DATABASE_URL) = app_user_writer, không BYPASSRLS,
 * không member hrp_etl, đọc được workers/projects (RLS chưa enable).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const out = (k, v) => console.log(`${k}=${v}`);

try {
  // 1. Current user (phải là app_user_writer, không phải owner)
  const session = await prisma.$queryRawUnsafe(`SELECT current_user AS u, session_user AS s`);
  out('CURRENT_USER', session[0].u);
  out('SESSION_USER', session[0].s);

  // 2. Memberships
  const member = await prisma.$queryRawUnsafe(`
    SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole
    FROM pg_roles WHERE rolname = current_user
  `);
  if (member.length === 0) throw new Error('current_user không tồn tại trong pg_roles');
  out('ROLE_SUPER', member[0].rolsuper);
  out('ROLE_BYPASSRLS', member[0].rolbypassrls);
  out('ROLE_CREATEDB', member[0].rolcreatedb);

  // 3. Có member hrp_etl không (phải NULL theo DEC-09 A)
  const memberEtl = await prisma.$queryRawUnsafe(`
    SELECT 1 FROM pg_auth_members m
    JOIN pg_roles r1 ON r1.oid = m.roleid
    JOIN pg_roles r2 ON r2.oid = m.member
    WHERE r1.rolname = 'hrp_etl' AND r2.rolname = current_user
  `);
  out('IS_MEMBER_HRP_ETL', memberEtl.length > 0 ? 'YES_FAIL' : 'NO_PASS');

  // 4. Counts (RLS chưa bật → phải thấy hết)
  const w = await prisma.worker.count();
  const p = await prisma.outsourcingProject.count();
  out('WORKERS_VISIBLE', w);
  out('PROJECTS_VISIBLE', p);

  // 5. CREATE ROLE → phải FAIL (app_user_writer không có quyền này)
  try {
    await prisma.$executeRawUnsafe('CREATE ROLE __probe__ NOLOGIN');
    out('CREATE_ROLE_TEST', 'FAIL — writer được phép CREATE ROLE!');
    await prisma.$executeRawUnsafe('DROP ROLE __probe__');
    process.exit(1);
  } catch (e) {
    out('CREATE_ROLE_TEST', 'BLOCKED_OK');
  }

  // PASS criteria
  const pass =
    member[0].rolsuper === false &&
    member[0].rolbypassrls === false &&
    member[0].rolcreatedb === false &&
    memberEtl.length === 0 &&
    w > 0 &&
    p > 0;
  out('VERIFY_RESULT', pass ? 'PASS' : 'FAIL');
} catch (e) {
  console.error('VERIFY_ERR', String(e.message || e).split('\n').slice(0, 3).join(' | '));
  process.exit(1);
} finally {
  await prisma.$disconnect();
}