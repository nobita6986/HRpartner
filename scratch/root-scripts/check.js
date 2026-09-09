const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({ select: { id: true, phone: true, role: true } })
  .then(console.log)
  .finally(() => prisma.$disconnect());
