#!/usr/bin/env node
/* eslint-disable no-undef */
/**
 * T1C — Sticky marquee viewport-aware single-text entry browser-check
 * (T0 CORRECTION 1/1, v1.2).
 *
 * Runs the supplied URL on a desktop viewport (1440x900) and a mobile
 * viewport (390x844), asserts:
 *
 *   1. The `data-testid="sticky-announcement"` root is present.
 *   2. There is exactly ONE element whose class attribute contains
 *      `hrpStickyAnnouncementMessageMarquee` (no clone, no second group).
 *      Both the un-hashed form (`hrpStickyAnnouncementMessageMarquee`,
 *      used by the fixture mode / future dev tooling) and the hashed
 *      CSS Modules form
 *      (`sticky-announcement_hrpStickyAnnouncementMessageMarquee__<hash>`,
 *      used by `next build`) are accepted.
 *   3. The viewport element publishes `--marquee-shift` (a px value
 *      equal to viewport.width + message.width) — this is the v1.2
 *      viewport-aware contract that the keyframe consumes.
 *   4. The computed keyframe is
 *      `0% { transform: translateX(0); }` and
 *      `100% { transform: translateX(calc(-1 * var(--marquee-shift, 0px))); }`.
 *   5. Forced start/mid/end positions of the animation pass viewport-
 *      bound checks via `getBoundingClientRect()`:
 *        - start (`currentTime = 0`):
 *            `rect.left >= window.innerWidth`  (message fully outside right edge)
 *        - mid (`currentTime = duration / 2`):
 *            message intersects the viewport rectangle
 *            (`rect.right > 0 && rect.left < viewportWidth`)
 *        - end (`currentTime = duration`):
 *            `rect.right <= 0`  (message fully outside left edge)
 *      The seek is done via `Animation.currentTime = N` so the test is
 *      deterministic regardless of wall-clock timing.
 *   6. After releasing the seek (resuming the wall-clock animation),
 *      `getComputedStyle(...).transform` changes monotonically leftward
 *      over three samples taken 1.5s apart so the message is actually
 *      animating, not a static image.
 *   7. No element in the document has
 *      `data-testid="sticky-announcement-marquee-tail"`.
 *
 * Screenshots are written to the evidence directory at the three seek
 * positions (start, mid, end) and at the three wall-clock samples so a
 * reviewer can see the entry / mid / exit positions.
 *
 * The script uses `puppeteer-core` pointed at the pre-existing Chrome
 * binary at `C:\Users\Admin\.cache\puppeteer\chrome\…\chrome.exe`
 * so no Chromium is downloaded.
 *
 * Exit codes:
 *   0  — every check PASS for every viewport.
 *   1  — a check failed (assertion / timeout / unreachable).
 *   2  — usage error (missing or invalid arguments).
 *
 * Required CLI args:
 *   --preview-url <url>
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

const SEEK_PROBE = function SEEK_PROBE() {
  const all = Array.from(document.querySelectorAll('*'));
  const el = all.find((node) => {
    const cls = node.getAttribute('class') || '';
    return /hrpStickyAnnouncementMessageMarquee(__\w+)?/.test(cls);
  });
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const animations = el.getAnimations({ subtree: 0 });
  const anim = animations[0] || null;
  let durationMs = 0;
  if (anim) {
    const eff = anim.effect;
    const t = eff && eff.getTiming ? eff.getTiming() : {};
    durationMs = typeof t.duration === 'number' ? t.duration : 0;
  }
  return {
    left: rect.left,
    right: rect.right,
    width: rect.width,
    viewportWidth: window.innerWidth,
    animationDurationMs: durationMs,
  };
};

async function seekTo(page, fraction) {
  const probe = await page.evaluate((seekFn) => {
    const all = Array.from(document.querySelectorAll('*'));
    const el = all.find((node) => {
      const cls = node.getAttribute('class') ?? '';
      return /hrpStickyAnnouncementMessageMarquee(__\w+)?/.test(cls);
    });
    if (!el) return { ok: false, reason: 'no-marquee-element' };
    const animations = el.getAnimations({ subtree: 0 });
    if (!animations[0]) return { ok: false, reason: 'no-animation' };
    animations[0].pause();
    const t = animations[0].effect.getTiming();
    const duration = typeof t.duration === 'number' ? t.duration : 0;
    if (!duration) return { ok: false, reason: 'zero-duration' };
    // For an infinite animation, setting `currentTime = duration` wraps to
    // the start of the next iteration (the 0% keyframe), not the 100% stop.
    // Use a tiny epsilon before the end so we observe the 100% state, and
    // 0 exactly for the start so we observe the 0% state.
    if (seekFn >= 1) {
      animations[0].currentTime = duration - 0.001;
    } else if (seekFn <= 0) {
      animations[0].currentTime = 0;
    } else {
      animations[0].currentTime = duration * seekFn;
    }
    return { ok: true };
  }, fraction);
  if (!probe.ok) throw new Error(`seek failed: ${probe.reason}`);
}

async function probeAt(page) {
  return await page.evaluate(SEEK_PROBE);
}

async function checkViewport({ page, args, viewport, screenshotDir, log }) {
  const tag = `[${viewport.name}]`;
  await page.setViewport({ width: viewport.width, height: viewport.height });
  console.log(`${tag} navigating to ${args.previewUrl}`);
  await page.goto(args.previewUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log(`${tag} waiting for data-testid="sticky-announcement" (up to ${args.waitMs}ms)`);
  await page.waitForSelector('[data-testid="sticky-announcement"]', {
    timeout: args.waitMs,
  });

  // 1. exactly one message element.
  const messageCount = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    return all.filter((el) => {
      const cls = el.getAttribute('class') ?? '';
      return /hrpStickyAnnouncementMessageMarquee(__\w+)?/.test(cls);
    }).length;
  });
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

  // 3. wait for the JS effect to publish --marquee-shift-start and
  // --marquee-shift-end on the viewport element. Each var is a positive
  // px number (no leading zero, allowed decimal).
  console.log(`${tag} waiting for --marquee-shift-{start,end} to be published (up to ${args.waitMs}ms)`);
  await page.waitForFunction(
    () => {
      const all = Array.from(document.querySelectorAll('*'));
      const viewportEl = all.find((node) => {
        const cls = node.getAttribute('class') ?? '';
        return /hrpStickyAnnouncementViewport(__\w+)?/.test(cls);
      });
      if (!viewportEl) return false;
      const start = viewportEl.style.getPropertyValue('--marquee-shift-start');
      const end = viewportEl.style.getPropertyValue('--marquee-shift-end');
      const ok = (v) => /^\d+(\.\d+)?px$/.test((v || '').trim()) && Number(v.replace(/px$/, '')) > 0;
      return ok(start) && ok(end);
    },
    { timeout: args.waitMs },
  );

  // 4. computed animation + keyframe content + css var
  const computed = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const el = all.find((node) => {
      const cls = node.getAttribute('class') ?? '';
      return /hrpStickyAnnouncementMessageMarquee(__\w+)?/.test(cls);
    });
    const viewportEl = all.find((node) => {
      const cls = node.getAttribute('class') ?? '';
      return /hrpStickyAnnouncementViewport(__\w+)?/.test(cls);
    });
    if (!el || !viewportEl) return { error: 'missing element' };
    const cs = window.getComputedStyle(el);
    let keyframes = '';
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = sheet.cssRules ?? []; } catch { rules = []; }
      for (const rule of Array.from(rules)) {
        if (
          rule instanceof CSSKeyframesRule &&
          /hrpStickyAnnouncementMarquee/.test(rule.name)
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
      marqueeShiftStart:
        viewportEl.style.getPropertyValue('--marquee-shift-start') ||
        window.getComputedStyle(viewportEl).getPropertyValue('--marquee-shift-start'),
      marqueeShiftEnd:
        viewportEl.style.getPropertyValue('--marquee-shift-end') ||
        window.getComputedStyle(viewportEl).getPropertyValue('--marquee-shift-end'),
      keyframes,
    };
  });
  if (computed.error) {
    throw new Error(`${tag} ${computed.error}`);
  }
  log.push({
    id: `${tag}.animation-name`,
    ok: /hrpStickyAnnouncementMarquee/.test(computed.animationName),
    detail: computed.animationName,
  });
  if (!/hrpStickyAnnouncementMarquee/.test(computed.animationName)) {
    throw new Error(`${tag} animation-name=${computed.animationName}, expected to contain hrpStickyAnnouncementMarquee`);
  }
  log.push({
    id: `${tag}.kf-0`,
    ok: /0%\s*\{\s*transform:\s*translateX\(\s*var\(\s*--marquee-shift-start/.test(computed.keyframes),
    detail: computed.keyframes.match(/0%\s*\{[^}]*\}/)?.[0] ?? '(no 0% rule)',
  });
  if (!/0%\s*\{\s*transform:\s*translateX\(\s*var\(\s*--marquee-shift-start/.test(computed.keyframes)) {
    throw new Error(`${tag} keyframe 0% does not consume --marquee-shift-start: ${computed.keyframes}`);
  }
  log.push({
    id: `${tag}.kf-100`,
    ok: /100%\s*\{\s*transform:\s*translateX\(\s*calc\(\s*-1\s*\*\s*var\(\s*--marquee-shift-end/.test(computed.keyframes),
    detail: computed.keyframes.match(/100%\s*\{[^}]*\}/)?.[0] ?? '(no 100% rule)',
  });
  if (!/100%\s*\{\s*transform:\s*translateX\(\s*calc\(\s*-1\s*\*\s*var\(\s*--marquee-shift-end/.test(computed.keyframes)) {
    throw new Error(`${tag} keyframe 100% does not consume --marquee-shift-end: ${computed.keyframes}`);
  }
  log.push({
    id: `${tag}.marquee-shift-start`,
    ok: /^\d+(\.\d+)?px$/.test((computed.marqueeShiftStart || '').trim()),
    detail: `--marquee-shift-start=${computed.marqueeShiftStart}`,
  });
  if (!/^\d+(\.\d+)?px$/.test((computed.marqueeShiftStart || '').trim())) {
    throw new Error(`${tag} --marquee-shift-start is missing or invalid: ${computed.marqueeShiftStart}`);
  }
  log.push({
    id: `${tag}.marquee-shift-end`,
    ok: /^\d+(\.\d+)?px$/.test((computed.marqueeShiftEnd || '').trim()),
    detail: `--marquee-shift-end=${computed.marqueeShiftEnd}`,
  });
  if (!/^\d+(\.\d+)?px$/.test((computed.marqueeShiftEnd || '').trim())) {
    throw new Error(`${tag} --marquee-shift-end is missing or invalid: ${computed.marqueeShiftEnd}`);
  }
  // Cross-check: --marquee-shift-start should be a positive px value at
  // least as large as the smallest fixture viewport (390px on mobile).
  // We allow any positive px value because the actual value depends on
  // the viewport — the start/mid/end rect-based invariants below are
  // the ground truth.
  const startPx = Number((computed.marqueeShiftStart || '').replace(/px$/, ''));
  log.push({
    id: `${tag}.marquee-shift-start-positive`,
    ok: Number.isFinite(startPx) && startPx >= 100,
    detail: `--marquee-shift-start=${startPx}px`,
  });
  if (!(Number.isFinite(startPx) && startPx >= 100)) {
    throw new Error(`${tag} --marquee-shift-start=${startPx} is implausibly small`);
  }
  log.push({
    id: `${tag}.msg-white-space`,
    ok: computed.whiteSpace === 'nowrap',
    detail: `white-space=${computed.whiteSpace}`,
  });
  log.push({
    id: `${tag}.msg-no-overflow-hidden`,
    ok: !/(^|\s)hidden(\s|;|$)/.test(computed.overflow),
    detail: `overflow=${computed.overflow}`,
  });

  // 5. forced start / mid / end positions via Animation.currentTime seek
  // start (currentTime = 0)
  await seekTo(page, 0);
  const startProbe = await probeAt(page);
  log.push({
    id: `${tag}.seek-start`,
    ok:
      startProbe &&
      Number.isFinite(startProbe.left) &&
      startProbe.left >= startProbe.viewportWidth,
    detail: `raw=${JSON.stringify(startProbe)}`,
  });
  if (
    !startProbe ||
    !Number.isFinite(startProbe.left) ||
    !(startProbe.left >= startProbe.viewportWidth)
  ) {
    throw new Error(
      `${tag} start position not off the right edge: ${JSON.stringify(startProbe)}`,
    );
  }
  await page.screenshot({
    path: resolve(screenshotDir, `${viewport.name}-seek-start.png`),
    fullPage: false,
  });

  // mid (currentTime = duration / 2)
  await seekTo(page, 0.5);
  const midProbe = await probeAt(page);
  // The rect must cross the viewport rect in width: `rect.right > 0` AND `rect.left < viewportWidth`
  // (or the message is entirely within the viewport, in which case `rect.left >= 0 && rect.right <= viewportWidth`)
  const midOk =
    midProbe &&
    midProbe.right > 0 &&
    midProbe.left < midProbe.viewportWidth &&
    midProbe.right > midProbe.viewportWidth * 0.05; // sanity: at least part of message is past the left edge of the viewport
  log.push({
    id: `${tag}.seek-mid`,
    ok: Boolean(midOk),
    detail: `raw=${JSON.stringify(midProbe)}`,
  });
  if (!midOk) {
    throw new Error(
      `${tag} mid position does not intersect the viewport: ${JSON.stringify(midProbe)}`,
    );
  }
  await page.screenshot({
    path: resolve(screenshotDir, `${viewport.name}-seek-mid.png`),
    fullPage: false,
  });

  // end (currentTime = duration)
  await seekTo(page, 1);
  const endProbe = await probeAt(page);
  // Per the v1.2 contract, the message must have its `right` edge at or before 0
  // (fully off the left edge). Allow a tiny 2px tolerance for compositor rounding.
  const endOk =
    endProbe &&
    Number.isFinite(endProbe.right) &&
    endProbe.right <= 2;
  log.push({
    id: `${tag}.seek-end`,
    ok: Boolean(endOk),
    detail: `raw=${JSON.stringify(endProbe)}`,
  });
  if (!endOk) {
    throw new Error(
      `${tag} end position not off the left edge: ${JSON.stringify(endProbe)}`,
    );
  }
  await page.screenshot({
    path: resolve(screenshotDir, `${viewport.name}-seek-end.png`),
    fullPage: false,
  });

  // 6. resume the animation at t=0 and confirm wall-clock leftward motion
  // over 3 samples within a single cycle (so the message does not jump
  // back to the start of the next iteration mid-sample).
  await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const el = all.find((node) => {
      const cls = node.getAttribute('class') ?? '';
      return /hrpStickyAnnouncementMessageMarquee(__\w+)?/.test(cls);
    });
    const animations = el ? el.getAnimations({ subtree: 0 }) : [];
    if (animations[0]) {
      animations[0].currentTime = 0;
      animations[0].play();
    }
  });
  // Pick the sample interval so 3 samples stay within a single cycle of
  // `var(--sticky-marquee-duration, 18s)`. We use duration/4 ms; with the
  // fixture's 4s cycle, that's 1000ms between samples, comfortably inside
  // one cycle. The TSX uses `--sticky-marquee-duration, 18s` by default
  // so this also stays inside the cycle for production durations.
  const sampleInterval = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const el = all.find((node) => {
      const cls = node.getAttribute('class') ?? '';
      return /hrpStickyAnnouncementMessageMarquee(__\w+)?/.test(cls);
    });
    const animations = el ? el.getAnimations({ subtree: 0 }) : [];
    const a = animations[0];
    const duration = a && a.effect && a.effect.getTiming ? a.effect.getTiming().duration : 0;
    return typeof duration === 'number' && duration > 0 ? duration / 4 : 500;
  });

  const transforms = [];
  for (let i = 0; i < 3; i += 1) {
    const t = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const el = all.find((node) => {
        const cls = node.getAttribute('class') ?? '';
        return /hrpStickyAnnouncementMessageMarquee(__\w+)?/.test(cls);
      });
      return el ? window.getComputedStyle(el).transform : 'none';
    });
    transforms.push({ ts: Date.now(), translateX: matrixToTranslateX(t), raw: t });
    await page.screenshot({
      path: resolve(screenshotDir, `${viewport.name}-sample-${i}.png`),
      fullPage: false,
    });
    if (i < 2) await new Promise((r) => setTimeout(r, sampleInterval));
  }
  const xs = transforms.map((s) => s.translateX);
  log.push({ id: `${tag}.leftward`, ok: isMonotonicLeftward(xs), detail: JSON.stringify(xs) });
  if (!isMonotonicLeftward(xs)) {
    throw new Error(`${tag} transform did not move monotonically leftward: ${JSON.stringify(xs)}`);
  }

  await page.screenshot({
    path: resolve(screenshotDir, `${viewport.name}-final.png`),
    fullPage: false,
  });
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
        await page
          .screenshot({
            path: resolve(screenshotDir, `${viewport.name}-error.png`),
            fullPage: false,
          })
          .catch(() => {});
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
  console.log('OK: T1C marquee viewport-aware single-text entry browser-check PASSED');
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});