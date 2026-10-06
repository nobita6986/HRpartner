#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * T1C — Sticky marquee single-text entry browser-check
 * (T0 CORRECTION 1/1, v1.1).
 *
 * Runs the live Vercel Preview URL of this PR on a desktop viewport
 * (1440x900) and a mobile viewport (390x844), asserts:
 *
 *   1. The `data-testid="sticky-announcement"` root is present after the
 *      client-side `usePublicContentControls` fetch resolves.
 *   2. There is exactly ONE `.hrpStickyAnnouncementMessageMarquee`
 *      element in the DOM (no clone, no second group).
 *   3. The computed `animation-name` of the message is
 *      `hrpStickyAnnouncementMarquee` and the resolved keyframe contains
 *      `translateX(100%)` at 0% and `translateX(-100%)` at 100%.
 *   4. The message's `getComputedStyle(...).transform` changes
 *      monotonically leftward over three samples taken 1500 ms apart
 *      (so the message is actually animating, not a static image).
 *   5. No element in the document has `data-testid="sticky-announcement-marquee-tail"`.
 *
 * Screenshots are written to the evidence directory at three timestamps
 * per viewport so a reviewer can see the entry / mid / exit positions.
 *
 * The script uses `puppeteer-core` pointed at the pre-existing
 * `C:\Users\Admin\.cache\puppeteer\chrome\…\chrome.exe` binary that the
 * agent discovered in this environment, so no Chromium is downloaded.
 *
 * Exit codes:
 *   0  — every check PASS for every viewport.
 *   1  — a check failed (assertion / timeout / unreachable).
 *   2  — usage error (missing or invalid arguments).
 *
 * Required CLI args:
 *   --preview-url <vercel-preview-url>
 *   --screenshots-dir <local-dir>
 *
 * Optional:
 *   --wait-ms <int>             how long to wait for the marquee after
 *                               the page is interactive (default 8000).
 *   --sample-ms <int>           interval between transform samples
 *                               (default 1500).
 *   --chrome-path <path>        override the Chrome binary path.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

const DEFAULT_CHROME_PATHS = [
  'C:\\Users\\Admin\\.cache\\puppeteer\\chrome\\win64-152.0.7977.75\\chrome-win64\\chrome.exe',
  'C:\\Users\\Admin\\.cache\\puppeteer\\chrome\\win64-152.0.7977.42\\chrome-win64\\chrome.exe',
];

function parseArgs(argv) {
  const out = {
    previewUrl: null,
    screenshotsDir: null,
    waitMs: 8000,
    sampleMs: 1500,
    chromePath: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--preview-url') out.previewUrl = argv[++i];
    else if (a === '--screenshots-dir') out.screenshotsDir = argv[++i];
    else if (a === '--wait-ms') out.waitMs = Number(argv[++i]);
    else if (a === '--sample-ms') out.sampleMs = Number(argv[++i]);
    else if (a === '--chrome-path') out.chromePath = argv[++i];
    else if (a === '-h' || a === '--help') {
      console.log(
        'Usage: node t1c-marquee-browser-check.mjs --preview-url <url> --screenshots-dir <dir> [--wait-ms 8000] [--sample-ms 1500] [--chrome-path <path>]',
      );
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  if (!out.previewUrl || !out.screenshotsDir) {
    console.error('Missing --preview-url or --screenshots-dir');
    process.exit(2);
  }
  return out;
}

function resolveChromePath(override) {
  if (override) return override;
  for (const p of DEFAULT_CHROME_PATHS) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    `No Chrome binary found. Tried:\n  ${DEFAULT_CHROME_PATHS.join(
      '\n  ',
    )}\nPass --chrome-path to override.`,
  );
}

function matrixToTranslateX(transform) {
  // `matrix(a, b, c, d, e, f)` => `e` is the X translation in pixels.
  if (!transform || transform === 'none') return 0;
  const m = transform.match(/matrix\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(',').map((s) => Number(s.trim()));
    return parts[4] ?? 0;
  }
  const m3 = transform.match(/matrix3d\(([^)]+)\)/);
  if (m3) {
    const parts = m3[1].split(',').map((s) => Number(s.trim()));
    return parts[12] ?? 0;
  }
  return 0;
}

function isMonotonicLeftward(samples) {
  for (let i = 1; i < samples.length; i += 1) {
    if (!(samples[i] < samples[i - 1])) return false;
  }
  return true;
}

async function checkViewport({ page, args, viewport, screenshotDir, log }) {
  const tag = `[${viewport.name}]`;
  await page.setViewport({ width: viewport.width, height: viewport.height });
  console.log(`${tag} navigating to ${args.previewUrl}`);
  await page.goto(args.previewUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for the client-side fetch to populate the sticky announcement.
  // The component renders the marquee block only after the
  // `usePublicContentControls` API call resolves, so we explicitly wait
  // for the data-testid.
  console.log(`${tag} waiting for data-testid="sticky-announcement" (up to ${args.waitMs}ms)`);
  await page.waitForSelector('[data-testid="sticky-announcement"]', {
    timeout: args.waitMs,
  });

  // 1. exactly one .hrpStickyAnnouncementMessageMarquee element
  const messageCount = await page.$$eval(
    '.hrpStickyAnnouncementMessageMarquee',
    (els) => els.length,
  );
  log.push({ id: `${tag}.single-text`, ok: messageCount === 1, detail: `count=${messageCount}` });
  if (messageCount !== 1) {
    throw new Error(`${tag} expected exactly 1 marquee message, got ${messageCount}`);
  }

  // 2. no leftover tail testid
  const tailCount = await page.$$eval(
    '[data-testid="sticky-announcement-marquee-tail"]',
    (els) => els.length,
  );
  log.push({ id: `${tag}.no-tail`, ok: tailCount === 0, detail: `tailCount=${tailCount}` });
  if (tailCount !== 0) {
    throw new Error(`${tag} unexpected aria-hidden tail (count=${tailCount})`);
  }

  // 3. computed animation + keyframe content
  const computed = await page.$eval(
    '.hrpStickyAnnouncementMessageMarquee',
    (el) => {
      const cs = window.getComputedStyle(el);
      // The keyframes are not exposed via getComputedStyle, so we
      // walk the document.styleSheets to extract the @keyframes rule.
      let keyframes = '';
      for (const sheet of Array.from(document.styleSheets)) {
        let rules;
        try { rules = sheet.cssRules ?? []; } catch { rules = []; }
        for (const rule of Array.from(rules)) {
          if (
            rule instanceof CSSKeyframesRule &&
            rule.name === 'hrpStickyAnnouncementMarquee'
          ) {
            keyframes = Array.from(rule.cssRules)
              .map((kf) => `${kf.keyText} { ${kf.style.cssText} }`)
              .join('\n');
          }
        }
      }
      return {
        animationName: cs.animationName,
        animationDuration: cs.animationDuration,
        animationIterationCount: cs.animationIterationCount,
        animationTimingFunction: cs.animationTimingFunction,
        width: cs.width,
        whiteSpace: cs.whiteSpace,
        overflow: cs.overflow,
        keyframes,
      };
    },
  );
  log.push({ id: `${tag}.animation-name`, ok: computed.animationName === 'hrpStickyAnnouncementMarquee', detail: computed.animationName });
  if (computed.animationName !== 'hrpStickyAnnouncementMarquee') {
    throw new Error(`${tag} animation-name=${computed.animationName}, expected hrpStickyAnnouncementMarquee`);
  }
  log.push({ id: `${tag}.kf-0`, ok: /0%\s*\{[^}]*translateX\(100%\)/.test(computed.keyframes), detail: computed.keyframes.match(/0%\s*\{[^}]*\}/)?.[0] ?? '(no 0% rule)' });
  if (!/0%\s*\{[^}]*translateX\(100%\)/.test(computed.keyframes)) {
    throw new Error(`${tag} keyframe 0% does not contain translateX(100%): ${computed.keyframes}`);
  }
  log.push({ id: `${tag}.kf-100`, ok: /100%\s*\{[^}]*translateX\(-100%\)/.test(computed.keyframes), detail: computed.keyframes.match(/100%\s*\{[^}]*\}/)?.[0] ?? '(no 100% rule)' });
  if (!/100%\s*\{[^}]*translateX\(-100%\)/.test(computed.keyframes)) {
    throw new Error(`${tag} keyframe 100% does not contain translateX(-100%): ${computed.keyframes}`);
  }
  log.push({ id: `${tag}.msg-width`, ok: /max-content/.test(computed.width) || computed.width !== '0px', detail: `width=${computed.width}` });
  log.push({ id: `${tag}.msg-white-space`, ok: computed.whiteSpace === 'nowrap', detail: `white-space=${computed.whiteSpace}` });
  log.push({ id: `${tag}.msg-no-overflow-hidden`, ok: !/(^|\s)hidden(\s|;|$)/.test(computed.overflow), detail: `overflow=${computed.overflow}` });

  // 4. monotonic leftward motion over 3 samples
  const transforms = [];
  for (let i = 0; i < 3; i += 1) {
    const t = await page.$eval(
      '.hrpStickyAnnouncementMessageMarquee',
      (el) => window.getComputedStyle(el).transform,
    );
    transforms.push({ ts: Date.now(), translateX: matrixToTranslateX(t), raw: t });
    await page.screenshot({ path: resolve(screenshotDir, `${viewport.name}-sample-${i}.png`), fullPage: false });
    if (i < 2) await new Promise((r) => setTimeout(r, args.sampleMs));
  }
  const xs = transforms.map((s) => s.translateX);
  log.push({ id: `${tag}.leftward`, ok: isMonotonicLeftward(xs), detail: JSON.stringify(xs) });
  if (!isMonotonicLeftward(xs)) {
    throw new Error(`${tag} transform did not move monotonically leftward: ${JSON.stringify(xs)}`);
  }

  // 5. screenshot the final state for the evidence folder
  await page.screenshot({ path: resolve(screenshotDir, `${viewport.name}-final.png`), fullPage: false });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const chromePath = resolveChromePath(args.chromePath);
  const screenshotDir = resolve(args.screenshotsDir);
  await mkdir(screenshotDir, { recursive: true });

  console.log(`Chrome binary: ${chromePath}`);
  console.log(`Preview URL:   ${args.previewUrl}`);
  console.log(`Screenshots:   ${screenshotDir}`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
    ],
  });
  const summary = { previewUrl: args.previewUrl, viewports: [] };
  const log = [];
  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage();
      try {
        await checkViewport({ page, args, viewport, screenshotDir, log });
        summary.viewports.push({ name: viewport.name, status: 'PASS' });
      } catch (err) {
        summary.viewports.push({ name: viewport.name, status: 'FAIL', error: err.message });
        await page.screenshot({ path: resolve(screenshotDir, `${viewport.name}-error.png`), fullPage: false }).catch(() => {});
        throw err;
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  const reportPath = resolve(screenshotDir, 'report.json');
  const logPath = resolve(screenshotDir, 'log.json');
  await writeFile(reportPath, JSON.stringify({ ...summary, log }, null, 2), 'utf8');
  await writeFile(logPath, JSON.stringify(log, null, 2), 'utf8');
  console.log(`Report: ${reportPath}`);
  for (const v of summary.viewports) {
    console.log(`  ${v.name}: ${v.status}${v.error ? ' — ' + v.error : ''}`);
  }
  console.log('OK: T1C marquee single-text entry browser-check PASSED');
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});

// Reference the script's own directory so editors / linters do not
// flag this file as unused. (Also useful for future re-runs that want
// to import helpers from this file.)
export const __t1c_browser_check_self = __dirname;
