import { readFileSync } from 'node:fs';
const read = (r) => readFileSync(r, 'utf8').replace(/\r\n/g, '\n');
const page = read('app/(portal)/page.tsx');
const nav  = read('app/components/GlobalNavbar.tsx');
const count = (h, n) => h.split(n).length - 1;

const LOCKS = [
  ['className="hrp-pill flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"', 2],
  ['outline-none', 0],
  ['hrp-focus', 12],       // RQ-22: 8 -> 12
  ['<FacetSelect', 4],     // RQ-22: 2 -> 4
  ['appearance-none', 1],
  ['type="checkbox"', 0],
  ['transition-colors', 0],
  ['summaryLabel(job.', 3],
  ['min-h-11', 10],        // RQ-22: 6 -> 10
  ['type="text"', 0],
  ['href={detailHref}', 2],
  ['const detailHref = publicJobDetailPath(job.slug);', 1],
  ['publicJobDetailPath', 2],
  ['className="relative z-10', 2],
  ['relative z-10', 4],
];
console.log('=== count(page, X) locks — got | want ===');
for (const [needle, want] of LOCKS) {
  const got = count(page, needle);
  console.log(`${got === want ? 'OK  ' : 'DIFF'} ${String(got).padStart(3)} | ${String(want).padStart(3)}  ${JSON.stringify(needle)}`);
}

console.log('\n=== nav-item-lift pairing (test:614-625) ===');
let pairFail = 0;
let pairHits = 0;   // phep do chi co gia tri khi so hit > 0 (0 FAIL tren 0 hit la vo nghia)
for (const [label, source] of [['page', page], ['nav', nav]]) {
  for (const cls of ['hrp-card', 'hrp-btn-primary']) {
    const hits = [...source.matchAll(new RegExp(`[^"'\\s]*\\b${cls}\\b[^"']*`, 'g'))].map((m) => m[0]);
    pairHits += hits.length;
    for (const hit of hits) {
      if (!hit.includes('nav-item-lift')) {
        pairFail += 1;
        console.log(`FAIL ${label}/${cls}: ${JSON.stringify(hit.slice(0, 160))}`);
      }
    }
  }
}
console.log(`hits = ${pairHits} (phai > 0)`);
console.log(pairFail === 0 ? 'OK   mọi hit của hrp-card/hrp-btn-primary đều kèm nav-item-lift' : `FAIL ${pairFail} hit thiếu nav-item-lift`);

console.log('\n=== icon spans (test:680-681) ===');
const icons = [...page.matchAll(/<span[^>]*material-symbols-outlined[^>]*>/g)].map((m) => m[0]);
console.log(`spans = ${icons.length} (want 9); thiếu aria-hidden = ${icons.filter((s) => !s.includes('aria-hidden="true"')).length} (want 0)`);

console.log('\n=== h3 pins (test:149-150) ===');
console.log(`toContain('<h3 className="text-lg font-bold"') = ${page.includes('<h3 className="text-lg font-bold"')}`);
console.log(`not.toContain('<h3 className="text-base font-bold"') = ${!page.includes('<h3 className="text-base font-bold"')}`);

console.log('\n=== thứ tự hrp-keyword < FacetSelect trong panel ===');
const panelIdx = page.indexOf('className="hrp-panel');
console.log(`panel@${panelIdx}  keyword@${page.indexOf('id="hrp-keyword"', panelIdx)} < facet@${page.indexOf('<FacetSelect', panelIdx)} = ${page.indexOf('id="hrp-keyword"', panelIdx) < page.indexOf('<FacetSelect', panelIdx)}`);

console.log('\n=== chuỗi bị cấm ===');
const BANNED = ['job.salary', 'xoay_ca', 'hrp-btn-muted', 'tốt nhất', 'Top công ty', 'Người lao động', 'Doanh nghiệp đồng hành', 'Đã tuyển đủ', 'sort('];
for (const b of BANNED) console.log(`${count(page, b) === 0 ? 'OK  ' : 'HIT '} ${count(page, b)}  ${JSON.stringify(b)}`);
console.log(`industry (i)      = ${(page.match(/industry/gi) ?? []).length}`);
console.log(`isFull            = ${count(page, 'isFull')} (chỉ trong comment, không AC nào grep)`);
console.log(`fetch(\`/api/jobs  = ${count(page, 'fetch(`/api/jobs')}`);
console.log(`LOCATIONS/... decl = ${(page.match(/const\s+(?:LOCATIONS|INDUSTRIES|WORK_TYPES|JOB_TYPES)\s*=/g) ?? []).length}`);
console.log(`Tìm thấy \${total} kết quả = ${/Tìm thấy \$\{total\} kết quả/.test(page)}`);
console.log(`Tuyển dụng nổi bật = ${count(page, 'Tuyển dụng nổi bật')}`);
console.log(`Thời gian đang cập nhật = ${count(page, 'Thời gian đang cập nhật')}`);
console.log(`\nCRLF=${(page.match(/\r/g) ?? []).length}  lines=${page.split('\n').length - 1}`);
