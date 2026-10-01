/**
 * font-google-ban.static.test.ts — PR #73 build-blocker regression guard.
 *
 * WHY THIS EXISTS:
 *   PR #73 (T0 → T1C audit-adoption commit 1b60dd40) failed both CI Quality and
 *   Vercel preview with `TypeError: Cannot read properties of null (reading '1')`
 *   inside `next/font/google`'s loader. The cause was the build runner failing to
 *   reach fonts.googleapis.com to fetch Inter / Be Vietnam Pro. Tier 3 round-1
 *   PASS only covers the *current surface*; this guard exists so a future PR can
 *   not silently reintroduce `next/font/google` (which would re-trigger the
 *   network-dependent build) without breaking the unit lane.
 *
 * WHAT IT PROVES (static — no DB, no render):
 *   - Production code under `app/**` has ZERO `next/font/google` imports.
 *   - `app/layout.tsx` provides both CSS variables `--font-bvp` AND `--font-inter`
 *     via the shared `app/fonts/local-fonts.ts` loader.
 *   - `app/bod/page.tsx` does NOT create its own font loader; it consumes
 *     `beVietnamPro` from the shared module.
 *   - The existing `src/shared/ui/design-tokens.static.test.ts` continues to
 *     pass, because `--font-bvp` / `--font-inter` remain discoverable via
 *     `variable: '--font-bvp'` / `variable: '--font-inter'` strings inside
 *     `.tsx` files (the design-token test's regex picks these up).
 *
 * NEGATIVE FIXTURE: a hypothetical file that imports `next/font/google` MUST
 * cause this test to fail. The check is not just a positive scan.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const APP_DIR = join(ROOT, 'app');
const LAYOUT = join(ROOT, 'app/layout.tsx');
const BOD = join(ROOT, 'app/bod/page.tsx');
const LOCAL_FONTS = join(ROOT, 'app/fonts/local-fonts.tsx');

const rel = (p: string) => relative(ROOT, p).split(sep).join('/');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    // Skip nested node_modules / .next / coverage to keep the scan narrow.
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === 'coverage' || entry === '.git') return [];
      return walk(full);
    }
    return [full];
  });
}

const TSX_UNDER_APP = walk(APP_DIR).filter((p) => p.endsWith('.tsx') || p.endsWith('.ts'));

describe('PR #73 build-blocker correction — next/font/google production ban', () => {
  it('zero `next/font/google` imports anywhere under app/**', () => {
    const offenders: Array<{ file: string; line: number; text: string }> = [];
    for (const file of TSX_UNDER_APP) {
      const text = readFileSync(file, 'utf8');
      text.split(/\r?\n/).forEach((lineText, i) => {
        if (/from\s+['"]next\/font\/google['"]/.test(lineText)) {
          offenders.push({ file: rel(file), line: i + 1, text: lineText.trim() });
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('app/fonts/local-fonts.ts exists and exports beVietnamPro + inter', () => {
    expect(statSync(LOCAL_FONTS).isFile()).toBe(true);
    const text = readFileSync(LOCAL_FONTS, 'utf8');
    expect(text).toMatch(/export\s+const\s+beVietnamPro\b/);
    expect(text).toMatch(/export\s+const\s+inter\b/);
    expect(text).toMatch(/localFont\s*\(/);
  });

  it('app/layout.tsx imports from ./fonts/local-fonts (not next/font/google) and declares both --font-bvp + --font-inter', () => {
    const text = readFileSync(LAYOUT, 'utf8');
    // Detect only the import form (not the `next/font/google` mention in comments).
    expect(/from\s+['"]next\/font\/google['"]/.test(text)).toBe(false);
    expect(text).toMatch(/from\s+['"]\.\/fonts\/local-fonts['"]/);
    // The CSS variable contracts must be present in the className interpolation
    // so the tokens actually reach the DOM at runtime.
    expect(text).toMatch(/\$\{beVietnamPro\.variable\}/);
    expect(text).toMatch(/\$\{inter\.variable\}/);
  });

  it('app/bod/page.tsx consumes the shared loader, does NOT import next/font/google', () => {
    const text = readFileSync(BOD, 'utf8');
    expect(/from\s+['"]next\/font\/google['"]/.test(text)).toBe(false);
    expect(text).toMatch(/from\s+['"]@\/app\/fonts\/local-fonts['"]/);
    expect(text).toMatch(/beVietnamPro\.variable/);
    // Belt-and-suspenders: the duplicated Be_Vietnam_Pro({...}) call MUST be gone.
    expect(text).not.toMatch(/Be_Vietnam_Pro\s*\(/);
  });

  it('--font-bvp and --font-inter are still discoverable as `variable:` strings for design-tokens.static.test.ts', () => {
    // The design-tokens test scans .tsx files for `variable: '--<name>'` patterns.
    // next/font/local accepts the same `variable:` option as next/font/google, so the
    // token-test regex still picks these up. If either contract disappears from
    // .tsx source, the design-token test will start failing — this guard makes
    // the dependency explicit.
    const sources = TSX_UNDER_APP.map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(sources).toMatch(/variable:\s*['"]--font-bvp['"]/);
    expect(sources).toMatch(/variable:\s*['"]--font-inter['"]/);
  });
});

describe('PR #73 build-blocker correction — negative fixture proves the gate has teeth', () => {
  it('a hypothetical TSX importing next/font/google WOULD be detected', () => {
    const hypothetical = [
      "import { Inter } from 'next/font/google';",
      "const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });",
    ].join('\n');
    const hits: string[] = [];
    hypothetical.split(/\r?\n/).forEach((lineText, i) => {
      if (/from\s+['"]next\/font\/google['"]/.test(lineText)) hits.push(`L${i + 1}`);
    });
    expect(hits).toHaveLength(1);
  });
});