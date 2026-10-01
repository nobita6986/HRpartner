/**
 * app/fonts/local-fonts.ts — SELF-HOSTED font loaders shared by app/layout.tsx and
 * any page/component that needs the brand typography. Built on top of next/font/local,
 * so production builds do NOT reach out to fonts.googleapis.com / fonts.gstatic.com
 * at build or render time (PR #73 build blocker root cause).
 *
 * Provenance of the TTF/OFL.txt files committed under app/fonts/:
 *   - Source repo   : https://github.com/google/fonts
 *   - License       : SIL Open Font License 1.1 (see app/fonts/{BeVietnamPro,Inter}-OFL.txt)
 *   - Asset registry: app/fonts/FONTS_PROVENANCE.txt (size + sha256 per file)
 *
 * CSS variable contracts preserved from the next/font/google outlaws that previously lived
 * in app/layout.tsx — DO NOT RENAME without a coordinated token update:
 *   --font-bvp   -> Be Vietnam Pro (regular 400 / medium 500 / semibold 600 / bold 700)
 *   --font-inter -> Inter (variable font, opsz 14..32 + wght 100..900; the layout used
 *                   the static weights 400/500/600, which sit comfortably inside the
 *                   variable axis range)
 *
 * Subsets and weight lists are pinned to the same discrete set the layout previously
 * passed to next/font/google, so existing token tests that grep `variable: '--font-bvp'`
 * keep passing and the design-token alias block in app/globals.css stays authoritative.
 */
import localFont from 'next/font/local';

export const beVietnamPro = localFont({
  src: [
    { path: './BeVietnamPro-Regular.ttf',  weight: '400', style: 'normal' },
    { path: './BeVietnamPro-Medium.ttf',   weight: '500', style: 'normal' },
    { path: './BeVietnamPro-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: './BeVietnamPro-Bold.ttf',     weight: '700', style: 'normal' },
  ],
  variable: '--font-bvp',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

export const inter = localFont({
  src: './Inter[opsz,wght].ttf',
  variable: '--font-inter',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});