import Link from 'next/link';

const footerLinks = [
  { href: '/ve-chung-toi', label: 'Về chúng tôi' },
  { href: '/dieu-khoan', label: 'Điều khoản' },
  { href: '/bao-mat', label: 'Bảo mật' },
  { href: '/lien-he', label: 'Liên hệ' },
];

export function GlobalFooter() {
  return (
    <footer className="bg-surface-container-low border-t border-line py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span className="text-2xl font-extrabold tracking-tight text-brand-dark">
              HR<span className="text-primary">P</span>
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="flex flex-wrap justify-center gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-on-surface-variant hover:text-primary transition-colors text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-on-surface-variant text-sm text-center md:text-right">
            &copy; {new Date().getFullYear()} HRP — Hệ sinh thái nhân sự toàn diện.
          </p>
        </div>
      </div>
    </footer>
  );
}
