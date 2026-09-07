/**
 * step08-scope-subset.js -- go-live-20 / AC-20.
 *
 * Phep do DAN XUAT cho AC-20: tap ket luan la `git diff --cached --name-only`, va cau hoi la no co
 * la TAP CON cua muc 4.1 cong thu muc slug hay khong.
 *
 * Danh sach cho phep KHONG duoc dan tay o day -- no duoc RUT ra tu chinh bang muc 4.1 cua TASK.md.
 * Ly do: mot allowlist dan tay se luon xanh voi dung nhung path tac gia vua nho ra, dung hinh dang
 * diem mu `TEXT_PAIRS` cua go-live-08. Neu Tier 1 sua muc 4.1 ma round nay stage sai, phep do doi
 * theo hop dong chu khong theo ky uc cua toi.
 *
 * Chay tu goc worktree: node docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/step08-scope-subset.js
 */
const fs = require('fs');
const cp = require('child_process');

const TASK = 'docs/tasks/hrp-v5-go-live-20-public-job-listing-index/TASK.md';
const task = fs.readFileSync(TASK, 'utf8');
const section = task.split('### 4.1')[1].split('### 4.2')[0];
const allowed = section
  .split('\n')
  .filter((line) => line.startsWith('| `'))
  .map((line) => line.match(/^\|\s*`([^`]+)`/)[1]);

const staged = cp
  .execSync('git diff --cached --name-only', { encoding: 'utf8' })
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean);

const inside = (path) =>
  allowed.some((entry) => (entry.endsWith('/') ? path.startsWith(entry) : path === entry));

const outside = staged.filter((path) => !inside(path));
const banned = ['app/(portal)/page.tsx', 'app/globals.css', 'src/domains/job-board/components/'];
const bannedHits = banned.map((prefix) => ({
  prefix,
  hits: staged.filter((path) => path.startsWith(prefix)).length,
}));

console.log('TASK_SECTION= muc 4.1 cua ' + TASK);
console.log('ALLOWED= ' + allowed.length + ' hang rut tu bang muc 4.1:');
allowed.forEach((entry, i) => console.log('  [' + i + '] ' + entry));
console.log('STAGED= ' + staged.length + ' path (git diff --cached --name-only)');
console.log('OUTSIDE_ALLOWED= ' + JSON.stringify(outside));
bannedHits.forEach((row) => console.log('BANNED_PREFIX_IN_STAGED ' + row.prefix + ' = ' + row.hits));
const clean = outside.length === 0 && bannedHits.every((row) => row.hits === 0);
console.log('VERDICT= ' + (clean ? 'TAP CON, khong path nao ngoai muc 4.1' : 'CO PATH NGOAI PHAM VI'));
process.exit(clean ? 0 : 1);
