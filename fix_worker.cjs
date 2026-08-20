const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const workerUser = await prisma.user.findFirst({ where: { phone: '0910000002' } });
  if (workerUser) {
    let worker = await prisma.worker.findUnique({ where: { phone: '0910000002' } });
    if (worker) {
      console.log('Worker found, updating...', worker.id);
      await prisma.worker.update({
        where: { id: worker.id },
        data: { accountUserId: workerUser.id, userId: workerUser.id }
      });
      console.log('Update success');
    } else {
      console.log('Worker not found, creating...');
      await prisma.worker.create({
        data: {
          userId: workerUser.id,
          accountUserId: workerUser.id,
          fullName: workerUser.name || 'Worker Demo',
          phone: workerUser.phone,
          employmentStatus: 'NONE',
          profileStatus: 'INCOMPLETE',
          riskStatus: 'NORMAL',
        }
      });
      console.log('Create success');
    }
  } else {
    console.log('User not found');
  }
}
main().finally(() => prisma.$disconnect());
