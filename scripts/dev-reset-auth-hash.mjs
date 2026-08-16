/**
 * scripts/dev-reset-auth-hash.mjs (TEMPORARY — chỉ chạy dev DB)
 *
 * Đồng bộ phone + hash ADMIN_PHONE/HR_PHONE theo password trong ENV — để login test.
 * Xóa sau khi xong task.
 *
 * CH� chạy khi:
 *  - DATABASE_URL dev branch.
 *  - ADMIN_PHONE + ADMIN_PASSWORD + HR_PHONE + HR_PASSWORD đã set đúng trong .env.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const accounts = [
  { phoneEnv: 'ADMIN_PHONE', passwordEnv: 'ADMIN_PASSWORD', role: 'ADMIN' },
  { phoneEnv: 'HR_PHONE', passwordEnv: 'HR_PASSWORD', role: 'HR_MANAGER' },
];

let updated = 0;
for (const acc of accounts) {
  const phone = process.env[acc.phoneEnv];
  const password = process.env[acc.passwordEnv];
  if (!phone || !password) {
    console.warn(`SKIP ${acc.role}: missing ENV`);
    continue;
  }
  // Tìm user bcc-fence (tên "Admin HRP (bcc-fence)" / "HR Manager (bcc-fence)")
  const user = await prisma.user.findFirst({
    where: { role: acc.role, name: { contains: 'bcc-fence' } },
  });
  if (!user) {
    console.warn(`NOT_FOUND ${acc.role}: bcc-fence user missing`);
    continue;
  }
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { phone, passwordHash: hash, isActive: true, role: acc.role, name: `${acc.role === 'ADMIN' ? 'Admin' : 'HR Manager'} HRP (identity-core)` },
  });
  console.log(`RESET_AUTH ${acc.role} (id=${user.id.substring(0, 8)}***) phoneLen=${phone.length} hashLen=${hash.length}`);
  updated++;
}
console.log(`DONE updated=${updated}`);
await prisma.$disconnect();
