const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  try {
    const user = await prisma.user.findFirst({ where: { phone: '0910000002' } });
    console.log('User found:', user);
  } catch (error) {
    console.error('Error:', error);
  }
}

main().finally(() => prisma.$disconnect());
