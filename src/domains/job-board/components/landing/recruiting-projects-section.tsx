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
 *  Overlay mờ đen 65-75% để chữ trắng đọc rõ trên ảnh. */
const CARD_BG_IMAGES: string[] = [
  // 1. Worker operating machinery — dimly lit factory, Hanoi Vietnam (tối, worker)
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80',
  // 2. Factory workers preparing textile — phổ biến lao động nữ phổ thông VN
  'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
  // 3. Worker walks through warehouse — kho vận, logistics
  'https://images.unsplash.com/photo-1565008576549-57569a49371d?auto=format&fit=crop&w=600&q=80',
  // 4. Industrial building — bối cảnh nhà máy, exterior
  'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80',
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
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {jobs.slice(0, 4).map((job, index) => (
            <Link
              key={job.id}
              href={buildHref(job.id)}
              data-testid={`recruiting-card-${job.id}`}
              className="hrp-focus group relative flex h-full flex-col items-center gap-3 rounded-xl border border-outline-variant p-4 text-center shadow-card transition hover:-translate-y-0.5 hover:border-primary-container pb-10 overflow-hidden bg-cover bg-center bg-no-repeat"
              /* Y10.5/UI04i r2: overlay mờ đen 70% để chữ trắng đọc rõ trên ảnh stock. */
              style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.70), rgba(0,0,0,0.75)), url('${pickCardImage(index)}')` }}
            >
              {/* Y10.5/UI04i: monogram 64×64 overlay trên ảnh nền (chữ trắng nổi). */}
              <HrMonogram
                size={64}
                label={deriveMonogram(job.title)}
                className="w-16 h-16 rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm shrink-0"
              />
              {/* Y10.5/UI04i: title đổi sang text-white để đọc được trên ảnh tối. */}
              <p className="font-head text-headline-md font-bold text-white leading-tight min-h-[3.2em]">
                {job.title}
              </p>
              {/* Y10.5/UI04i: "Cần tuyển {n} người" đổi sang text-white. */}
              <p className="absolute bottom-3 left-0 right-0 font-label text-label-md text-white font-bold">
                Cần tuyển {job.availableSlots} người
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
