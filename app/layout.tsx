import './globals.css';
import type { Metadata } from 'next';
import { beVietnamPro, inter } from './fonts/local-fonts';

export const metadata: Metadata = {
  title: {
    default: 'Việc làm miền Bắc - Kết nối để thành công - HRP',
    template: '%s · HRP',
  },
  description: 'Việc làm miền Bắc - Kết nối để thành công - HRP - nền tảng kết nối và quản lý nhân sự thuê ngoài',
  icons: {
    icon: '/favicon.ico',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'HRP Việc làm miền Bắc',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} ${inter.variable}`}>
      <head>
        {/* Material Symbols Outlined icon font is loaded via CSS <link> (NOT next/font/google);
            it remains a network fetch at runtime and is intentionally NOT a P1 build blocker.
            See docs/important/.../P3 debt list. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}