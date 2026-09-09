interface AreaImageCardProps {
  area: string;
  count: number;
  imageUrl: string;
  onPick: () => void;
}

export function AreaImageCard({ area, count, imageUrl, onPick }: AreaImageCardProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        className="hrp-focus group relative block w-full overflow-hidden rounded-2xl border border-outline-variant/40 text-left shadow-card nav-item-lift"
        aria-label={`Xem ${count} việc làm tại ${area}`}
      >
        <div className="relative w-full md:h-48 md:overflow-hidden">
          <div
            className="aspect-[4/3] w-full bg-cover bg-center md:aspect-auto md:h-full"
            style={{ backgroundImage: `url(${imageUrl})` }}
            role="img"
            aria-label={`Khu vực ${area}`}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <span className="font-head text-headline-md font-bold text-white drop-shadow-sm">
            {area}
          </span>
          <span className="inline-flex shrink-0 items-center rounded-full bg-white/20 px-3 py-1 font-label text-label-md font-bold text-white backdrop-blur-sm">
            {count} việc
          </span>
        </div>
      </button>
    </li>
  );
}
