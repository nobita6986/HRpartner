import './globals.css';
import { Be_Vietnam_Pro, Inter } from 'next/font/google';

// Font chuẩn Warm Professionalism (stitch/warm_professionalism/DESIGN.md — STEP-09):
// Be Vietnam Pro cho headline/body, Inter cho label. Gán qua CSS variable --font-bvp /
// --font-inter, globals.css map sang --font-head / --font-body / --font-label.
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bvp',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'Tra cứu Bảng công HRP',
  description: 'Hệ thống tra cứu bảng công và phiếu lương HRP',
  icons: {
    icon: '/favicon.ico',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'HRPartner Worker',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${inter.variable}`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
