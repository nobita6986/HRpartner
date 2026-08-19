'use client';

import Link from 'next/link';
import { useState } from 'react';

const navLinks = [
  { href: '/jobs', label: 'Việc làm' },
  { href: '/dich-vu-tuyen-dung', label: 'Dịch vụ Tuyển dụng' },
  { href: '/giai-phap-nhan-su', label: 'Giải pháp Nhân sự' },
  { href: '/cong-tac-vien', label: 'Cộng tác viên' },
  { href: '/ve-chung-toi', label: 'Về chúng tôi' },
  { href: '/lien-he', label: 'Liên hệ' },
];

export function GlobalNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-surface shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">

          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-brand-dark">
                HR<span className="text-primary">P</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-on-surface-variant hover:text-primary font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Link
              href="/login"
              className="text-primary font-medium px-4 py-2 border border-outline-variant rounded-[--radius-DEFAULT] hover:bg-primary-soft transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="bg-primary text-on-primary px-5 py-2 rounded-[--radius-DEFAULT] font-semibold hover:bg-primary-dark transition-colors"
            >
              Đăng ký
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden flex items-center p-2 text-on-surface-variant hover:text-primary"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-line py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-2 py-2 text-on-surface-variant hover:text-primary font-medium"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 flex flex-col gap-2 border-t border-line mt-2">
              <Link
                href="/login"
                className="block text-center text-primary font-medium px-4 py-2 border border-outline-variant rounded-[--radius-DEFAULT]"
                onClick={() => setMobileOpen(false)}
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="block text-center bg-primary text-on-primary px-4 py-2 rounded-[--radius-DEFAULT] font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                Đăng ký
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
