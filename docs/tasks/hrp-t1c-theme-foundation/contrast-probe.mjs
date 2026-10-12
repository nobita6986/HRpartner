// contrast-probe.mjs — T1C Theme Foundation / DEC-01 palette proposal.
//
// INVERSE của "khảo sát mới nhất" được pin ở PLAN.md §5:
//   - Probe thực hiện ở worktree `codex/t1c-theme-foundation` (origin/main @ 44333245).
//   - T0 đã chốt DEC-02..07 nhưng CHƯA duyệt DEC-01 (bộ palette + hex).
//   - Theo chỉ đạo: "Giai đoạn đầu chỉ đề xuất hex hoàn chỉnh cho các palette dự
//     kiến, đo contrast trên toàn bộ cặp màu thực sự dùng và báo cáo rõ cặp
//     nào fail. Không sửa source/code cho tới khi T0 chọn và duyệt hex."
//
// Tệp này KHÔNG đụng `app/` `src/`. Tự chạy: `node docs/tasks/hrp-t1c-theme-foundation/contrast-probe.mjs`.
//
// DEC-07: text thường >= 4.5:1; chữ lớn (>= 18.66px regular hoặc >= 24px) +
// UI/focus >= 3:1.
//
// Cặp màu thực sự dùng (evidence từ PLAN.md §3 + app/globals.css:7-160):
//   1. text-trên-primary:        onPrimary trên nền primary     (nút "Đăng ký" trong GlobalNavbar.tsx:264,387).
//   2. text-trên-primary-dark:   onPrimary (mặc định #fff) trên nền primaryDark (heading/link active/focus ring).
//   3. text-trên-primary-soft:   onPrimarySoft (fallback #1f2937) trên nền primarySoft (avatar pill, badge role).
//   4. text-trên-primary-container: onPrimaryContainer trên nền primaryContainer (stamp/active border).
//   5. heading-trên-surface:     primaryDark trên nền surface (heading, link active).
//   6. focus-ring-trên-surface:  primaryDark (viền focus) trên nền surface (focus ring).
//   7. link-default-trên-surface: primaryDark trên nền surface (CTA link mặc định).
//
// Cặp (#7) cùng công thức (#5)(#6) nên chỉ cần đo (#5)(#6). Mỗi palette chỉ
// cần 6 cặp.
//
// Đầu ra: bảng CSV-style + verdict `PASS/FAIL` cho mỗi cặp dựa trên DEC-07.
// Hex là PLACEHOLDER đề xuất; T0 cần thay bằng hex thật từ designer.
//
// Lưu ý: tất cả hex đều giả định '#rrggbb' (lowercase, không alpha). Tính
// relative luminance theo WCAG 2.x: L = 0.2126*R' + 0.7152*G' + 0.0722*B'
// với R'/G'/B' = ((c/255 + 0.055)/1.055)^2.4 nếu c/255 > 0.03928, ngược lại
// c/255 / 12.92. Tỉ số = (L1 + 0.05) / (L2 + 0.05) với L1 > L2.

const RATIO_TEXT_MIN = 4.5;     // DEC-07 text thường
const RATIO_LARGE_UI = 3.0;     // DEC-07 chữ lớn + UI/focus

// ─── WCAG helper ────────────────────────────────────────────────────────────
function srgbToLinear(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function relativeLuminance(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`Invalid hex: ${hex}`);
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
function contrast(hex1, hex2) {
  const L1 = relativeLuminance(hex1);
  const L2 = relativeLuminance(hex2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}
function verdict(ratio, min) {
  return ratio >= min ? 'PASS' : 'FAIL';
}

// ─── Palette — T0 DUYỆT v1 (DEC-01) ──────────────────────────────────────────
// Hex dưới đây ĐƯỢC T0 DUYỆT, không còn placeholder.
// T0 Q1: duyệt 5 palette; Q2: Cách A dùng PD làm nền nút (C1 = onPrimary trên PD);
// Q3: giữ cả 5; Q4/Q5: nhãn/label tiếng Anh, không theme hóa status.
// 5 palette: HR Partner (giữ nguyên), Ocean Trust, Emerald Growth,
// Violet Future, Executive Gold. Mỗi palette gồm:
//   primary            (P)   — nền nút primary (vd nút "Đăng ký")
//   primaryDark        (PD)  — heading, link active, focus ring
//   primaryContainer   (PC)  — nền stamp / active border
//   primarySoft        (PS)  — nền avatar pill / role badge
//   surface            (S)   — nền khu vực nội dung (giữ mặc định --color-background từ globals.css)
//   onPrimary          (oP)  — text trên nền primary (mặc định #ffffff)
//   onPrimarySoft      (oPS) — text trên nền primarySoft (vd #1f2937 dark text)
//   onPrimaryContainer (oPC) — text trên nền primaryContainer (vd dark text)
//
// HR Partner giữ palette hiện tại từ globals.css:7-160:
const HRP = {
  primary: '#f26522',
  primaryDark: '#a63b00',
  primaryContainer: '#fde6d8',
  primarySoft: '#fff0e5',
  surface: '#faf9f7',
  onPrimary: '#ffffff',
  onPrimarySoft: '#1f2937',
  onPrimaryContainer: '#1f2937',
};

const PALETTES = {
  'hrp': {
    label: 'HR Partner',
    tokens: HRP,
  },
  'ocean-trust': {
    label: 'Ocean Trust',
    tokens: {
      primary: '#1e6f8f',
      primaryDark: '#0d4a63',
      primaryContainer: '#d6ebf5',
      primarySoft: '#e8f3f8',
      surface: '#f4f9fc',
      onPrimary: '#ffffff',
      onPrimarySoft: '#0d1f2d',
      onPrimaryContainer: '#0d1f2d',
    },
  },
  'emerald-growth': {
    label: 'Emerald Growth',
    tokens: {
      primary: '#1f8a5a',
      primaryDark: '#0d5a39',
      primaryContainer: '#d2ebde',
      primarySoft: '#e3f3ea',
      surface: '#f3faf6',
      onPrimary: '#ffffff',
      onPrimarySoft: '#0a2017',
      onPrimaryContainer: '#0a2017',
    },
  },
  'violet-future': {
    label: 'Violet Future',
    tokens: {
      primary: '#6a3fb5',
      primaryDark: '#3f1f7a',
      primaryContainer: '#e1d5f4',
      primarySoft: '#ede4f8',
      surface: '#f7f3fc',
      onPrimary: '#ffffff',
      onPrimarySoft: '#1c0f3a',
      onPrimaryContainer: '#1c0f3a',
    },
  },
  'executive-gold': {
    label: 'Executive Gold',
    tokens: {
      primary: '#9a7a17',
      primaryDark: '#5d4a08',
      primaryContainer: '#f0e6c0',
      primarySoft: '#f7f0d9',
      surface: '#fbf9f0',
      onPrimary: '#ffffff',
      onPrimarySoft: '#221e04',
      onPrimaryContainer: '#221e04',
    },
  },
};

// ─── Cặp màu thực sự dùng (per-palette) ───────────────────────────────────
function pairs(tokens) {
  // C1 MỚI (T0 Q2): onPrimary trên primaryDark (Cách A: dùng PD làm nền nút).
  // Ratio trên PD ≥ 4.5:1 với #ffffff ở mọi palette (xem probe kết quả).
  return {
    'C1: text-trên-primaryDark (Cách A: nền nút Đăng ký = PD)':
      { fg: tokens.onPrimary, bg: tokens.primaryDark, min: RATIO_TEXT_MIN, rule: 'AA text ≥ 4.5:1' },
    'C2: text-trên-primary (P làm nền, dùng cho accent decoration)':
      { fg: tokens.onPrimary, bg: tokens.primary, min: RATIO_LARGE_UI, rule: 'AA-large/UI ≥ 3:1 (chỉ decoration, không dùng làm nền nút)' },
    'C3: text-trên-primarySoft (badge role / avatar pill)':
      { fg: tokens.onPrimarySoft, bg: tokens.primarySoft, min: RATIO_TEXT_MIN, rule: 'AA text ≥ 4.5:1' },
    'C4: text-trên-primaryContainer (stamp/active border)':
      { fg: tokens.onPrimaryContainer, bg: tokens.primaryContainer, min: RATIO_TEXT_MIN, rule: 'AA text ≥ 4.5:1' },
    'C5: heading/PD-trên-surface (heading, link active)':
      { fg: tokens.primaryDark, bg: tokens.surface, min: RATIO_TEXT_MIN, rule: 'AA text ≥ 4.5:1' },
    'C6: focus-ring/PD-trên-surface (focus ring outline)':
      { fg: tokens.primaryDark, bg: tokens.surface, min: RATIO_LARGE_UI, rule: 'AA UI/focus ≥ 3:1' },
  };
}

// ─── Report ────────────────────────────────────────────────────────────────
function fmt(r) {
  return r.toFixed(3);
}

const rows = [];
for (const [key, def] of Object.entries(PALETTES)) {
  const t = def.tokens;
  const p = pairs(t);
  console.log(`\n=== ${def.label} (${key}) ===`);
  console.log(`primary=${t.primary}  primaryDark=${t.primaryDark}  surface=${t.surface}`);
  let failCount = 0;
  for (const [name, c] of Object.entries(p)) {
    const r = contrast(c.fg, c.bg);
    const v = verdict(r, c.min);
    if (v === 'FAIL') failCount++;
    rows.push({ palette: def.label, key, pair: name, fg: c.fg, bg: c.bg, ratio: r, min: c.min, rule: c.rule, verdict: v });
    console.log(`  [${v}] ${name.padEnd(70)} fg=${c.fg} bg=${c.bg} → ${fmt(r)}:1 (cần ≥ ${c.min}:1 ${c.rule})`);
  }
  console.log(`  TOTAL FAIL: ${failCount}`);
}

console.log('\n=== SUMMARY ===');
const failPalette = new Set();
for (const r of rows) {
  if (r.verdict === 'FAIL') failPalette.add(r.palette);
}
console.log(`Palettes không pass mọi cặp (BLOCKER DEC-01): ${[...failPalette].join(', ') || '(none)'}`);

console.log('\n=== CSV-like dump ===');
console.log('palette,key,pair,fg,bg,ratio,min,verdict');
for (const r of rows) {
  console.log(`${r.palette},${r.key},${JSON.stringify(r.pair)},${r.fg},${r.bg},${fmt(r.ratio)},${r.min},${r.verdict}`);
}

// ─── DEC-01 verdict ────────────────────────────────────────────────────────
const allPass = failPalette.size === 0;
console.log(`\nDEC-01 verdict: ${allPass ? 'CÓ THỂ chốt' : 'CẦN điều chỉnh hex'} — ${failPalette.size} palette có cặp FAIL.`);
console.log('Cặp FAIL làm BLOCKER cho DEC-01; T0 cần hoặc chỉnh hex hoặc loại palette đó.');
process.exit(allPass ? 0 : 1);
