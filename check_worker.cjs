const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_ADMIN } }
});

async function main() {
  const worker = await prisma.worker.findFirst({
    where: { accountUserId: '76b45d06-5003-4a89-a867-2b44aacb106b' }
  });
  console.log('Worker by accountUserId:', worker);
  
  const allWorkers = await prisma.worker.findMany({ select: { id: true, accountUserId: true, fullName: true, phone: true }});
  console.log('All workers:', allWorkers);
}

main().catch(console.error).finally(() => prisma.$disconnect());
