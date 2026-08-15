import './globals.css';

export const metadata = {
  title: 'Tra cứu Bảng công HRP',
  description: 'Hệ thống tra cứu bảng công và phiếu lương HRP',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
