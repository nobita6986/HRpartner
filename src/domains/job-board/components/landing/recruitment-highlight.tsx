'use client';

import { useState, useEffect, useCallback } from 'react';

interface RecruitmentHighlightProps {
  className?: string;
}

/** Y10.4/UI04g fix: Ảnh thật Unsplash free stock theo chủ đề slide (thay SVG illustration + loại bỏ 2 dòng header text). */
/** Y10.8/UI04i r4: Ảnh Vietnamese / Asian worker lao động phổ thông — thay ảnh Tây cũ. */
const SLIDES = [
  {
    // Slide 1: Đăng công việc trong 5 phút — công nhân vận hành máy (Bernd Dittrich, Hanoi VN)
    image: 'https://images.unsplash.com/photo-1771098124487-efcfcba07d08?auto=format&fit=crop&w=400&h=280&q=80',
    title: 'Đăng công việc trong 5 phút',
    desc: 'Không cần tài khoản doanh nghiệp. Chỉ cần mô tả và đăng — ứng viên tự tìm đến bạn.',
  },
  {
    // Slide 2: HRP lọc hồ sơ thông minh — Vietnamese woman weaving machine (Brayden Prato)
    image: 'https://images.unsplash.com/photo-1715375397897-1e5e94d69ec3?auto=format&fit=crop&w=400&h=280&q=80',
    title: 'HRP lọc hồ sơ thông minh',
    desc: 'Theo địa điểm, ca làm, mức lương thực tế. Chỉ ứng viên phù hợp mới được giới thiệu.',
  },
  {
    // Slide 3: Chỉ gặp ứng viên đã sàng lọc — HR manager handshake interview (asian)
    image: 'https://images.unsplash.com/photo-1758518730384-be3d205838e8?auto=format&fit=crop&w=400&h=280&q=80',
    title: 'Chỉ gặp ứng viên đã sàng lọc',
    desc: 'Ứng viên đã đồng ý phỏng vấn và sẵn sàng. Bạn tiết kiệm thời gian, hiệu quả cao hơn.',
  },
] as const;

/** Y10.4/UI04g fix: bỏ header + ảnh thật Unsplash theo chủ đề. */
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
              {SLIDES.map((slide, i) => (
                <div
                  key={slide.title}
                  className="w-full flex-shrink-0"
                  aria-hidden={i !== current}
                >
                  {/* Ảnh thật Unsplash theo chủ đề */}
                  <div className="relative h-44 w-full overflow-hidden rounded-2xl sm:h-48 md:h-52">
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="h-full w-full object-cover"
                      loading={i === 0 ? 'eager' : 'lazy'}
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
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
              ))}
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
