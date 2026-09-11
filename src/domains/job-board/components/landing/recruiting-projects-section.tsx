import Link from 'next/link';
import { HrMonogram } from './hr-monogram';

interface RecruitingProject {
  id: string;
  title: string;
  availableSlots: number;
}

interface RecruitingProjectsSectionProps {
  jobs: RecruitingProject[];
  buildHref: (jobId: string) => string;
}

/** Y10.2/UI04f: derive 2-letter monogram từ title project (vd "Yên Phong 3" -> "YP", "Khổng Tiên" -> "KT"). */
function deriveMonogram(title: string): string {
  // Lấy chữ cái đầu của mỗi từ, loại bỏ ký tự không phải chữ, lấy 2 ký tự đầu viết hoa.
  const words = title.split(/\s+/).filter(Boolean);
  const initials = words
    .map((w) => w.replace(/[^A-Za-zÀ-ỹ]/g, '').charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return initials || 'HRP';
}

/** Y10.5/UI04i r2: chọn ảnh stock (Unsplash, factory/warehouse worker theme).
 *  4 ảnh KHÁC nhau — mỗi card index 0-3, không hash (tránh trùng).
 *  Overlay mờ đen 65-75% để chữ trắng đọc rõ trên ảnh.
 *
 *  v1.12 (11/09/2026): chuyển từ Unsplash (tối) sang ảnh local sáng để tone
 *  nhẹ nhàng hơn. 4 ảnh hero/industrial local:
 *    0: hero/dong-goi-ha-noi.jpg (lao động nữ, sáng)
 *    1: hero/cong-nhan-may-moc.jpg (worker trong nhà)
 *    2: industrial-location-02.webp (xây dựng ngoài trời)
 *    3: industrial-location-03.webp (đường + KCN)
 *  Overlay đổi từ đen 70-75% → trắng 40% để giữ tone sáng, text đổi từ
 *  text-white → text-on-surface (đậm) để đọc rõ trên nền sáng.
 *
 *  Lưu ý: KHÔNG dùng industrial-location-04 (đang là ảnh HrpIntro).
 *  Lưu ý: KHÔNG dùng industrial-location-01 (giống 1 ảnh Areas section).
 *  Lưu ý: KHÔNG dùng 4 industrial-location-XX (trùng 100% với Areas).
 */
/** v1.12 (11/09/2026): 4 ảnh LOCAL sáng (Unsplash bị bỏ), tone chuyển sang sáng. */
const CARD_BG_IMAGES: string[] = [
  // 0. Lao động nữ đóng gói — sáng, worker
  '/images/hero/dong-goi-ha-noi.jpg',
  // 1. Công nhân vận hành máy móc — sáng, nhà xưởng
  '/images/hero/cong-nhan-may-moc.jpg',
  // 2. Cảnh xây dựng/KCN ngoài trời — sáng
  '/images/homepage-huongb/industrial-location-02.webp',
  // 3. Đường nội bộ + building KCN — sáng
  '/images/homepage-huongb/industrial-location-03.webp',
];

/** Chọn ảnh theo index (0-3) — mỗi card 1 ảnh khác nhau, không hash trùng. */
function pickCardImage(index: number): string {
  return CARD_BG_IMAGES[index % CARD_BG_IMAGES.length];
}

export function RecruitingProjectsSection({ jobs, buildHref }: RecruitingProjectsSectionProps) {
  if (jobs.length === 0) return null;

  return (
    <section
      data-section="recruiting"
      aria-labelledby="hrp-recruiting-heading"
      /* Y2: bỏ bg-surface-container-low, thu hẹp padding */
      className="w-full px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6"
    >
      {/* RQ-10 / DEC-14 (VIS-06): inner container max-w-7xl (đồng bộ với Hero + SearchSection) */}
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="mb-8 flex flex-col gap-2">
          {/* STEP-05/RQ-08/DEC-13: Icon apartment trong vòng tròn nhẹ bg-secondary-container rounded-full */}
          {/* STEP-05/RQ-10/DEC-15: Bỏ eyebrow + sub-heading kỹ thuật */}
          <h2
            id="hrp-recruiting-heading"
            className="font-head text-headline-lg font-bold text-on-surface flex items-center gap-2"
          >
            <span className="w-10 h-10 bg-secondary-container rounded-full inline-flex items-center justify-center">
              <span className="material-symbols-outlined text-base text-primary-dark" aria-hidden="true">apartment</span>
            </span>
            Dự án đang tuyển
          </h2>
        </div>
        {/* STEP-05/RQ-09: Card 4-col md / 2-col mobile, KHÔNG anchor giả — dùng Link.
            Y10.2/UI04f fix: dùng position-relative card + position-absolute "Cần tuyển" để luôn sticky bottom
            bất kể title 1 hay 2 dòng. Thêm pb-10 để tạo khoảng trống cho absolute bottom. */}
        {/* Y10.8+: hiển thị 8 dự án (2 hàng × 4 cột desktop). */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {jobs.slice(0, 8).map((job, index) => {
            // Y10.8+: Strip prefix "Tuyển ..." khỏi title để card gọn.
            const displayTitle = job.title.replace(/^(tuyển\s*(gấp|dụng)?\s*)/i, '').trim() || job.title;
            return (
            <Link
              key={job.id}
              href={buildHref(job.id)}
              data-testid={`recruiting-card-${job.id}`}
              className="hrp-focus group relative flex h-full flex-col items-center gap-3 rounded-xl border border-outline-variant p-4 text-center shadow-card transition hover:-translate-y-0.5 hover:border-primary-container pb-10 overflow-hidden bg-cover bg-center bg-no-repeat"
              /* v1.12 (11/09/2026): overlay đen 70-75% → overlay trắng 40% (rgba(255,255,255,0.40)) để giữ tone sáng. */
              style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.40), rgba(255,255,255,0.45)), url('${pickCardImage(index)}')` }}
            >
              {/* Y10.5/UI04i: monogram 64×64 overlay trên ảnh nền.
                  v1.12: border + bg đổi sang dark/translucent để nổi trên tone sáng. */}
              <HrMonogram
                size={64}
                label={deriveMonogram(displayTitle)}
                className="w-16 h-16 rounded-xl border border-outline bg-surface-container-high shrink-0"
              />
              {/* v1.12: title đổi từ text-white → text-on-surface (đậm) để đọc rõ trên nền sáng. */}
              <p className="font-head text-headline-md font-bold text-on-surface leading-tight min-h-[3.2em]">
                {displayTitle}
              </p>
              {/* v1.12: "Cần tuyển {n} người" đổi từ text-white → text-on-surface-variant. */}
              <p className="absolute bottom-3 left-0 right-0 font-label text-label-md text-on-surface-variant font-bold">
                Cần tuyển {job.availableSlots} người
              </p>
            </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
