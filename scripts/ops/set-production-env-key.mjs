import { chmodSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { stdin } from 'node:process';

export function setEncryptionKey(filePath, key) {
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error('Encryption key must be 32 bytes encoded as 64 hex characters');

  const current = statSync(filePath);
  const contents = readFileSync(filePath, 'utf8');
  const lines = contents.split(/\r?\n/).filter((line) => !line.startsWith('ETRUST_CREDENTIALS_ENCRYPTION_KEY='));
  const tempPath = join(dirname(filePath), `.production.env.${process.pid}.tmp`);

  writeFileSync(tempPath, `${lines.filter(Boolean).join('\n')}\nETRUST_CREDENTIALS_ENCRYPTION_KEY=${key}\n`, { mode: current.mode & 0o777 });
  chmodSync(tempPath, current.mode & 0o777);
  renameSync(tempPath, filePath);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const filePath = process.argv[2];
  if (!filePath) throw new Error('Usage: set-production-env-key.mjs <env-file>');
  let key = '';
  for await (const chunk of stdin) key += chunk;
  setEncryptionKey(filePath, key.trim());
}
