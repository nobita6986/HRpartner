/**
 * scripts/generate-role-secrets.mjs (TEMPORARY — STEP-01)
 * Generate passwords for runtime DB roles (app_user_writer, hrp_etl).
 * Write vào .ai-pipeline/role_secrets.txt (gitignored sau khi copy vào .env).
 *
 * Output:
 *   PIPE_ROLE_WRITER_PASSWORD=...
 *   PIPE_ROLE_ETL_PASSWORD=...
 *   PIPE_ROLE_READER_PASSWORD=...
 *
 * Sau khi copy sang .env, file này XOÁ.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function randChars(n) {
  const bytes = crypto.randomBytes(n);
  let out = '';
  for (let i = 0; i < n; i++) out += ALPHA[bytes[i] % ALPHA.length];
  return out;
}

const writerPwd = 'hrp_wr_' + randChars(28);
const readerPwd = 'hrp_rd_' + randChars(28);
const etlPwd = 'hrp_etl_' + randChars(28);

const outPath = path.resolve('.ai-pipeline/role_secrets.txt');
const lines = [
  '# Role passwords — STEP-01. Read-only sau khi tạo role. XOÁ file này sau khi copy vào .env.',
  `PIPE_ROLE_WRITER_PASSWORD=${writerPwd}`,
  `PIPE_ROLE_READER_PASSWORD=${readerPwd}`,
  `PIPE_ROLE_ETL_PASSWORD=${etlPwd}`,
];
fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');

console.log('GENERATED');
console.log(`WRITER_LEN=${writerPwd.length}`);
console.log(`READER_LEN=${readerPwd.length}`);
console.log(`ETL_LEN=${etlPwd.length}`);
console.log(`FILE=${outPath}`);