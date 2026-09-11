'use client';

import { useState, useEffect, useCallback } from 'react';

interface RecruitmentHighlightProps {
  className?: string;
}

/** Y10.4/UI04g fix: SVG illustration theo chủ đề slide (thay ảnh picsum ngẫu nhiên). */
const SlideIllustration1 = () => (
  <svg viewBox="0 0 240 140" className="h-full w-full" aria-hidden="true">
    <defs>
      <linearGradient id="post-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fff7ed" />
        <stop offset="100%" stopColor="#ffedd5" />
      </linearGradient>
    </defs>
    <rect width="240" height="140" fill="url(#post-bg)" />
    {/* Clipboard (đăng công việc) */}
    <g transform="translate(80, 20)">
      <rect x="0" y="6" width="50" height="68" rx="4" fill="#ffffff" stroke="#a63b00" strokeWidth="2" />
      <rect x="14" y="0" width="22" height="12" rx="2" fill="#a63b00" />
      <rect x="8" y="22" width="34" height="3" rx="1" fill="#a63b00" opacity="0.5" />
      <rect x="8" y="32" width="28" height="3" rx="1" fill="#a63b00" opacity="0.5" />
      <rect x="8" y="42" width="32" height="3" rx="1" fill="#a63b00" opacity="0.5" />
      <rect x="8" y="52" width="22" height="3" rx="1" fill="#a63b00" opacity="0.5" />
      {/* Checkmark trên trang */}
      <circle cx="34" cy="48" r="10" fill="#a63b00" />
      <path d="M28 48 L32 52 L40 44" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    {/* Clock (5 phút) */}
    <g transform="translate(150, 35)">
      <circle cx="0" cy="0" r="28" fill="#ffffff" stroke="#a63b00" strokeWidth="2" />
      <circle cx="0" cy="0" r="2.5" fill="#a63b00" />
      <line x1="0" y1="0" x2="0" y2="-18" stroke="#a63b00" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="0" y1="0" x2="12" y2="6" stroke="#a63b00" strokeWidth="2" strokeLinecap="round" />
      {/* 5 phút indicator */}
      <text x="34" y="6" fontSize="18" fontWeight="700" fill="#a63b00">5'</text>
    </g>
  </svg>
);

const SlideIllustration2 = () => (
  <svg viewBox="0 0 240 140" className="h-full w-full" aria-hidden="true">
    <defs>
      <linearGradient id="filter-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="100%" stopColor="#fde68a" />
      </linearGradient>
    </defs>
    <rect width="240" height="140" fill="url(#filter-bg)" />
    {/* Filter funnel (lọc hồ sơ) */}
    <g transform="translate(120, 30)">
      <path d="M-50 -30 L50 -30 L20 10 L20 50 L-20 50 L-20 10 Z" fill="#ffffff" stroke="#92400e" strokeWidth="2" strokeLinejoin="round" />
      {/* Document feed vào funnel */}
      <rect x="-44" y="-40" width="22" height="28" rx="2" fill="#ffffff" stroke="#92400e" strokeWidth="1.5" />
      <rect x="22" y="-40" width="22" height="28" rx="2" fill="#ffffff" stroke="#92400e" strokeWidth="1.5" />
      <rect x="-11" y="-46" width="22" height="28" rx="2" fill="#ffffff" stroke="#92400e" strokeWidth="1.5" />
      {/* Output qua hơn */}
      <circle cx="-8" cy="62" r="8" fill="#dc2626" />
      <path d="M-13 62 L-10 65 L-3 58" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="62" r="8" fill="#dc2626" />
      <path d="M3 62 L6 65 L13 58" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

const SlideIllustration3 = () => (
  <svg viewBox="0 0 240 140" className="h-full w-full" aria-hidden="true">
    <defs>
      <linearGradient id="interview-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#dcfce7" />
        <stop offset="100%" stopColor="#bbf7d0" />
      </linearGradient>
    </defs>
    <rect width="240" height="140" fill="url(#interview-bg)" />
    {/* Handshake (gặp ứng viên) */}
    <g transform="translate(120, 70)">
      {/* Bàn tay trái */}
      <g transform="translate(-30, 0)">
        <circle cx="0" cy="-30" r="14" fill="#ffffff" stroke="#15803d" strokeWidth="2" />
        <path d="M-12 -10 L-12 30 L12 30 L12 -10 Z" fill="#ffffff" stroke="#15803d" strokeWidth="2" />
      </g>
      {/* Bàn tay phải */}
      <g transform="translate(30, 0)">
        <circle cx="0" cy="-30" r="14" fill="#ffffff" stroke="#15803d" strokeWidth="2" />
        <path d="M-12 -10 L-12 30 L12 30 L12 -10 Z" fill="#ffffff" stroke="#15803d" strokeWidth="2" />
      </g>
      {/* Bắt tay - hai bàn tay chạm nhau ở giữa */}
      <g transform="translate(0, 0)">
        <ellipse cx="0" cy="0" rx="22" ry="14" fill="#15803d" />
        <ellipse cx="0" cy="0" rx="14" ry="8" fill="#bbf7d0" />
      </g>
      {/* Checkmark phía trên */}
      <g transform="translate(60, -40)">
        <circle cx="0" cy="0" r="14" fill="#15803d" />
        <path d="M-6 0 L-2 4 L8 -6" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  </svg>
);

const SLIDES = [
  {
    Illustration: SlideIllustration1,
    title: 'Đăng công việc trong 5 phút',
    desc: 'Không cần tài khoản doanh nghiệp. Chỉ cần mô tả và đăng — ứng viên tự tìm đến bạn.',
  },
  {
    Illustration: SlideIllustration2,
    title: 'HRP lọc hồ sơ thông minh',
    desc: 'Theo địa điểm, ca làm, mức lương thực tế. Chỉ ứng viên phù hợp mới được giới thiệu.',
  },
  {
    Illustration: SlideIllustration3,
    title: 'Chỉ gặp ứng viên đã sàng lọc',
    desc: 'Ứng viên đã đồng ý phỏng vấn và sẵn sàng. Bạn tiết kiệm thời gian, hiệu quả cao hơn.',
  },
] as const;

/** Y10.3/UI04g: 3-slide image carousel với auto-play + navigation dots.
    Y10.4/UI04g fix: bỏ header + dùng SVG illustration theo chủ đề. */
export function RecruitmentHighlight({ className = '' }: RecruitmentHighlightProps) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    const id = setInterval(next, 3500);
    return () => clearInterval(id);
  }, [next]);

  const handleMouseEnter = () => clearInterval(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    (window as unknown as { _interval?: ReturnType<typeof setInterval> })._interval ?? 0
  );

  return (
    <div
      data-testid="recruitment-highlight"
      className={`relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-card backdrop-blur-md ${className}`}
    >
      <div className="flex flex-col gap-3 p-5">
        {/* Carousel */}
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          aria-label="Tính năng nổi bật"
          role="region"
        >
          {/* Slides */}
          <div className="relative overflow-hidden rounded-2xl">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${current * 100}%)` }}
            >
              {SLIDES.map((slide, i) => {
                const Illustration = slide.Illustration;
                return (
                  <div
                    key={slide.title}
                    className="w-full flex-shrink-0"
                    aria-hidden={i !== current}
                  >
                    {/* SVG illustration */}
                    <div className="relative h-44 w-full overflow-hidden rounded-2xl sm:h-48 md:h-52">
                      <Illustration />
                    </div>

                    {/* Text */}
                    <div className="mt-3">
                      <h4 className="font-head text-base font-bold text-on-primary leading-snug">
                        {slide.title}
                      </h4>
                      <p className="mt-1 text-sm text-white/80 leading-relaxed">
                        {slide.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dots navigation */}
          <div className="mt-3 flex items-center justify-center gap-2" role="tablist" aria-label="Chuyển slide">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === current}
                aria-label={`Slide ${i + 1}`}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60
                  ${i === current
                    ? 'w-5 bg-white'
                    : 'w-1.5 bg-white/40 hover:bg-white/60'
                  }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
