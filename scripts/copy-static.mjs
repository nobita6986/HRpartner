// Copy static site (index.html, ve-hrp.html) vào public/ trước khi next build.
// CỐ Ý KHÔNG copy docs/ sang public/: docs/ là nơi pipeline Tier 1/2/3 làm việc
// (TASK/HANDOFF/AUDIT, runbook vận hành, kế hoạch nội bộ) — publish ra web là rò rỉ
// tài liệu nội bộ. rmSync bên dưới dọn artifact public/docs mà các build cũ để lại.
// public/ chỉ là build artifact — đã gitignore, sinh lại mỗi lần build.
import { fileURLToPath } from 'node:url';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
mkdirSync(pub, { recursive: true });

for (const f of ['index.html', 've-hrp.html']) {
  cpSync(join(root, f), join(pub, f));
}
// Dọn artifact nội bộ của build trước; KHÔNG sinh lại.
rmSync(join(pub, 'docs'), { recursive: true, force: true });

console.log('[copy-static] ok: public/ đã sẵn sàng (index.html, ve-hrp.html)');
