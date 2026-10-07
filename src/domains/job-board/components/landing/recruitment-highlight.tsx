'use client';

import { useState, useEffect, useCallback } from 'react';
import type { HeroSlidePublic } from '@/src/domains/job-board/public-types';

interface RecruitmentHighlightProps {
  className?: string;
  /**
   * hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-07):
   * 5 slide do admin cấu hình. Khi `length === 0` (column null trong DB
   * hoặc admin chọn "Khôi phục mặc định") → fallback về `FALLBACK_SLIDES`
   * hardcoded. Auto-rotate 3500ms vẫn cứng; thứ tự 5 slot cứng.
   */
  slides?: HeroSlidePublic[];
}

/**
 * hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-07):
 * Hardcoded fallback — render khi DB column `homepage_settings.hero_slides`
 * null hoặc admin chọn "Khôi phục mặc định". KHÔNG đổi content v1; chỉ
 * nâng cấp shape để cùng kiểu với admin override (`title` + `desc`).
 */
const FALLBACK_SLIDES: ReadonlyArray<{
  url: string;
  title: string;
  desc: string;
}> = [
  {
    // Slide 1: Cung ứng và cho thuê lại lao động thời vụ — công nhân vận hành máy móc
    url: '/images/hero/cong-nhan-may-moc.jpg',
    title: 'Cung ứng và cho thuê lại lao động thời vụ ngắn hạn, dài hạn',
    desc: '',
  },
  {
    // Slide 2: Dịch vụ gia công và kiểm tra, phân loại linh kiện điện tử — công nhân may
    url: '/images/hero/may-sai-gon.jpg',
    title: 'Dịch vụ gia công và kiểm tra, phân loại linh kiện điện tử',
    desc: '',
  },
  {
    // Slide 3: Dịch vụ giới thiệu lao động, việc làm — đóng gói Hà Nội
    url: '/images/hero/dong-goi-ha-noi.jpg',
    title: 'Dịch vụ giới thiệu lao động, việc làm',
    desc: '',
  },
  {
    // Slide 4: Dịch vụ bốc xếp hàng hóa — công nhân vận hành máy móc (loop ảnh 1)
    url: '/images/hero/cong-nhan-may-moc.jpg',
    title: 'Dịch vụ bốc xếp hàng hóa',
    desc: '',
  },
  {
    // Slide 5: Dịch vụ đóng gói hàng hoá — công nhân đóng gói Hà Nội (loop ảnh 3)
    url: '/images/hero/dong-goi-ha-noi.jpg',
    title: 'Dịch vụ đóng gói hàng hoá',
    desc: '',
  },
];

/** Y10.4/UI04g fix: bỏ header + ảnh thật Unsplash theo chủ đề. */
export function RecruitmentHighlight({ className = '', slides = [] }: RecruitmentHighlightProps) {
  // hrp-t1c-t2-public-site-hero-slides-ctv-layout (T2 hotfix / STEP-07):
  // Khi admin override trống (length === 0) → fallback hardcoded. Khi
  // override non-empty → dùng URL từ Media row joined server-side.
  const activeSlides: ReadonlyArray<{ url: string; title: string; desc: string; alt: string }> =
    slides.length === 0
      ? FALLBACK_SLIDES.map((s) => ({ url: s.url, title: s.title, desc: s.desc, alt: s.title }))
      : slides.map((s) => ({
          url: s.url ?? '',
          title: s.title,
          desc: s.desc,
          alt: s.alt || s.title,
        }));

  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % activeSlides.length);
  }, [activeSlides.length]);

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
              {activeSlides.map((slide, i) => (
                <div
                  key={`${i}-${slide.title}`}
                  className="w-full flex-shrink-0"
                  aria-hidden={i !== current}
                >
                  {/* Ảnh thật Unsplash theo chủ đề */}
                  <div className="relative h-44 w-full overflow-hidden rounded-2xl sm:h-48 md:h-52">
                    <img
                      src={slide.url}
                      alt={slide.alt}
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
            {activeSlides.map((_, i) => (
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