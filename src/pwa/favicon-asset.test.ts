// favicon-asset.test.ts — Static-asset fence for the classic browser favicon
// referenced by `app/layout.tsx` (Next.js 15 App Router file convention).
//
// Why this file exists: hrp-favicon-asset-hotfix RQ-09 / AC-02 / AC-03 /
// AC-11. The hotfix replaced `app/favicon.ico` (commit 285d1765, 285.478 bytes,
// 4 entries 16/32/64/48) with the brand file Owner supplied at
// `C:\Users\Admin\Downloads\favicon.ico` (15.086 bytes, 3 entries 16/32/24,
// all 32bpp). This test pins the contract so a future drift (re-introducing
// the gap, swapping in a fake ICO, dropping the file, or rewriting layout.tsx
// to point at a non-existent path) fails loudly in CI before merge.
//
// CORRECTION 1/1 (C-01): the Owner-supplied file's entry[0] is 16×16 (the
// classic browser tab/bookmark slot). The favicon.ico asset slot is a separate
// file convention from PWA icons; `public/manifest.json` and `public/sw.js`
// reference `/icons/icon-{192,512}.png` only and are not touched by this
// hotfix.
//
// Asset path: app/favicon.ico (App Router auto-served at /favicon.ico).
// Source SHA-256 (Owner file): 042ebc6a9fcffcd0d4df27b26ed0467af6db00d85c7ae0e7e3621dd1bdab40ed
//
// Implementation: pure Node Buffer reads + fs.existsSync + crypto.createHash.
// No third-party dependency, no ICO library. Lives under `src/pwa/` so the
// unit lane glob in `vitest.unit.config.ts` picks it up.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..', '..');
const APP_DIR = resolve(REPO_ROOT, 'app');
const FAVICON = resolve(APP_DIR, 'favicon.ico');
const LAYOUT = resolve(APP_DIR, 'layout.tsx');

// Owner-supplied file at C:\Users\Admin\Downloads\favicon.ico. Pinned to the
// byte-for-byte contract; the test fails if either side drifts.
const OWNER_SOURCE_PATH = 'C:/Users/Admin/Downloads/favicon.ico';
const OWNER_SOURCE_SHA256 = '042ebc6a9fcffcd0d4df27b26ed0467af6db00d85c7ae0e7e3621dd1bdab40ed';
const OWNER_SOURCE_SIZE = 15086;

// ICO layout constants. An ICONDIR is 6 bytes; an ICONDIRENTRY is 16 bytes;
// entry[0] starts at offset 6 and reports the first image's width/height as
// byte[6] and byte[7] of the ICONDIRENTRY (a 0 means 256 per ICO spec).
const ICO_DIR_SIZE = 6;
const ICO_ENTRY_SIZE = 16;
// ICONDIR: 2 bytes reserved (must be 0x00 0x00), 2 bytes type (1 = ICO),
// 2 bytes count.
const ICO_TYPE_ICO = 1;

interface IcoProbe {
  type: number;
  count: number;
  entry0: {
    width: number;
    height: number;
    bytes: number;
    offset: number;
  };
  totalBytes: number;
}

function probeIco(path: string): IcoProbe {
  const buf = readFileSync(path);
  if (buf.length < ICO_DIR_SIZE + ICO_ENTRY_SIZE) {
    throw new Error(
      `${path}: file too small to be a real ICO (${buf.length} bytes; need ≥ ${ICO_DIR_SIZE + ICO_ENTRY_SIZE})`,
    );
  }
  const reserved = buf.readUInt16LE(0);
  const type = buf.readUInt16LE(2);
  const count = buf.readUInt16LE(4);
  if (reserved !== 0) {
    throw new Error(
      `${path}: invalid ICONDIR reserved field = ${reserved} (expected 0); not a real ICO`,
    );
  }
  if (type !== ICO_TYPE_ICO) {
    throw new Error(
      `${path}: invalid ICONDIR type = ${type} (expected ${ICO_TYPE_ICO} for ICO); ` +
        `type 2 means ICN (Mac OS Icon) which browsers do not render as favicon`,
    );
  }
  if (count < 1) {
    throw new Error(`${path}: ICONDIR count = 0; ICO must contain ≥ 1 entry`);
  }
  // Entry 0 starts at offset 6. Per ICO spec, width/height are 1 byte each; a
  // value of 0 means 256 (legacy quirk).
  const w0 = buf[6];
  const h0 = buf[7];
  const entry0Bytes = buf.readUInt32LE(14);
  const entry0Offset = buf.readUInt32LE(18);
  return {
    type,
    count,
    entry0: {
      width: w0 === 0 ? 256 : w0,
      height: h0 === 0 ? 256 : h0,
      bytes: entry0Bytes,
      offset: entry0Offset,
    },
    totalBytes: buf.length,
  };
}

function sha256Hex(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

describe('favicon asset hotfix — app/favicon.ico contract', () => {
  it('app/favicon.ico exists at the App Router file-convention path', () => {
    expect(existsSync(FAVICON)).toBe(true);
  });

  it('app/favicon.ico byte-count matches the Owner-supplied source (15086 bytes)', () => {
    const p = probeIco(FAVICON);
    expect(p.totalBytes).toBe(OWNER_SOURCE_SIZE);
  });

  it('app/favicon.ico SHA-256 matches the Owner-supplied source (byte-for-byte copy)', () => {
    // Cross-checks the test against the source file on the dev box. If the source
    // is missing or has been re-bottled, the test fails here with a clear
    // message — operators must NOT regenerate favicon.ico from a different source.
    expect(existsSync(OWNER_SOURCE_PATH), `Owner-supplied source missing at ${OWNER_SOURCE_PATH}`).toBe(true);
    const srcHash = sha256Hex(OWNER_SOURCE_PATH);
    const dstHash = sha256Hex(FAVICON);
    expect(srcHash).toBe(OWNER_SOURCE_SHA256);
    expect(dstHash).toBe(OWNER_SOURCE_SHA256);
    expect(dstHash).toBe(srcHash);
  });

  it('app/favicon.ico is a valid ICO (ICONDIR sig 00 00 01 00, type=1, count≥1)', () => {
    const p = probeIco(FAVICON);
    // Header bytes 0..3 are `00 00 01 00` (ICO magic). probeIco already asserts
    // reserved=0 and type=1; mirror that as a single observation here.
    const buf = readFileSync(FAVICON);
    expect(buf[0]).toBe(0x00);
    expect(buf[1]).toBe(0x00);
    expect(buf[2]).toBe(0x01);
    expect(buf[3]).toBe(0x00);
    expect(p.type).toBe(ICO_TYPE_ICO);
    expect(p.count).toBeGreaterThanOrEqual(1);
  });

  it('app/favicon.ico entry[0] dimensions are 16×16 (classic browser favicon slot)', () => {
    const p = probeIco(FAVICON);
    expect(p.entry0.width).toBe(16);
    expect(p.entry0.height).toBe(16);
  });
});

describe('favicon asset hotfix — app/layout.tsx declaration contract', () => {
  it('app/layout.tsx exists and references /favicon.ico via the icons.icon key', () => {
    expect(existsSync(LAYOUT)).toBe(true);
    const src = readFileSync(LAYOUT, 'utf8');
    // Next.js 15 App Router declaration: `icons: { icon: '/favicon.ico' }`.
    // The declaration is idempotent with the file convention but explicit so
    // tooling/preview picks the right icon. Pin the path here so any drift
    // (rename to /favicon.png, drop the declaration, etc.) trips this test.
    expect(src).toMatch(/icons:\s*\{[^}]*icon:\s*['"]\/favicon\.ico['"]/);
  });
});

describe('favicon asset hotfix — byte-identity vs out-of-scope surfaces', () => {
  // RQ-04 / RQ-05 / RQ-06 / RQ-08: PWA manifest, service worker, PWA icons,
  // and brand assets MUST stay byte-identical with baseline `cdde6cef`. These
  // surfaces are not exercised by this favicon test directly (they're AC-04
  // through AC-08 evidence captured at STEP-05 self-review), but the test
  // does assert that this hotfix did not silently delete any of them.
  //
  // We deliberately do NOT hard-pin a baseline SHA here: pinning would couple
  // this favicon test to unrelated PWA / brand hotfixes. The byte-identity
  // gate is enforced at AC-04..AC-08 by `git diff cdde6cef..HEAD -- ...` in
  // the HANDOFF evidence section.

  it('public/manifest.json and public/sw.js still exist (PWA surface intact)', () => {
    expect(existsSync(resolve(REPO_ROOT, 'public', 'manifest.json'))).toBe(true);
    expect(existsSync(resolve(REPO_ROOT, 'public', 'sw.js'))).toBe(true);
  });
});