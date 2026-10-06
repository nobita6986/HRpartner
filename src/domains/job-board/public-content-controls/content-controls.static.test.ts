/**
 * public-content-controls/content-controls.static.test.ts — static source-analysis
 * fence for the new module.
 *
 * Reads the source as text and greps for forbidden patterns. The fence is the
 * primary security invariant for Phase A: it locks in the no-script /
 * no-marquee / no-dangerouslySetInnerHTML / no-event-handler-attribute / no-eval
 * posture before Phase B mounts the component. Mirrors the convention of
 * `sections-policy.test.ts` and `public-listing.static.test.ts` in this repo.
 *
 * The fence:
 *   - strips block and line comments before matching so docblocks that
 *     describe a forbidden pattern do not self-FAIL;
 *   - checks only files inside `src/domains/job-board/public-content-controls/`
 *     to keep the blast radius tight;
 *   - asserts the animation CSS classes are referenced by the component
 *     and the `prefers-reduced-motion: reduce` rule is present.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MODULE_DIR = 'src/domains/job-board/public-content-controls';

function readText(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), 'utf8').replace(/\r\n/g, '\n');
}

function strip(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^\s*\*.*$/gm, '');
}

function listModuleFiles(): string[] {
  const abs = join(process.cwd(), MODULE_DIR);
  const out: string[] = [];
  for (const entry of readdirSync(abs)) {
    const full = join(abs, entry);
    if (statSync(full).isFile()) {
      out.push(join(MODULE_DIR, entry));
    }
  }
  return out.sort();
}

const files = listModuleFiles();
const tsxFile = files.find(
  (f) => /[/\\]sticky-announcement\.tsx$/.test(f),
);
const cssFile = files.find((f) => f.endsWith('sticky-announcement.module.css'));
const indexFile = files.find((f) => f.endsWith('index.ts'));
const typesFile = files.find((f) => f.endsWith('types.ts'));
const urlSafetyFile = files.find((f) => f.endsWith('url-safety.ts'));
const revisionFile = files.find((f) => f.endsWith('revision.ts'));
const animationFile = files.find((f) => f.endsWith('animation.ts'));
const gateFile = files.find((f) => f.endsWith('news-section-gate.ts'));

describe('module shape', () => {
  it('exposes all eight expected files', () => {
    expect(tsxFile).toBeDefined();
    expect(cssFile).toBeDefined();
    expect(indexFile).toBeDefined();
    expect(typesFile).toBeDefined();
    expect(urlSafetyFile).toBeDefined();
    expect(revisionFile).toBeDefined();
    expect(animationFile).toBeDefined();
    expect(gateFile).toBeDefined();
  });
});

describe('no unsafe HTML / script / event handler / eval', () => {
  for (const f of files) {
    // The fence is a production-code invariant. Test files contain regex
    // patterns that LOOK like the forbidden tokens (e.g. /<script\b/) —
    // those are the assertion patterns, not the production code. We
    // exclude `.test.ts` and `.test.tsx` so the fence does not false-
    // positive on the test surface.
    if (f.endsWith('.css') || f.endsWith('.md')) continue;
    if (f.endsWith('.test.ts') || f.endsWith('.test.tsx')) continue;
    const code = strip(readText(f));

    it(`${f}: KHÔNG có dangerouslySetInnerHTML`, () => {
      expect(code).not.toMatch(/dangerouslySetInnerHTML/);
    });

    it(`${f}: KHÔNG có <script`, () => {
      expect(code).not.toMatch(/<script\b/);
    });

    it(`${f}: KHÔNG có on*={ ... } JSX prop (onerror, onload, onclick, onmouseover)`, () => {
      // Match JSX-style event-handler attributes only (string literal `onerror=` is fine if it
      // never ends up in the rendered tree; we never reach this because the rendered HTML has
      // no event handlers — the FCE is at the source level).
      expect(code).not.toMatch(/\bon(?:error|load|click|mouseover|focus|blur|submit)\s*=\s*[{"]/);
    });

    it(`${f}: KHÔNG có eval(`, () => {
      // `eval` is sometimes referenced in docblocks warning against it. The strip helper
      // already removed those. We assert on the code body.
      expect(code).not.toMatch(/\beval\s*\(/);
    });

    it(`${f}: KHÔNG có Function(`, () => {
      expect(code).not.toMatch(/\bnew\s+Function\s*\(/);
    });
  }
});

describe('CTA URL safety — no script / data / vbscript / file literals anywhere in the module', () => {
  for (const f of files) {
    if (f.endsWith('.css') || f.endsWith('.md')) continue;
    const code = strip(readText(f));
    // Allow test files to contain the literal `javascript:` inside a string for
    // negative-path assertions; the production code path (`url-safety.ts`) is
    // allowed to throw on it. The fence is about runtime rendering, not test
    // coverage.
    if (f.endsWith('.test.ts') || f.endsWith('.test.tsx')) continue;

    it(`${f}: KHÔNG có string literal 'javascript:' ngoài rejection message`, () => {
      // The url-safety.ts file is allowed to mention the literal inside an
      // InvalidCtaUrlError message; everything else must be free of it.
      if (f === urlSafetyFile) return;
      expect(code).not.toMatch(/['"`]javascript:/i);
    });

    it(`${f}: KHÔNG có string literal 'data:text/html'`, () => {
      expect(code).not.toMatch(/['"`]data:text\/html/i);
    });

    it(`${f}: KHÔNG có string literal 'vbscript:'`, () => {
      expect(code).not.toMatch(/['"`]vbscript:/i);
    });
  }
});

describe('sticky-announcement.tsx — composition invariants', () => {
  it('component is a Client Component (`use client`)', () => {
    const code = readText(tsxFile!);
    expect(code).toMatch(/^\s*['"]use client['"]\s*;?/m);
  });

  it('CTA anchor carries `target="_blank" rel="noopener noreferrer"` for external URLs', () => {
    const code = readText(tsxFile!);
    expect(code).toMatch(/target=\{ctaTarget\}/);
    expect(code).toMatch(/rel=\{ctaRel\}/);
  });

  it('CTA target switches between _self and _blank', () => {
    const code = readText(tsxFile!);
    expect(code).toContain(`ctaTarget = externalCta ? '_blank' : '_self'`);
  });

  it('CTA rel is `noopener noreferrer` only for external links', () => {
    const code = readText(tsxFile!);
    expect(code).toContain(`ctaRel = externalCta ? 'noopener noreferrer' : undefined`);
  });

  it('aria-label="Thông báo" is present on the wrapper', () => {
    const code = readText(tsxFile!);
    expect(code).toContain('aria-label="Thông báo"');
  });

  it('aria-live="polite" is present on the wrapper', () => {
    const code = readText(tsxFile!);
    expect(code).toContain('aria-live="polite"');
  });

  it('dismiss button has aria-label="Đóng thông báo"', () => {
    const code = readText(tsxFile!);
    expect(code).toContain('aria-label="Đóng thông báo"');
  });

  it('message is rendered as a text node, not via innerHTML', () => {
    const code = readText(tsxFile!);
    // The message appears inside `<span ...>{message}</span>` or `{message}` text braces.
    // We assert the message prop is interpolated as a value, not concatenated into a string.
    // Allow optional whitespace/newlines between `>` and `{message}` and between
    // `{message}` and `<` so multi-line JSX (used after the T1C CORRECTION 1/1
    // refactor that promoted the span to a longer-form JSX block) still matches.
    expect(code).toMatch(/>\s*\{message\}\s*</);
  });

  it('does NOT use innerHTML / innerText / outerHTML', () => {
    const code = readText(tsxFile!);
    expect(code).not.toMatch(/\b(innerHTML|outerHTML)\b/);
  });

  it('does NOT include a <marquee> tag (after stripping comments)', () => {
    const code = strip(readText(tsxFile!));
    expect(code).not.toMatch(/<marquee/i);
  });
});

describe('sticky-announcement.module.css — animation + reduced-motion invariants', () => {
  it('declares a keyframe `hrpStickyAnnouncementBlink` for BLINK', () => {
    const css = readText(cssFile!);
    expect(css).toMatch(/@keyframes\s+hrpStickyAnnouncementBlink/);
  });

  it('declares a keyframe `hrpStickyAnnouncementMarquee` for MARQUEE', () => {
    const css = readText(cssFile!);
    expect(css).toMatch(/@keyframes\s+hrpStickyAnnouncementMarquee/);
  });

  it('applies BLINK opacity to the background pseudo-element, not the container', () => {
    const css = readText(cssFile!);
    expect(css).toMatch(/\.hrpStickyAnnouncementAnimBlink::before\s*\{\s*animation:\s*hrpStickyAnnouncementBlink/);
    expect(css).toMatch(/\.hrpStickyAnnouncementAnimBlink\s*\{\s*animation:\s*none/);
    expect(css).toMatch(/--sticky-background-opacity/);
    expect(css).toMatch(/box-shadow:\s*0 -2px 8px color-mix\(in srgb, rgb\(0 0 0 \/ 8%\) var\(--sticky-background-opacity\), transparent\)/);
    // The marquee `animation` declaration is NOT in CSS — it is applied
    // inline by the marquee effect after the px distances are measured.
    // v1.2 fence for this contract lives below in the v1.2 describe block.
    for (const selector of [
      '.hrpStickyAnnouncement',
      '.hrpStickyAnnouncementCta',
      '.hrpStickyAnnouncementDismiss',
    ]) {
      const rule = css.match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
      expect(rule).not.toMatch(/\bopacity\s*:/);
    }
  });

  it('keeps the visible dismiss control inside the bar while preserving a 44px hit area', () => {
    const css = readText(cssFile!);
    const barRule = css.match(/\.hrpStickyAnnouncement\s*\{([^}]*)\}/)?.[1] ?? '';
    const backgroundRule = css.match(/\.hrpStickyAnnouncement::before\s*\{([^}]*)\}/)?.[1] ?? '';
    const dismissRule = css.match(/\.hrpStickyAnnouncementDismiss\s*\{([^}]*)\}/)?.[1] ?? '';
    const hitAreaRule = css.match(/\.hrpStickyAnnouncementDismiss::after\s*\{([^}]*)\}/)?.[1] ?? '';

    const barHeight = Number(barRule.match(/min-height:\s*(\d+)px/)?.[1]);
    const backgroundInsets = backgroundRule.match(
      /inset:\s*(\d+)px 0 calc\(env\(safe-area-inset-bottom,\s*0px\)\s*\+\s*(\d+)px\)/,
    );
    const buttonWidth = Number(dismissRule.match(/width:\s*(\d+)px/)?.[1]);
    const buttonHeight = Number(dismissRule.match(/height:\s*(\d+)px/)?.[1]);
    const touchWidth = Number(hitAreaRule.match(/width:\s*(\d+)px/)?.[1]);
    const touchHeight = Number(hitAreaRule.match(/height:\s*(\d+)px/)?.[1]);

    expect(backgroundInsets).not.toBeNull();
    expect(touchWidth).toBeGreaterThanOrEqual(44);
    expect(touchHeight).toBeGreaterThanOrEqual(44);
    expect(dismissRule).not.toMatch(/min-(?:width|height)/);
    expect(buttonHeight).toBeLessThanOrEqual(
      barHeight - Number(backgroundInsets?.[1]) - Number(backgroundInsets?.[2]),
    );
    expect(buttonWidth).toBeLessThanOrEqual(barHeight);
  });

  it('does NOT include `<marquee` in the stylesheet (after stripping comments)', () => {
    // CSS block comments may legitimately mention the legacy element to
    // warn against it. The fence strips them before matching.
    const css = strip(readText(cssFile!));
    expect(css).not.toMatch(/<marquee/i);
  });

  it('overrides BLINK and MARQUEE to `animation: none` under prefers-reduced-motion', () => {
    const css = readText(cssFile!);
    expect(css).toMatch(
      /@media\s+\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?animation:\s*none/,
    );
  });

  it('uses `env(safe-area-inset-bottom)` for safe-area-aware bottom padding', () => {
    const css = readText(cssFile!);
    expect(css).toContain('env(safe-area-inset-bottom');
  });

  it('is `position: fixed` at the bottom', () => {
    const css = readText(cssFile!);
    expect(css).toMatch(/position:\s*fixed/);
    expect(css).toMatch(/bottom:\s*0/);
  });
});

describe('sticky-announcement.module.css — MARQUEE viewport-aware single-text entry invariants (T1C CORRECTION 1/1, v1.2)', () => {
  /*
   * v1.2 regression fence for the production bug "bản sao xuất hiện giữa
   * viewport khi bản đầu còn đang chạy" reported on
   * `vieclammienbac.com.vn` after PR #105. The v1.0 double-group /
   * `width: 200%` / `width: 50%` shape and the v1.1 `translateX(±100%)`
   * shape are BOTH forbidden: the v1.1 shape measured the keyframe
   * distance against the MESSAGE width (CSS `translateX(<%>)` is
   * relative to the element's own width), so a 600px message on a
   * 1440px desktop viewport only traveled ±600px instead of ±1440px,
   * never starting fully outside the right edge. v1.2 publishes
   * `--marquee-shift = viewport.width + message.width` (px) from a
   * ResizeObserver in the TSX, and the keyframe consumes it as
   * `translateX(calc(-1 * var(--marquee-shift)))`. The single-text
   * invariants (no track, no clone, no group) are kept from v1.1.
   */

  it('does NOT define a `hrpStickyAnnouncementTrack` rule (single-text has no track wrapper)', () => {
    const css = strip(readText(cssFile!));
    expect(css).not.toMatch(/\.hrpStickyAnnouncementTrack\s*\{/);
  });

  it('does NOT define a `hrpStickyAnnouncementMarqueeGroup` rule (no clone, no group)', () => {
    const css = strip(readText(cssFile!));
    expect(css).not.toMatch(/\.hrpStickyAnnouncementMarqueeGroup\s*\{/);
  });

  it('does NOT use the legacy `width: 200%` shape on any selector (forbidden by the CORRECTION 1/1 contract)', () => {
    const css = strip(readText(cssFile!));
    expect(css).not.toMatch(/width:\s*200%/);
  });

  it('does NOT use the legacy `width: 50%` shape on any selector (forbidden by the CORRECTION 1/1 contract)', () => {
    const css = strip(readText(cssFile!));
    expect(css).not.toMatch(/width:\s*50%/);
  });

  it('does NOT use `translateX(100%)` on the marquee message (was a v1.1 bug — % is relative to message width, not viewport)', () => {
    const css = strip(readText(cssFile!));
    const rule =
      css.match(
        /\.hrpStickyAnnouncementMessageMarquee\s*\{([^}]*)\}/,
      )?.[1] ?? '';
    // `translateX(100%)` on a `width: max-content` element shifts by one
    // full message width, which is NOT the viewport width. That is the
    // exact bug v1.2 fixes. The pre-mount SSR fallback is
    // `transform: translateX(100%)` (still % of message width, but only
    // painted before the keyframe / JS effect kicks in — the keyframe
    // runs from `translateX(0)` and the JS publishes `--marquee-shift`
    // so the 100% stop is pixel-accurate against the viewport).
    expect(rule).not.toMatch(/translateX\(\s*100%\s*\)/);
  });

  it('does NOT use `translateX(-100%)` in the keyframe (was a v1.1 bug — % is relative to message width, not viewport)', () => {
    const css = strip(readText(cssFile!));
    const keyframe =
      css.match(
        /@keyframes\s+hrpStickyAnnouncementMarquee\s*\{([\s\S]*?)\n\}/,
      )?.[1] ?? '';
    expect(keyframe).not.toMatch(/translateX\(\s*-100%\s*\)/);
  });

  it('keyframe starts at `translateX(var(--marquee-shift-start))` and ends at `translateX(calc(-1 * var(--marquee-shift-end)))` — the v1.2 viewport-aware contract', () => {
    const css = strip(readText(cssFile!));
    const keyframe =
      css.match(
        /@keyframes\s+hrpStickyAnnouncementMarquee\s*\{([\s\S]*?)\n\}/,
      )?.[1] ?? '';
    // Chrome normalizes `translateX(0)` to `translateX(0px)` when the rule is
    // serialized via `CSSKeyframesRule.cssRules`, but the source CSS uses
    // `0` (no unit). The fence accepts both forms.
    expect(keyframe).toMatch(
      /0%\s*\{[\s\S]*?transform:\s*translateX\(\s*var\(\s*--marquee-shift-start\s*,\s*0px\s*\)\s*\)/,
    );
    expect(keyframe).toMatch(
      /100%\s*\{[\s\S]*?transform:\s*translateX\(\s*calc\(\s*-1\s*\*\s*var\(\s*--marquee-shift-end\s*,\s*0px\s*\)\s*\)/,
    );
  });

  it('forbids the legacy single-var `--marquee-shift` keyframe shape (v1.1 used it; v1.2 splits into start/end)', () => {
    const css = strip(readText(cssFile!));
    const keyframe =
      css.match(
        /@keyframes\s+hrpStickyAnnouncementMarquee\s*\{([\s\S]*?)\n\}/,
      )?.[1] ?? '';
    expect(keyframe).not.toMatch(/var\(\s*--marquee-shift\s*,\s*0px\s*\)/);
  });

  it('marquee message has `width: max-content` so a long message is never truncated by its own rule', () => {
    const css = strip(readText(cssFile!));
    const rule =
      css.match(
        /\.hrpStickyAnnouncementMessageMarquee\s*\{([^}]*)\}/,
      )?.[1] ?? '';
    expect(rule).toMatch(/width:\s*max-content/);
  });

  it('marquee message has `white-space: nowrap` so a long message stays on one line', () => {
    const css = strip(readText(cssFile!));
    const rule =
      css.match(
        /\.hrpStickyAnnouncementMessageMarquee\s*\{([^}]*)\}/,
      )?.[1] ?? '';
    expect(rule).toMatch(/white-space:\s*nowrap/);
  });

  it('marquee message is NOT clipped by its own `overflow: hidden` (viewport does the clipping)', () => {
    const css = strip(readText(cssFile!));
    const rule =
      css.match(
        /\.hrpStickyAnnouncementMessageMarquee\s*\{([^}]*)\}/,
      )?.[1] ?? '';
    expect(rule).not.toMatch(/\boverflow:\s*hidden\b/);
  });

  it('marquee viewport clips overflow so messages longer than the viewport are visually clipped, not truncated', () => {
    const css = strip(readText(cssFile!));
    const rule =
      css.match(
        /\.hrpStickyAnnouncementAnimMarquee\s+\.hrpStickyAnnouncementViewport\s*\{([^}]*)\}/,
      )?.[1] ?? '';
    expect(rule).toMatch(/overflow:\s*hidden/);
  });

  it('marquee animation is armed inline by the JS effect — the `animation` property is NOT declared in CSS so the keyframe does not start before `--marquee-shift-{start,end}` are published', () => {
    const css = strip(readText(cssFile!));
    const baseRule =
      css.match(
        /\.hrpStickyAnnouncementMessageMarquee\s*\{([^}]*)\}/,
      )?.[1] ?? '';
    expect(baseRule).not.toMatch(/\banimation:\s*hrpStickyAnnouncementMarquee\b/);
  });
});

describe('index.ts — public surface re-exports', () => {
  it('re-exports the StickyAnnouncement component', () => {
    const code = readText(indexFile!);
    expect(code).toMatch(/export\s*\{[^}]*StickyAnnouncement[^}]*\}\s*from\s*['"]\.\/sticky-announcement['"]/);
  });

  it('re-exports normalizeCtaUrl and InvalidCtaUrlError', () => {
    const code = readText(indexFile!);
    expect(code).toMatch(/normalizeCtaUrl/);
    expect(code).toMatch(/InvalidCtaUrlError/);
  });

  it('re-exports resolveNewsSectionGate', () => {
    const code = readText(indexFile!);
    expect(code).toMatch(/resolveNewsSectionGate/);
  });

  it('does NOT re-export computeContentRevision from the barrel (server-only)', () => {
    // `computeContentRevision` lives in `revision.server.ts` and is intentionally
    // NOT re-exported through the public barrel — exposing it would force any
    // client that touches the barrel to drag `node:crypto` into the client
    // bundle. Server callers must import it directly from
    // `./revision.server`.
    const code = readText(indexFile!);
    expect(code).not.toMatch(/from\s+['"]\.\/revision\.server['"]/);
  });

  it('does NOT export internal helper files directly', () => {
    const code = readText(indexFile!);
    // The internal helper files are exported only through index.ts, never
    // re-exported as their own barrel. This keeps the public surface
    // minimal and prevents Phase B from depending on internals.
    expect(code).not.toMatch(/from\s+['"]\.\/sticky-announcement\.module\.css['"]/);
  });
});

describe('Zod schemas — single source of truth', () => {
  it('StickyAnnouncementSchema lives in types.ts', () => {
    const code = readText(typesFile!);
    expect(code).toMatch(/export\s+const\s+StickyAnnouncementSchema\s*=\s*z\.object/);
  });

  it('NewsSectionToggleSchema lives in types.ts', () => {
    const code = readText(typesFile!);
    expect(code).toMatch(/export\s+const\s+NewsSectionToggleSchema\s*=\s*z\.object/);
  });

  it('contentRevision regex constrains to safe characters', () => {
    const code = readText(typesFile!);
    // Look for a `.regex(` call inside the contentRevision field block.
    expect(code).toMatch(/contentRevision[\s\S]*?\.regex\(/);
  });
});
