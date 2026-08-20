const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://neondb_owner:npg_E0eqUu7aHtpI@ep-shy-tree-az32as2c-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' } } });
async function main() {
  const policies = await prisma.\\\\SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public';\;
  console.log(policies);
}
main().finally(() => prisma.\\\());
