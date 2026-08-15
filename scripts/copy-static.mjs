// Copy static site (index.html, ve-hrp.html, docs/) vào public/ trước khi next build.
// Giữ layout repo gốc (docs/tasks là nơi pipeline Tier 1/2/3 hoạt động);
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
rmSync(join(pub, 'docs'), { recursive: true, force: true });
cpSync(join(root, 'docs'), join(pub, 'docs'), { recursive: true });

console.log('[copy-static] ok: public/ đã sẵn sàng (index.html, ve-hrp.html, docs/)');
