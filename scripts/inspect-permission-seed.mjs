/**
 * scripts/inspect-permission-seed.mjs (TEMPORARY - STEP-05 verify)
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

try {
  const perms = await prisma.permission.count();
  const rp = await prisma.rolePermission.count();
  const grants = await prisma.userPermissionGrant.count();
  const users = await prisma.user.count();
  const passwordHashes = await prisma.user.findMany({
    where: { phone: { in: [process.env.ADMIN_PHONE, process.env.HR_PHONE] } },
    select: { phone: true, passwordHash: true, role: true },
  });
  console.log(`PERMS=${perms}`);
  console.log(`ROLE_PERMS=${rp}`);
  console.log(`USER_GRANTS=${grants}`);
  console.log(`USERS=${users}`);
  console.log(`AUTH_ACCOUNTS_COUNT=${passwordHashes.length}`);
  for (const u of passwordHashes) {
    const masked = u.phone ? `${u.phone.substring(0, 3)}****${u.phone.substring(u.phone.length - 2)}` : '(none)';
    const hashLen = u.passwordHash ? u.passwordHash.length : 0;
    console.log(`  - role=${u.role} phone=${masked} passwordHashLen=${hashLen}`);
  }
  // List Permission codes
  const list = await prisma.permission.findMany({ orderBy: { code: 'asc' }, select: { code: true, group: true } });
  console.log(`PERM_LIST=${list.map((p) => `${p.code}(${p.group})`).join(',')}`);
  // List RolePermission
  const rpList = await prisma.rolePermission.findMany({ select: { role: true, permissionCode: true }, orderBy: [{ role: 'asc' }, { permissionCode: 'asc' }] });
  console.log(`RP_PER_ROLE=${JSON.stringify(rpList.reduce((acc, r) => { acc[r.role] = acc[r.role] || []; acc[r.role].push(r.permissionCode); return acc; }, {}))}`);
} finally {
  await prisma.$disconnect();
}
