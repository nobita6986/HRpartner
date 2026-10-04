// pwa-icons.test.ts — Static-asset fence for the PWA install + push-notification
// icons referenced by `public/manifest.json` and `public/sw.js`.
//
// Why this file exists: hrp-pwa-icon-assets-hotfix RQ-08 / AC-07. The hotfix
// replaced two missing PNGs (which caused 404s and a "resource isn't a valid
// image" warning in the browser console) with real brand-mark PNGs at
// `public/icons/icon-192.png` and `public/icons/icon-512.png`. This test
// pins the contract so a future drift (re-introducing the gap, swapping in a
// fake PNG, dropping the file, or changing manifest/sw.js to point at a
// non-existent path) fails loudly in CI before merge.
//
// Implementation: pure Node Buffer reads + fs.existsSync. No third-party
// dependency, no PNG library. Lives under `src/pwa/` so the unit lane glob
// in `vitest.unit.config.ts` picks it up.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PUBLIC_DIR = resolve(__dirname, '..', '..', 'public');
const ICON_192 = resolve(PUBLIC_DIR, 'icons', 'icon-192.png');
const ICON_512 = resolve(PUBLIC_DIR, 'icons', 'icon-512.png');
const MANIFEST = resolve(PUBLIC_DIR, 'manifest.json');
const SW = resolve(PUBLIC_DIR, 'sw.js');

interface PngProbe {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  bytes: number;
}

function probePng(path: string): PngProbe {
  const buf = readFileSync(path);
  if (buf.length < 33) {
    throw new Error(`${path}: file too small to be a real PNG (${buf.length} bytes)`);
  }
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(
      `${path}: invalid PNG signature ${buf.subarray(0, 8).toString('hex')} ` +
        `(expected ${PNG_SIGNATURE.toString('hex')})`,
    );
  }
  // PNG layout: 8-byte sig, then chunks. IHDR is the first chunk and is 25 bytes
  // total (4 length + 4 type + 13 data + 4 crc). Width is IHDR data[0..4),
  // height is IHDR data[4..8), bit depth is IHDR data[8], color type IHDR data[9].
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  return { width, height, bitDepth, colorType, bytes: buf.length };
}

describe('PWA icon assets hotfix — public/icons/ contract', () => {
  it('icon-192.png exists at the manifest-declared path', () => {
    expect(existsSync(ICON_192)).toBe(true);
  });

  it('icon-512.png exists at the manifest-declared path', () => {
    expect(existsSync(ICON_512)).toBe(true);
  });

  it('icon-192.png is a real PNG with IHDR 192x192 / 8-bit / RGBA', () => {
    const p = probePng(ICON_192);
    expect(p.width).toBe(192);
    expect(p.height).toBe(192);
    expect(p.bitDepth).toBe(8);
    expect(p.colorType).toBe(6);
    expect(p.bytes).toBeGreaterThan(100);
  });

  it('icon-512.png is a real PNG with IHDR 512x512 / 8-bit / RGBA', () => {
    const p = probePng(ICON_512);
    expect(p.width).toBe(512);
    expect(p.height).toBe(512);
    expect(p.bitDepth).toBe(8);
    expect(p.colorType).toBe(6);
    expect(p.bytes).toBeGreaterThan(100);
  });
});

describe('PWA icon assets hotfix — manifest.json contract', () => {
  it('public/manifest.json exists and parses as JSON', () => {
    expect(existsSync(MANIFEST)).toBe(true);
    const raw = readFileSync(MANIFEST, 'utf8');
    const parsed = JSON.parse(raw) as {
      icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
    };
    expect(Array.isArray(parsed.icons)).toBe(true);
    expect(parsed.icons.length).toBe(2);
  });

  it('manifest declares /icons/icon-192.png with sizes/type/purpose and the file exists', () => {
    const parsed = JSON.parse(readFileSync(MANIFEST, 'utf8')) as {
      icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
    };
    const e = parsed.icons.find((i) => i.src === '/icons/icon-192.png');
    expect(e, 'manifest.icons must contain /icons/icon-192.png').toBeDefined();
    expect(e!.sizes).toBe('192x192');
    expect(e!.type).toBe('image/png');
    expect(e!.purpose.toLowerCase()).toContain('maskable');
    expect(existsSync(ICON_192)).toBe(true);
  });

  it('manifest declares /icons/icon-512.png with sizes/type/purpose and the file exists', () => {
    const parsed = JSON.parse(readFileSync(MANIFEST, 'utf8')) as {
      icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
    };
    const e = parsed.icons.find((i) => i.src === '/icons/icon-512.png');
    expect(e, 'manifest.icons must contain /icons/icon-512.png').toBeDefined();
    expect(e!.sizes).toBe('512x512');
    expect(e!.type).toBe('image/png');
    expect(e!.purpose.toLowerCase()).toContain('maskable');
    expect(existsSync(ICON_512)).toBe(true);
  });
});

describe('PWA icon assets hotfix — sw.js notification icon/badge contract', () => {
  it('public/sw.js exists and references /icons/icon-192.png for both icon and badge', () => {
    expect(existsSync(SW)).toBe(true);
    const src = readFileSync(SW, 'utf8');
    // The push handler in this file (hrp-p1 STEP-04) sets
    //   { icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', ... }
    // in self.registration.showNotification(...). We assert both literal paths
    // appear, and that the referenced path exists on disk.
    expect(src).toMatch(/icon:\s*'\/icons\/icon-192\.png'/);
    expect(src).toMatch(/badge:\s*'\/icons\/icon-192\.png'/);
    expect(existsSync(ICON_192)).toBe(true);
  });

  it('every /icons/ path referenced by sw.js exists on disk', () => {
    const src = readFileSync(SW, 'utf8');
    const refs = new Set<string>();
    const re = /'\/icons\/([^']+)'/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) refs.add(m[1]);
    expect(refs.size, 'sw.js should reference at least one icon').toBeGreaterThan(0);
    for (const file of refs) {
      const p = resolve(PUBLIC_DIR, 'icons', file);
      expect(existsSync(p), `sw.js references /icons/${file} but the file is missing`).toBe(true);
    }
  });
});
