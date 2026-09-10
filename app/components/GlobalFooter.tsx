import Link from 'next/link';

interface FooterLink {
  href: string;
  label: string;
  type: 'route' | 'disabled';
}

const footerLinks: FooterLink[] = [
  { href: '/ve-chung-toi', label: 'Về chúng tôi', type: 'route' },
  { href: '#', label: 'Điều khoản', type: 'disabled' },
  { href: '#', label: 'Chính sách bảo mật', type: 'disabled' },
  { href: '#', label: 'Liên hệ', type: 'disabled' },
  { href: '/ctv-portal', label: 'Cộng tác viên', type: 'route' },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  if (link.type === 'disabled') {
    return (
      <button
        type="button"
        aria-disabled="true"
        title="Đang phát triển"
        tabIndex={-1}
        className="cursor-not-allowed text-left text-on-surface-variant opacity-70"
      >
        {link.label}
      </button>
    );
  }
  return (
    <Link href={link.href} className="text-on-surface-variant hover:text-primary transition-colors">
      {link.label}
    </Link>
  );
}

export function GlobalFooter() {
  return (
    <footer data-section="footer" className="border-t border-line bg-surface-container-lowest">
      {/* STEP-07/RQ-01: Container max-w-[1200px] mx-auto px-4 md:px-6 */}
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-12">
        <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2">
              <img src="/logo.png" alt="HRP Logo" style={{ height: '40px', width: 'auto' }} />
            </Link>
            <p className="mt-4 max-w-md font-body text-body-md text-on-surface-variant">
              HRP Việt Nam — hệ sinh thái nhân sự toàn diện, kết nối người lao động với các nhà máy và
              khu công nghiệp hàng đầu cả nước.
            </p>
          </div>

          <div className="flex flex-col gap-3 font-body text-body-md">
            <h4 className="font-label text-label-md font-bold uppercase tracking-wider text-on-surface">
              HRP Việt Nam
            </h4>
            {footerLinks.map((link) => (
              <FooterLinkItem key={link.label} link={link} />
            ))}
          </div>

          <div className="flex flex-col gap-3 font-body text-body-md">
            <h4 className="font-label text-label-md font-bold uppercase tracking-wider text-on-surface">
              Đối tác
            </h4>
            <Link
              href="/ctv-portal"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              Đăng ký cộng tác viên
            </Link>
            <a
              href="mailto:hello@hrpartner.vn"
              className="text-on-surface-variant hover:text-primary transition-colors"
            >
              hello@hrpartner.vn
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        {/* STEP-07/RQ-01: Container max-w-[1200px] mx-auto px-4 md:px-6 */}
        <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 flex flex-col items-center justify-between gap-2 py-4 text-on-surface-variant md:flex-row">
          <p className="font-body text-body-md">
            &copy; {new Date().getFullYear()} HRP — Hệ sinh thái nhân sự toàn diện.
          </p>
          <p className="font-body text-body-sm">Phiên bản 6.0 — thiết kế bởi HRP Studio.</p>
        </div>
      </div>
    </footer>
  );
}
