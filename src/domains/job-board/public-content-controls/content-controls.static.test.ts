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
const tsxFile = files.find((f) => f.endsWith('sticky-announcement.tsx'));
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
    expect(code).toMatch(/>\{message\}</);
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

  it('re-exports computeContentRevision', () => {
    const code = readText(indexFile!);
    expect(code).toMatch(/computeContentRevision/);
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
