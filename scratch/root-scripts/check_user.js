const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const users = await prisma.user.findMany();
  console.log(users.map(u => ({ phone: u.phone, role: u.role })));
}

checkUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
