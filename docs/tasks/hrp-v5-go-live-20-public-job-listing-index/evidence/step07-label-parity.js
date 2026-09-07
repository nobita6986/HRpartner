/**
 * step07-label-parity.js -- go-live-20 / AC-14 / RQ-12.
 *
 * Phep do DAN XUAT cho AC-14: rut moi chuoi nghia (single-quote va template) ra khoi
 * `public-listing.labels.ts` sau khi bo chu thich, roi doi chieu TUNG BYTE voi `app/(portal)/page.tsx`.
 * Ket luan la `missing= []`. Neu ai them mot nhan moi vao module ma quen dong bo trang chu, danh sach
 * `missing` khong con rong -- nen phep do nay khong phai mot bang liet ke tay.
 *
 * Chay tu goc repo: node docs/tasks/hrp-v5-go-live-20-public-job-listing-index/evidence/step07-label-parity.js
 */
const fs = require('fs');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const labels = strip(fs.readFileSync('src/domains/job-board/public-listing.labels.ts', 'utf8'));
const home = fs.readFileSync('app/(portal)/page.tsx', 'utf8');
const single = [...labels.matchAll(/'(?:[^'\\\n]|\\.)*'/g)].map((m) => m[0]);
const tpl = [...labels.matchAll(/`(?:[^`\\]|\\.)*`/g)].map((m) => m[0]);
const literals = [...single, ...tpl];
console.log('LABELS_FILE= src/domains/job-board/public-listing.labels.ts');
console.log('HOME_FILE=   app/(portal)/page.tsx');
console.log('count=', literals.length, '(san toi thieu cua hang rao: 6)');
literals.forEach((literal, i) => {
  console.log('  [' + i + '] ' + literal + '  -> home.includes = ' + home.includes(literal));
});
const missing = literals.filter((x) => !home.includes(x));
console.log('missing=', JSON.stringify(missing));
process.exit(missing.length === 0 && literals.length >= 6 ? 0 : 1);
