interface AreasSectionProps {
  areas: string[];
  onPick: (area: string) => void;
}

export function AreasSection({ areas, onPick }: AreasSectionProps) {
  if (areas.length === 0) return null;

  return (
    <section
      aria-labelledby="hrp-areas-heading"
      className="w-full overflow-hidden rounded-3xl border border-outline-variant/50 bg-surface"
    >
      <div className="bg-tertiary-fixed px-5 py-6 md:px-8">
        <h2 id="hrp-areas-heading" className="font-head text-headline-lg font-bold text-on-tertiary-fixed">
          Việc làm theo khu vực
        </h2>
        <p className="mt-2 font-body text-body-md text-on-tertiary-fixed-variant">
          Chọn một khu vực đang có trong dữ liệu tuyển dụng để xem các vị trí phù hợp.
        </p>
      </div>
      <ul className="grid list-none grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 md:p-8">
        {areas.map((area) => (
          <li key={area}>
            <button
              type="button"
              onClick={() => onPick(area)}
              className="hrp-focus min-h-11 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low px-4 py-3 text-left font-label text-label-md font-semibold text-on-surface nav-item-lift"
              aria-label={`Xem việc làm tại ${area}`}
            >
              {area}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
