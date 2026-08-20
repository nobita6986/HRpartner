const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_ADMIN } }
});

async function main() {
  const users = await prisma.user.findMany({
    where: { phone: '0910000002' }
  });
  console.log('Count:', users.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
