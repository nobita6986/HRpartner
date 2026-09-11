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

export function RecruitingProjectsSection({ jobs, buildHref }: RecruitingProjectsSectionProps) {
  if (jobs.length === 0) return null;

  return (
    <section
      data-section="recruiting"
      aria-labelledby="hrp-recruiting-heading"
      /* Y2: bỏ bg-surface-container-low, thu hẹp padding */
      className="w-full px-4 pb-8 pt-4 md:px-8 md:pb-10 md:pt-6"
    >
      {/* RQ-10 / DEC-14 (VIS-06): inner container max-w-[1080px] */}
      <div className="mx-auto w-full max-w-[1080px] px-4 md:px-6">
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
            Y10.2/UI04f: thêm h-full + mt-auto cho "Cần tuyển" để thẳng hàng giữa các card khi title 1 dòng vs 2 dòng. */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {jobs.slice(0, 4).map((job) => (
            <Link
              key={job.id}
              href={buildHref(job.id)}
              data-testid={`recruiting-card-${job.id}`}
              className="hrp-focus group flex h-full flex-col items-center gap-3 rounded-xl border border-outline-variant bg-surface p-4 text-center shadow-card transition hover:-translate-y-0.5 hover:border-primary-container"
            >
              {/* STEP-05/RQ-09/DEC-14: Logo monogram 64×64 px outer. Y10.2/UI04f: monogram = abbreviation từ title. */}
              <HrMonogram
                size={64}
                label={deriveMonogram(job.title)}
                className="w-16 h-16 rounded-xl border border-outline-variant bg-white shrink-0"
              />
              {/* Y10.2/UI04f: title min-height = 2*line-height (~48px) cho 1-2 dòng để các card title đồng đều. */}
              <p className="font-head text-headline-md font-bold text-on-surface leading-tight min-h-[3.2em]">
                {job.title}
              </p>
              {/* STEP-05/RQ-09/DEC-16: Copy "Cần tuyển {n} người", n = availableSlots.
                  Y10.2/UI04f: mt-auto đẩy xuống đáy card -> thẳng hàng với mọi card khác. */}
              <p className="font-label text-label-md text-primary-container font-bold mt-auto">
                Cần tuyển {job.availableSlots} người
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
