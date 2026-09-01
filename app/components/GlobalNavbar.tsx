'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

interface AuthUser {
  userId: string;
  role: string;
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } finally {
    window.location.href = '/';
  }
}

const navLinks = [
  { href: '/', label: 'Việc làm' },
  { href: '/ctv-portal', label: 'Cộng tác viên' },
  { href: '/ve-chung-toi', label: 'Về chúng tôi' },
  { href: '/lien-he', label: 'Liên hệ' },
];

function Avatar({ userId }: { userId: string }) {
  const initials = userId.slice(0, 2).toUpperCase();
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold select-none"
      style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
      title={userId}
    >
      {initials}
    </div>
  );
}

export function GlobalNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const checkAuth = useCallback(async () => {
    setAuthLoading(true);
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-user-menu]')) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [userMenuOpen]);

  return (
    <header
      className="bg-surface shadow-sm sticky top-0 z-50"
      style={{ borderBottom: '1px solid var(--color-line)' }}
    >
      {/* go-live-08 / RQ-18: phần tử nhận tiêu điểm đầu tiên của mọi trang portal.
          Dùng <a> chứ không dùng <Link>: đây là mỏ neo trong cùng trang, trình
          duyệt tự chuyển tiêu điểm tới đích có tabIndex={-1}, không cần định
          tuyến phía client. */}
      <a className="hrp-skip" href="#hrp-main">
        Bỏ qua điều hướng, tới nội dung chính
      </a>
      {/* go-live-08 / RQ-20: chuỗi class này PHẢI trùng chuỗi container của
          `app/(portal)/page.tsx` để hai mép trái trùng nhau ở mọi breakpoint. */}
      <div className="w-full max-w-[1600px] mx-auto px-6 md:px-[5%]">
        <div className="flex justify-between items-center h-20">

          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="HRP Logo" style={{ height: '40px', width: 'auto' }} />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-medium transition-colors"
                style={{ color: 'var(--color-on-surface-variant)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-on-surface-variant)')}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth Area */}
          <div className="hidden md:flex items-center gap-3">
            {authLoading ? (
              <div
                className="w-9 h-9 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--color-surface-container)' }}
              />
            ) : user ? (
              /* Logged in: avatar + dropdown */
              <div className="relative" data-user-menu>
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors hover:bg-surface-container"
                  aria-label="Tài khoản"
                  aria-expanded={userMenuOpen}
                >
                  <Avatar userId={user.userId} />
                  <span
                    className="text-sm font-medium hidden lg:block"
                    style={{ color: 'var(--color-on-surface)' }}
                  >
                    {user.userId}
                  </span>
                  <span className="material-symbols-outlined text-base" style={{ color: 'var(--color-on-surface-variant)' }}>
                    expand_more
                  </span>
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-lg border py-2 z-50"
                    style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-outline-variant)' }}
                  >
                    <div className="px-4 py-2 border-b border-outline-variant/50 mb-1">
                      <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Đăng nhập với</p>
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-on-surface)' }}>
                        {user.userId}
                      </p>
                      <span
                        className="inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
                      >
                        {user.role}
                      </span>
                    </div>
                    <Link
                      href="/ctv"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--color-on-surface-variant)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface-container-low)';
                        e.currentTarget.style.color = 'var(--color-on-surface)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--color-on-surface-variant)';
                      }}
                    >
                      <span className="material-symbols-outlined text-base">dashboard</span>
                      Bảng điều khiển
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--color-error)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-error-container)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <span className="material-symbols-outlined text-base">logout</span>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Not logged in */
              <>
                <Link
                  href="/login"
                  className="hrp-btn-outline hrp-focus font-medium px-4 min-h-11 inline-flex items-center border rounded-lg"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="hrp-btn-primary hrp-focus nav-item-lift font-semibold px-5 min-h-11 inline-flex items-center rounded-lg"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden flex items-center p-2"
            style={{ color: 'var(--color-on-surface-variant)' }}
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
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

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div
            className="md:hidden py-4 space-y-1"
            style={{ borderTop: '1px solid var(--color-line)' }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-2 py-2.5 font-medium"
                style={{ color: 'var(--color-on-surface-variant)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div
              className="pt-4 flex flex-col gap-2 mt-2"
              style={{ borderTop: '1px solid var(--color-line)' }}
            >
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-2 py-2">
                    <Avatar userId={user.userId} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>
                        {user.userId}
                      </p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
                      >
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/ctv"
                    className="block text-center px-4 py-2.5 rounded-lg font-medium border"
                    style={{ borderColor: 'var(--color-outline-variant)', color: 'var(--color-on-surface-variant)' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Bảng điều khiển
                  </Link>
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="block w-full text-center px-4 py-2.5 rounded-lg font-medium"
                    style={{ color: 'var(--color-error)' }}
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hrp-btn-outline hrp-focus flex items-center justify-center px-4 min-h-11 font-medium border rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    className="hrp-btn-primary hrp-focus nav-item-lift flex items-center justify-center px-4 min-h-11 font-semibold rounded-lg"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
