const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({ where: { phone: '0910000002' }});
  console.log('user.id:', user.id);
  const worker = await prisma.worker.findUnique({
    where: { accountUserId: user.id },
    select: { id: true },
  });
  console.log('worker:', worker);
}
main().finally(() => prisma.$disconnect());
