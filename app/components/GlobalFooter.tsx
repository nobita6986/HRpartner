import Link from 'next/link';
import { ContactForm } from './ContactForm';

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

const SERVICES = [
  'Cung ứng và cho thuê lại lao động thời vụ ngắn hạn, dài hạn',
  'Dịch vụ gia công và kiểm tra, phân loại linh kiện điện tử',
  'Dịch vụ giới thiệu lao động, việc làm',
  'Dịch vụ bốc xếp hàng hóa',
  'Dịch vụ đóng gói hàng hoá',
];

export function GlobalFooter() {
  const year = new Date().getFullYear();
  return (
    <footer data-section="footer" className="border-t border-line bg-primary-fixed/20">
      {/* VIS-06: inner container 1080px */}
      <div className="mx-auto w-full max-w-[1080px] px-4 md:px-6 py-12">
        {/* RQ-03 / STEP-04: 3 cột desktop — Công ty / Dịch vụ / Liên hệ */}
        <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-3">
          {/* Cột 1: Công ty */}
          <div className="flex flex-col gap-3">
            <h3 className="font-label text-label-md font-bold uppercase tracking-wider text-on-surface">
              Công ty
            </h3>
            <p className="font-body text-body-md font-semibold text-on-surface">
              CÔNG TY TNHH HRP VIỆT NAM
            </p>
            <p className="font-body text-body-sm text-on-surface-variant">HRP VIET NAM COMPANY LIMITED</p>
            <p className="font-body text-body-sm text-on-surface-variant">HRP Co.,Ltd</p>
            <p className="mt-2 font-body text-body-sm text-on-surface-variant leading-relaxed">
              Thuê Khu đất DV Tân Ngọc, Thống Nhất, Bắc Kê, Xã Bình Tuyền, Tỉnh Phú Thọ, Việt Nam
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <a
                href="tel:02112216999"
                className="font-body text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Hotline: 0211 2216999
              </a>
              <a
                href="tel:0964984866"
                className="font-body text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Hotline: 0964 984 866
              </a>
              <a
                href="mailto:nhaluchrp@gmail.com"
                className="font-body text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Email: nhaluchrp@gmail.com
              </a>
              <a
                href="https://hrpvietnam.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-body-sm text-primary hover:text-primary-dark transition-colors"
              >
                Website: https://hrpvietnam.com/
              </a>
            </div>
          </div>

          {/* Cột 2: Dịch vụ */}
          <div className="flex flex-col gap-3">
            <h3 className="font-label text-label-md font-bold uppercase tracking-wider text-on-surface">
              Dịch vụ
            </h3>
            <ul className="flex list-none flex-col gap-2 font-body text-body-sm text-on-surface-variant">
              {SERVICES.map((service) => (
                <li key={service} className="flex items-start gap-2">
                  <span
                    className="material-symbols-outlined mt-0.5 text-xs text-primary shrink-0"
                    aria-hidden="true"
                  >
                    circle
                  </span>
                  <span>{service}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 3: Liên hệ */}
          <div className="flex flex-col gap-3">
            <h3 className="font-label text-label-md font-bold uppercase tracking-wider text-on-surface">
              Thông tin liên hệ
            </h3>
            {/* RQ-05 / STEP-04: ContactForm presentational disabled */}
            <ContactForm disabled={true} />
          </div>
        </div>
      </div>

      {/* RQ-07 / STEP-04: Copyright runtime năm — bỏ "Phiên bản 6.0" */}
      <div className="border-t border-line">
        <div className="mx-auto w-full max-w-[1080px] px-4 md:px-6 flex flex-col items-center justify-between gap-2 py-4 text-on-surface-variant md:flex-row">
          <p className="font-body text-body-md">
            &copy; {year} HRP — Hệ sinh thái nhân sự toàn diện.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1" aria-label="Footer links">
            {footerLinks.map((link) => (
              <FooterLinkItem key={link.label} link={link} />
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
