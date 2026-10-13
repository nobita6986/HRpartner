// e09-contrast-probe.js — independent WCAG 2.x contrast measurements
function srgbToLinear(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function relLum(hex) {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) throw new Error('bad hex: ' + hex);
  return 0.2126 * srgbToLinear(parseInt(m[1], 16)) +
         0.7152 * srgbToLinear(parseInt(m[2], 16)) +
         0.0722 * srgbToLinear(parseInt(m[3], 16));
}
function contrast(a, b) {
  const L1 = relLum(a), L2 = relLum(b);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

// 5 palettes: onPrimary (#ffffff) on primaryDark
const palettes = {
  'hrp':              { pd: '#a63b00' },
  'ocean-trust':      { pd: '#0d4a63' },
  'emerald-growth':   { pd: '#0d5a39' },
  'violet-future':    { pd: '#3f1f7a' },
  'executive-gold':   { pd: '#5d4a08' },
};
const onPrimary = '#ffffff';

console.log('=== WCAG 2.x Contrast: onPrimary on primaryDark ===');
for (const [k, t] of Object.entries(palettes)) {
  const r = contrast(onPrimary, t.pd);
  console.log(k + ': ' + r.toFixed(3) + ':1');
}
console.log();

// CTA
const onSurface = '#1a1c1b';
const cta = '#f07f1a';
const ctaDark = '#c2520a';
const onSurfaceCta = contrast(onSurface, cta);
const onPrimaryCtaDark = contrast(onPrimary, ctaDark);
console.log('=== CTA foreground contrast ===');
console.log('default: ' + onSurfaceCta.toFixed(3) + ':1 (' + onSurface + ' on ' + cta + ')');
console.log('hover: ' + onPrimaryCtaDark.toFixed(3) + ':1 (' + onPrimary + ' on ' + ctaDark + ')');
