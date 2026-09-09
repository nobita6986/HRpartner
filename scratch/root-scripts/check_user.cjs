const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_ADMIN } }
});

async function main() {
  const users = await prisma.user.findMany({
    where: { phone: { in: ['0910000001', '0910000002', '0910000003'] } }
  });
  console.log(users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
