import Link from 'next/link';
import { Briefcase, Cpu, Users, PackageOpen, Package } from 'lucide-react';
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

function FooterRouteLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="min-h-11 flex items-center text-on-surface-variant hover:text-primary transition-colors"
    >
      {label}
    </Link>
  );
}

function FooterDisabledText({ label }: { label: string }) {
  return (
    <span
      aria-disabled="true"
      tabIndex={-1}
      className="min-h-11 flex cursor-not-allowed items-center text-on-surface-variant opacity-70"
    >
      {label}
    </span>
  );
}

const SERVICES = [
  { label: 'Cung ứng và cho thuê lại lao động thời vụ ngắn hạn, dài hạn', Icon: Briefcase },
  { label: 'Dịch vụ gia công và kiểm tra, phân loại linh kiện điện tử', Icon: Cpu },
  { label: 'Dịch vụ giới thiệu lao động, việc làm', Icon: Users },
  { label: 'Dịch vụ bốc xếp hàng hóa', Icon: PackageOpen },
  { label: 'Dịch vụ đóng gói hàng hoá', Icon: Package },
];

export function GlobalFooter() {
  const year = new Date().getFullYear();
  return (
    <footer data-section="footer" className="border-t border-line bg-primary-fixed/35">
      {/* RQ-13 / VIS-06: inner container 1080px */}
      <div className="mx-auto w-full max-w-[1080px] px-4 md:px-6 py-12">
        {/* RQ-02: 3 cột desktop giữ thứ tự Công ty → Dịch vụ → Liên hệ */}
        <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-[1.1fr_1fr_1.1fr]">
          {/* Cột 1: Công ty */}
          <div className="flex flex-col justify-between gap-0">
            <h3 className="font-label text-label-md font-bold uppercase tracking-wider text-on-surface">
              CÔNG TY TNHH HRP VIỆT NAM
            </h3>
            <p className="font-body text-body-sm text-on-surface-variant">HRP VIET NAM COMPANY LIMITED</p>
            <p className="font-body text-body-sm text-on-surface-variant">
              Địa chỉ: Khu đất DV Tân Ngọc, Thống Nhất, Bắc Kế, Xã Bình Tuyền, Tỉnh Phú Thọ, Việt Nam
            </p>
            <div className="flex flex-col justify-between gap-0">
              <a
                href="tel:02112216999"
                className="min-h-11 flex items-center font-body text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Hotline: 0211 2216999
              </a>
              <a
                href="tel:0964984866"
                className="min-h-11 flex items-center font-body text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Hotline: 0964 984 866
              </a>
              <a
                href="mailto:nhanluchrp@gmail.com"
                className="min-h-11 flex items-center font-body text-body-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Email: nhanluchrp@gmail.com
              </a>
              <a
                href="https://hrpvietnam.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-11 flex items-center font-body text-body-sm text-primary hover:text-primary-dark transition-colors"
              >
                Website: https://hrpvietnam.com/
              </a>
            </div>
          </div>

          {/* Cột 2: Dịch vụ */}
          <div className="flex flex-col justify-between gap-0">
            <h3 className="font-label text-label-md font-bold uppercase tracking-wider text-on-surface">
              DANH MỤC DỊCH VỤ
            </h3>
            <ul className="flex list-none flex-col justify-between gap-0 font-body text-body-sm text-on-surface-variant">
              {SERVICES.map(({ label, Icon }) => (
                <li key={label} className="flex items-start gap-2">
                  <Icon
                    className="mt-0.5 shrink-0 text-primary"
                    size={16}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 3: Liên hệ */}
          <div className="flex flex-col gap-3">
            <h3 className="font-label text-label-md font-bold uppercase tracking-wider text-on-surface">
              THÔNG TIN LIÊN HỆ
            </h3>
            {/* RQ-14: Panel cam ấm wrap ContactForm */}
            <div className="rounded-2xl bg-primary-container/40 p-4 md:p-5">
              <ContactForm disabled={true} />
            </div>
          </div>
        </div>
      </div>

      {/* RQ-09 / STEP-05: Copyright — bỏ "Phiên bản 6.0" */}
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1080px] flex-col items-center justify-between gap-2 px-4 py-4 text-on-surface-variant md:flex-row md:px-6">
          <p className="font-body text-body-md">
            &copy; {year} HRP Việt Nam. Connecting for Success.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1" aria-label="Footer links">
            {footerLinks.map((link) =>
              link.type === 'route' ? (
                <FooterRouteLink key={link.label} href={link.href} label={link.label} />
              ) : (
                <FooterDisabledText key={link.label} label={link.label} />
              )
            )}
          </nav>
        </div>
      </div>
    </footer>
  );
}
