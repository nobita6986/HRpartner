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
// CORRECTION 1/1 (C-01 + C-02): icons re-rendered with logo mark ONLY
// (no tagline "VIỆC LÀM MIỀN BẮC") to ensure all essential artwork stays within
// the maskable safe zone. The tagline is omitted because on 192×192 the text
// would be <4px tall — unreadable — and on both sizes it sits at the canvas
// edge where Android adaptive-icon / squircle masks clip content.
//
// Safe-zone rule applied:
//   INNER_FRACTION = 0.60  (inner 60% of canvas = strict safe zone)
//   padding = (canvas - innerSize) / 2  on all four sides
//   logo mark = source logo mark only, scaled to fit within inner area
//   background = white (#ffffff, matching manifest.background_color)
//
// Asset source: public/logo.png (2300×2291 RGBA PNG, palette 256-entry)
// Logo mark bounding box (palette-based, non-background): x=115..2205 y=110..1729
// (tagline at y=1729..2185 excluded — too close to canvas edge)
// Inner safe zone: 192 → 115px / 512 → 307px
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

describe('PWA icon assets hotfix — maskable safe-zone composition', () => {
  // C-02 evidence: scan the rendered PNGs to assert the brand-mark content
  // (non-white pixels) is confined to the inner 60% of the canvas. This is the
  // strict safe zone per Android adaptive-icon / W3C maskable guidance — the
  // outer 40% on each side is at risk of being clipped by the OEM's circle or
  // squircle mask variant.

  function decodeRgba(path: string): { width: number; height: number; rgba: Uint8Array } {
    const buf = readFileSync(path);
    if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
      throw new Error(`${path}: not a PNG`);
    }
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const bitDepth = buf[24];
    const colorType = buf[25];
    if (bitDepth !== 8 || colorType !== 6) {
      throw new Error(`${path}: not 8-bit RGBA (got bitDepth=${bitDepth}, colorType=${colorType})`);
    }
    // Find IDAT chunks and decompress
    let offset = 8;
    const idat: Buffer[] = [];
    while (offset < buf.length) {
      const len = buf.readUInt32BE(offset);
      const type = buf.slice(offset + 4, offset + 8).toString('ascii');
      if (type === 'IDAT') idat.push(buf.slice(offset + 8, offset + 8 + len));
      if (type === 'IEND') break;
      offset += 12 + len;
    }
    const zlib = require('node:zlib');
    const raw = zlib.inflateSync(Buffer.concat(idat));
    // Reconstruct filtered scanlines back into RGBA. Only filter 0 (None) is
    // emitted by our encoder; we apply reverse-filter accordingly for
    // Sub/Up/Average/Paeth so the assertion works regardless of encoder.
    const rowBytes = width * 4;
    const out = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) {
      const filter = raw[y * (1 + rowBytes)];
      const srcRow = raw.slice(y * (1 + rowBytes) + 1, y * (1 + rowBytes) + 1 + rowBytes);
      const dstRow = out.slice(y * rowBytes, y * rowBytes + rowBytes);
      if (filter === 0) {
        srcRow.copy(dstRow);
      } else if (filter === 1) {
        // Sub
        for (let x = 0; x < rowBytes; x++) {
          const left = x >= 4 ? dstRow[x - 4] : 0;
          dstRow[x] = (srcRow[x] + left) & 0xff;
        }
      } else if (filter === 2) {
        // Up
        const upRow = y > 0 ? out.slice((y - 1) * rowBytes, (y - 1) * rowBytes + rowBytes) : null;
        for (let x = 0; x < rowBytes; x++) {
          const up = upRow ? upRow[x] : 0;
          dstRow[x] = (srcRow[x] + up) & 0xff;
        }
      } else if (filter === 3) {
        // Average
        const upRow = y > 0 ? out.slice((y - 1) * rowBytes, (y - 1) * rowBytes + rowBytes) : null;
        for (let x = 0; x < rowBytes; x++) {
          const left = x >= 4 ? dstRow[x - 4] : 0;
          const up = upRow ? upRow[x] : 0;
          dstRow[x] = (srcRow[x] + Math.floor((left + up) / 2)) & 0xff;
        }
      } else if (filter === 4) {
        // Paeth
        const upRow = y > 0 ? out.slice((y - 1) * rowBytes, (y - 1) * rowBytes + rowBytes) : null;
        for (let x = 0; x < rowBytes; x++) {
          const a = x >= 4 ? dstRow[x - 4] : 0;
          const b = upRow ? upRow[x] : 0;
          const c = x >= 4 && upRow ? upRow[x - 4] : 0;
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          let paeth: number;
          if (pa <= pb && pa <= pc) paeth = a;
          else if (pb <= pc) paeth = b;
          else paeth = c;
          dstRow[x] = (srcRow[x] + paeth) & 0xff;
        }
      } else {
        throw new Error(`${path}: unsupported filter ${filter} at row ${y}`);
      }
    }
    return { width, height, rgba: new Uint8Array(out) };
  }

  // Measure non-white content (logo mark) within the inner 60% safe zone vs.
  // the outer 40% at-risk region. Strict invariant: zero content pixels in the
  // outer 40% (i.e. the at-risk region must be pure background).
  function measureSafeZone(rgba: Uint8Array, width: number, height: number) {
    const padding = Math.round(((width + height) / 2) * 0.4 / 2); // 20% each side
    let innerNonWhite = 0;
    let outerNonWhite = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2], a = rgba[i + 3];
        // Non-white = not (very close to white AND opaque).
        const isNonWhite = !(r >= 248 && g >= 248 && b >= 248 && a >= 248);
        const inInner = x >= padding && x < width - padding && y >= padding && y < height - padding;
        if (isNonWhite) {
          if (inInner) innerNonWhite++;
          else outerNonWhite++;
        }
      }
    }
    return { padding, innerNonWhite, outerNonWhite };
  }

  it('icon-192.png content stays inside the inner 60% maskable safe zone', () => {
    const { width, height, rgba } = decodeRgba(ICON_192);
    expect(width).toBe(192);
    expect(height).toBe(192);
    const { innerNonWhite, outerNonWhite } = measureSafeZone(rgba, width, height);
    expect(outerNonWhite, 'content must not bleed into the outer 40% at-risk region').toBe(0);
    expect(innerNonWhite, 'logo mark must render at least 1% of inner safe zone').toBeGreaterThan(192 * 1);
  });

  it('icon-512.png content stays inside the inner 60% maskable safe zone', () => {
    const { width, height, rgba } = decodeRgba(ICON_512);
    expect(width).toBe(512);
    expect(height).toBe(512);
    const { innerNonWhite, outerNonWhite } = measureSafeZone(rgba, width, height);
    expect(outerNonWhite, 'content must not bleed into the outer 40% at-risk region').toBe(0);
    expect(innerNonWhite, 'logo mark must render at least 1% of inner safe zone').toBeGreaterThan(512 * 1);
  });

  it('icon-192.png background is white (#ffffff) matching manifest.background_color', () => {
    const { rgba, width, height } = decodeRgba(ICON_192);
    // Sample 8 corner pixels (outer 1px each side) — must all be opaque white.
    const samples: Array<[number, number]> = [
      [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
      [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
      [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)],
    ];
    for (const [x, y] of samples) {
      const i = (y * width + x) * 4;
      expect(rgba[i]).toBe(255);
      expect(rgba[i + 1]).toBe(255);
      expect(rgba[i + 2]).toBe(255);
      expect(rgba[i + 3]).toBe(255);
    }
  });

  it('icon-512.png background is white (#ffffff) matching manifest.background_color', () => {
    const { rgba, width, height } = decodeRgba(ICON_512);
    const samples: Array<[number, number]> = [
      [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
      [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
      [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)],
    ];
    for (const [x, y] of samples) {
      const i = (y * width + x) * 4;
      expect(rgba[i]).toBe(255);
      expect(rgba[i + 1]).toBe(255);
      expect(rgba[i + 2]).toBe(255);
      expect(rgba[i + 3]).toBe(255);
    }
  });
});
