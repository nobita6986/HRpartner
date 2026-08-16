/**
 * scripts/inspect-identity-preflight.mjs (TEMPORARY - STEP-01)
 * Read-only khảo sát:
 *   1. Duplicate portal_timesheets theo (employee_code, project, period_month, period_year)
 *   2. State bảng Permission / RolePermission / UserPermissionGrant
 *   3. Tất cả file app/ đang import getSessionUser
 * Output masked (không in phone/password/secret).
 */
import { PrismaClient } from '@prisma/client';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const prisma = new PrismaClient();

function maskCount(n) {
  return n;
}

try {
  // 1. Duplicate portal_timesheets theo khoá §10
  // Prisma không hỗ trợ HAVING trên groupBy trực tiếp — dùng raw SQL aggregate.
  const dupRaw = await prisma.$queryRawUnsafe(`
    SELECT employee_code, project, period_month, period_year, COUNT(*)::int AS n
    FROM portal_timesheets
    GROUP BY employee_code, project, period_month, period_year
    HAVING COUNT(*) > 1
    ORDER BY n DESC
  `);
  const dupTail = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int AS total_dup
    FROM (
      SELECT 1 FROM portal_timesheets
      GROUP BY employee_code, project, period_month, period_year
      HAVING COUNT(*) > 1
    ) s
  `);
  const totalDupRows = dupRaw.reduce((sum, g) => sum + Number(g.n), 0);
  console.log(`STEP01_DUP_GROUPS=${dupRaw.length}`);
  console.log(`STEP01_DUP_ROWS_TOTAL=${totalDupRows}`);
  if (dupRaw.length > 0) {
    console.log('STEP01_DUP_SAMPLE (first 5 groups masked):');
    for (const g of dupRaw.slice(0, 5)) {
      const ec = String(g.employee_code).length >= 4 ? `${String(g.employee_code).substring(0, 3)}***` : '(short)';
      const proj = String(g.project).length >= 4 ? `${String(g.project).substring(0, 3)}***` : '(short)';
      console.log(`  - employeeCode=${ec} project=${proj} month=${g.period_month} year=${g.period_year} count=${g.n}`);
    }
  }

  // Total rows
  const portalTotal = await prisma.portalTimesheet.count();
  console.log(`STEP01_PORTAL_TOTAL=${maskCount(portalTotal)}`);

  // 2. State Permission + RolePermission + UserPermissionGrant
  const permTotal = await prisma.permission.count();
  const rpTotal = await prisma.rolePermission.count();
  const grantTotal = await prisma.userPermissionGrant.count();
  console.log(`STEP01_PERM=${permTotal}`);
  console.log(`STEP01_ROLE_PERM=${rpTotal}`);
  console.log(`STEP01_USER_GRANT=${grantTotal}`);

  // Sample Permission rows
  const perms = await prisma.permission.findMany({ take: 5, orderBy: { code: 'asc' } });
  console.log(`STEP01_PERM_SAMPLE (first 5): ${perms.map((p) => p.code).join(',')}`);

  // 3. Tất cả file app/ import getSessionUser
  async function walk(dir) {
    const results = [];
    async function rec(d) {
      const entries = await readdir(d, { withFileTypes: true });
      for (const e of entries) {
        const p = join(d, e.name);
        if (e.isDirectory()) await rec(p);
        else if (/\.(ts|tsx|js)$/.test(e.name)) results.push(p);
      }
    }
    await rec(dir);
    return results;
  }
  const appFiles = await walk('app');
  const importFiles = [];
  for (const f of appFiles) {
    const src = await readFile(f, 'utf8');
    if (/from\s+['"][^'"]*session['"]/.test(src) || /getSessionUser\b/.test(src)) {
      importFiles.push(f);
    }
  }
  console.log(`STEP01_GET_SESSION_USER_FILES=${importFiles.length}`);
  for (const f of importFiles) console.log(`  - ${f}`);
} catch (e) {
  console.error('STEP01_ERR', e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}