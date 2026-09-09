interface HrMonogramProps {
  size?: number;
  className?: string;
}

export function HrMonogram({ size = 64, className = '' }: HrMonogramProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-low ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-label="HRP monogram"
      role="img"
    >
      <span
        className="font-head text-headline-md font-extrabold text-primary"
        style={{ fontSize: `${Math.round(size * 0.4)}px`, lineHeight: 1 }}
      >
        HRP
      </span>
    </div>
  );
}
