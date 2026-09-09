const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_ADMIN } }
});

async function main() {
  const hash = await bcrypt.hash('demo-portal-2026', 10);
  const phones = ['0910000001', '0910000002', '0910000003'];
  
  for (const phone of phones) {
    const res = await prisma.user.updateMany({
      where: { phone },
      data: { passwordHash: hash }
    });
    console.log('Updated', phone, res.count);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
