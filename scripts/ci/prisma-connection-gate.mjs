import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceRoots = ['app', path.join('src', 'domains')];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

async function sourceFiles(relativeDirectory) {
  const absoluteDirectory = path.join(repoRoot, relativeDirectory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await sourceFiles(relativePath));
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(relativePath);
    }
  }

  return files;
}

const violations = [];
for (const root of sourceRoots) {
  for (const relativePath of await sourceFiles(root)) {
    const source = await readFile(path.join(repoRoot, relativePath), 'utf8');
    if (/new\s+PrismaClient\s*\(/u.test(source)) {
      violations.push(relativePath);
    }
  }
}

const schema = await readFile(path.join(repoRoot, 'prisma', 'schema.prisma'), 'utf8');
if (!/url\s*=\s*env\("DATABASE_URL"\)/u.test(schema)) {
  violations.push('prisma/schema.prisma: runtime URL must use DATABASE_URL');
}
if (!/directUrl\s*=\s*env\("DATABASE_URL_ADMIN"\)/u.test(schema)) {
  violations.push('prisma/schema.prisma: migration URL must use DATABASE_URL_ADMIN');
}

if (violations.length > 0) {
  console.error('G0-03 connection gate FAIL');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('G0-03 connection gate PASS');
console.log('Runtime: pooled DATABASE_URL; migrations: direct DATABASE_URL_ADMIN; route/domain constructors: 0.');