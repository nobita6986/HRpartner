/**
 * HRP Brand Tokens — HRP Orange (#f97316) với WCAG-compliant variants.
 *
 * Quy tắc WCAG 2.1 AA:
 *   - Body text 14-18px: contrast ≥ 4.5:1
 *   - Large text 18px+ hoặc 14px+ bold: contrast ≥ 3:1
 *   - UI components: contrast ≥ 3:1
 *
 * Cấu trúc 3 lớp theo HRP v3.0 §4.5:
 *   1. PRIMITIVE — raw palette (orange-50 → orange-900 + neutral)
 *   2. SEMANTIC — primitive map sang use-case (primary, accent, danger, success)
 *   3. COMPONENT — semantic compose vào component (button, badge, card)
 *
 * Tại sao KHÔNG dùng orange-500 (#f97316) làm text color:
 *   - Trên nền trắng: orange-500 có contrast ~3.4:1 (FAIL cho body text < 18px)
 *   - PHẢI dùng orange-700 (#c2410c) hoặc orange-800 (#9a3412) cho text
 *   - orange-500 chỉ dùng cho BACKGROUND, BORDER, ICON ≥ 24px, hoặc TEXT ≥ 18px BOLD
 */

export const primitive = {
  // HRP Orange (theo TailwindCSS orange scale, primary brand = orange-500)
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',  // ⭐ PRIMARY BRAND
    600: '#ea580c',
    700: '#c2410c',  // WCAG-safe text on white (4.7:1)
    800: '#9a3412',
    900: '#7c2d12',
    950: '#431407',
  },
  // Neutral (slate — tránh pure black để dễ chịu cho mắt)
  neutral: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  // Semantic colors (HRP cảnh báo / xác nhận)
  success: { 50: '#f0fdf4', 500: '#22c55e', 700: '#15803d', 900: '#14532d' },
  warning: { 50: '#fefce8', 500: '#eab308', 700: '#a16207', 900: '#713f12' },
  danger:  { 50: '#fef2f2', 500: '#ef4444', 700: '#b91c1c', 900: '#7f1d1d' },
  info:    { 50: '#eff6ff', 500: '#3b82f6', 700: '#1d4ed8', 900: '#1e3a8a' },
} as const;

export const semantic = {
  // Primary brand
  brand: {
    bg: primitive.orange[500],
    bgHover: primitive.orange[600],
    bgActive: primitive.orange[700],
    // Text trên white background — dùng orange-700 cho contrast 4.7:1
    text: primitive.orange[700],
    textOnBrand: primitive.neutral[0],  // white trên orange-500/600
    // Border / ring
    border: primitive.orange[300],
    borderStrong: primitive.orange[500],
    // Subtle (badge background)
    subtleBg: primitive.orange[50],
    subtleText: primitive.orange[800],
  },

  // Surface (backgrounds)
  surface: {
    page: primitive.neutral[50],
    card: primitive.neutral[0],
    sunken: primitive.neutral[100],
    border: primitive.neutral[200],
    borderStrong: primitive.neutral[300],
  },

  // Text
  text: {
    primary: primitive.neutral[900],
    secondary: primitive.neutral[700],
    tertiary: primitive.neutral[500],
    disabled: primitive.neutral[400],
    inverse: primitive.neutral[0],
  },

  // Status
  status: {
    success: { bg: primitive.success[50], text: primitive.success[700], border: primitive.success[500] },
    warning: { bg: primitive.warning[50], text: primitive.warning[700], border: primitive.warning[500] },
    danger:  { bg: primitive.danger[50],  text: primitive.danger[700],  border: primitive.danger[500] },
    info:    { bg: primitive.info[50],    text: primitive.info[700],    border: primitive.info[500] },
  },
} as const;

/**
 * Component tokens — derive từ semantic. UI nên dùng level này.
 */
export const component = {
  button: {
    primary: {
      bg: semantic.brand.bg,
      bgHover: semantic.brand.bgHover,
      text: semantic.brand.textOnBrand,
      ring: semantic.brand.border,
    },
    secondary: {
      bg: primitive.neutral[0],
      bgHover: primitive.neutral[50],
      text: semantic.text.primary,
      border: semantic.surface.border,
    },
    ghost: {
      text: semantic.brand.text,
      textHover: semantic.brand.bgHover,
    },
    danger: {
      bg: primitive.danger[500],
      bgHover: primitive.danger[700],
      text: primitive.neutral[0],
    },
  },
  badge: {
    // Badge dùng subtle background — không cần contrast mạnh
    brand: { bg: semantic.brand.subtleBg, text: semantic.brand.subtleText },
    neutral: { bg: primitive.neutral[100], text: primitive.neutral[700] },
    success: semantic.status.success,
    warning: semantic.status.warning,
    danger: semantic.status.danger,
    info: semantic.status.info,
  },
  card: {
    bg: semantic.surface.card,
    border: semantic.surface.border,
    borderHover: semantic.brand.border,
    shadow: '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 0 rgb(0 0 0 / 0.1)',
    shadowHover: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
} as const;

export type HRPTokens = typeof primitive;

/**
 * Helper: trả về className cho badge theo variant. Kết hợp với Tailwind utility.
 *
 * Ví dụ:
 *   <span className={badgeClasses.brand}>HRP</span>
 */
export const badgeClasses = {
  brand: 'bg-orange-50 text-orange-800 border border-orange-200',
  neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  success: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  danger: 'bg-red-50 text-red-700 border border-red-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
} as const;
