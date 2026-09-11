import { AreaImageCard } from './area-image-card';

interface AreasSectionProps {
  areas: Array<{ name: string; count: number }>;
  onPick: (area: string) => void;
}

const IMAGE_BASE = '/images/homepage-huongb';
const ASSET_MAP = [
  `${IMAGE_BASE}/industrial-location-01.webp`,
  `${IMAGE_BASE}/industrial-location-02.webp`,
  `${IMAGE_BASE}/industrial-location-03.webp`,
  `${IMAGE_BASE}/industrial-location-04.webp`,
];

export function AreasSection({ areas, onPick }: AreasSectionProps) {
  if (areas.length === 0) return null;

  return (
    <section
      data-section="areas"
      aria-labelledby="hrp-areas-heading"
      /* STEP-07/RQ-01: Container max-w-[1200px] mx-auto px-4 md:px-6 */
      /* Y2: bỏ background riêng biệt, thu hẹp padding để liền mạch với Hero gradient */
      /* Y10.11/UI04k: giảm padding trên dưới (pt-4→pt-1, pb-8→pb-4 md:pt-6→md:pt-2 md:pb-10→md:pb-5) */
      className="w-full px-4 pb-4 pt-1 md:px-8 md:pb-5 md:pt-2"
    >
      {/* RQ-10 / DEC-14 (VIS-06): inner container max-w-7xl (đồng bộ với Hero + SearchSection) */}
      {/* Y10.11/UI04k: giảm mb-8 → mb-3 cho header */}
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="mb-3 flex flex-col gap-2">
          {/* Y10.11/UI04k: bỏ eyebrow "Theo khu vực" — chỉ giữ heading + subtitle */}
          <h2
            id="hrp-areas-heading"
            className="font-head text-headline-lg font-bold text-on-surface"
          >
            Việc làm theo khu vực
          </h2>
          <p className="max-w-2xl font-body text-body-md text-on-surface-variant">
            Chọn một khu vực đang có dữ liệu tuyển dụng để xem các vị trí phù hợp.
          </p>
        </div>
        <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {areas.slice(0, 4).map((area, index) => (
            <AreaImageCard
              key={area.name}
              area={area.name}
              count={area.count}
              imageUrl={ASSET_MAP[index % ASSET_MAP.length] ?? ASSET_MAP[0]}
              onPick={() => onPick(area.name)}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
