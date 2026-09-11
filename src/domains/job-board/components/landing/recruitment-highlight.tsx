'use client';

import { useState, useEffect, useCallback } from 'react';

interface RecruitmentHighlightProps {
  className?: string;
}

/** Y10.4/UI04g fix: Ảnh thật Unsplash free stock theo chủ đề slide (thay SVG illustration + loại bỏ 2 dòng header text). */
/** Y10.10/UI04i r6: 5 text dịch vụ HRP + 3 ảnh loop (công nhân Việt Nam thật). */
const SLIDES = [
  {
    // Slide 1: Cung ứng và cho thuê lại lao động thời vụ — công nhân vận hành máy móc
    image: '/images/hero/cong-nhan-may-moc.jpg',
    title: 'Cung ứng và cho thuê lại lao động thời vụ ngắn hạn, dài hạn',
    desc: '',
  },
  {
    // Slide 2: Dịch vụ gia công và kiểm tra, phân loại linh kiện điện tử — công nhân may
    image: '/images/hero/may-sai-gon.jpg',
    title: 'Dịch vụ gia công và kiểm tra, phân loại linh kiện điện tử',
    desc: '',
  },
  {
    // Slide 3: Dịch vụ giới thiệu lao động, việc làm — đóng gói Hà Nội
    image: '/images/hero/dong-goi-ha-noi.jpg',
    title: 'Dịch vụ giới thiệu lao động, việc làm',
    desc: '',
  },
  {
    // Slide 4: Dịch vụ bốc xếp hàng hóa — công nhân vận hành máy móc (loop ảnh 1)
    image: '/images/hero/cong-nhan-may-moc.jpg',
    title: 'Dịch vụ bốc xếp hàng hóa',
    desc: '',
  },
  {
    // Slide 5: Dịch vụ đóng gói hàng hoá — công nhân đóng gói Hà Nội (loop ảnh 3)
    image: '/images/hero/dong-goi-ha-noi.jpg',
    title: 'Dịch vụ đóng gói hàng hoá',
    desc: '',
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

                  {/* Text — Y10.12/UI04l: bỏ in đậm, dùng font-medium + leading chậm */}
                  <div className="mt-3">
                    <h4 className="font-head text-sm font-medium text-on-primary leading-snug">
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
