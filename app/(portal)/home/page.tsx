'use client';

import { useState } from 'react';
import Link from 'next/link';

const SERVICES = [
  {
    icon: 'groups',
    title: 'Dịch vụ Tuyển dụng',
    desc: 'Kết nối ứng viên tiềm năng với cơ hội phù hợp. Quy trình tuyển dụng nhanh chóng, hiệu quả.',
  },
  {
    icon: 'insights',
    title: 'Giải pháp Nhân sự',
    desc: 'Hệ thống quản lý nhân sự toàn diện. Chấm công, tính lương, đánh giá hiệu suất.',
  },
  {
    icon: 'school',
    title: 'Đào tạo & Phát triển',
    desc: 'Cung cấp các chương trình đào tạo kỹ năng, phát triển năng lực nhân viên.',
  },
];

const WHY_HRP = [
  'Mạng lưới kết nối rộng lớn',
  'Công nghệ hiện đại',
  'Dịch vụ tận tâm',
];

const QUICK_TAGS = ['Công nhân lắp ráp', 'May mặc', 'Kho vận', 'Cơ khí'];
const PROVINCES = ['Tất cả tỉnh/thành', 'Bắc Ninh', 'Bắc Giang', 'Hà Nội', 'Hải Phòng', 'Đà Nẵng', 'TP. Hồ Chí Minh'];

export default function HomePage() {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState(PROVINCES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const params = new URLSearchParams();
    if (keyword.trim()) params.set('q', keyword.trim());
    if (location && location !== PROVINCES[0]) params.set('loc', location);

    setTimeout(() => {
      setSubmitting(false);
      const query = params.toString();
      setMessage(
        query
          ? `Đang tìm: ${keyword || '*'}${location !== PROVINCES[0] ? ` tại ${location}` : ''}`
          : 'Vui lòng nhập từ khóa hoặc chọn tỉnh/thành',
      );
    }, 300);
  }

  return (
    <div className="flex flex-col">

      {/* Hero Section */}
      <section className="relative bg-surface-container-low py-16 md:py-24 lg:py-32 flex items-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, var(--color-primary-soft) 0%, rgba(253, 241, 236, 0.8) 50%, transparent 100%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
          <div className="max-w-2xl">

            {/* Badge */}
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-3xl text-primary">hub</span>
              <span className="text-brand-red font-bold text-xl tracking-wider uppercase">
                Kết Nối Để Thành Công
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-on-surface leading-tight mb-6">
              Nền tảng Kết nối Nhân sự &amp; Quản lý Hàng đầu
            </h1>

            {/* Sub */}
            <p className="text-base sm:text-lg text-on-surface-variant mb-8">
              Tìm việc làm phù hợp, hỗ trợ doanh nghiệp tuyển dụng nhanh và quản lý nhân sự hiệu quả.
            </p>

            {/* Search Box */}
            <form
              onSubmit={handleSearch}
              className="bg-surface p-3 sm:p-4 rounded-xl shadow-card mb-6"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    search
                  </span>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Công việc muốn tìm: lắp ráp, may mặc, kho vận..."
                    aria-label="Từ khóa tìm việc"
                    className="w-full pl-10 pr-4 py-3 sm:py-3.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none text-base"
                  />
                </div>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  aria-label="Tỉnh/thành"
                  className="sm:w-44 py-3 sm:py-3.5 px-3 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface bg-surface text-base"
                >
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary text-on-primary px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg font-semibold text-base sm:text-lg hover:bg-primary-dark transition-colors shadow-lg whitespace-nowrap disabled:opacity-70"
                >
                  {submitting ? 'Đang tìm...' : 'Tìm việc ngay'}
                </button>
              </div>
              {message && (
                <p className="mt-3 text-sm text-on-surface-variant" role="status">
                  {message}
                </p>
              )}
            </form>

            {/* Quick links */}
            <div className="flex items-center gap-2 flex-wrap text-sm text-on-surface-variant">
              <span className="font-semibold">Tìm nhiều:</span>
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setKeyword(tag)}
                  className="bg-primary-soft text-primary px-3 py-1 rounded-full hover:bg-primary hover:text-on-primary transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 md:py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl font-bold text-on-surface">Dịch vụ Chính</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {SERVICES.map((s) => (
              <div key={s.title} className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-primary-soft rounded-full">
                  <span className="material-symbols-outlined text-4xl text-primary">{s.icon}</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-on-surface">{s.title}</h3>
                <p className="text-on-surface-variant">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA CTV */}
      <section className="py-16 bg-primary-soft">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-on-surface mb-4">
            Trở thành Cộng tác viên HRP
          </h2>
          <p className="text-on-surface-variant text-lg mb-8 max-w-2xl mx-auto">
            Giới thiệu thành viên, nhận tiền ngay dễ dàng. Hoa hồng hấp dẫn, không giới hạn thu nhập.
          </p>
          <Link
            href="/ctv-portal"
            className="inline-block bg-primary text-on-primary px-8 py-3.5 rounded-full font-semibold hover:bg-primary-dark transition-colors shadow-lg"
          >
            Tìm hiểu thêm
          </Link>
        </div>
      </section>

      {/* Why HRP + Contact */}
      <section className="py-16 bg-surface-container-low border-t border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">

            {/* Why */}
            <div>
              <h2 className="text-2xl font-bold text-on-surface mb-8">Tại sao chọn HRP?</h2>
              <ul className="space-y-4">
                {WHY_HRP.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <svg className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-base sm:text-lg text-on-surface-variant">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-on-surface mb-8">Liên hệ với Chúng tôi</h2>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    placeholder="Tên"
                    type="text"
                  />
                  <input
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    placeholder="Email"
                    type="email"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    placeholder="Số điện thoại"
                    type="tel"
                  />
                  <input
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-md focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                    placeholder="Tin nhắn"
                    type="text"
                  />
                </div>
                <button
                  className="w-full bg-primary text-on-primary py-3 rounded-md font-semibold hover:bg-primary-dark transition-colors"
                  type="submit"
                >
                  Gửi ngay
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
