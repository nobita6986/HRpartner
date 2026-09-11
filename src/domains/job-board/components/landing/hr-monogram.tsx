interface HrMonogramProps {
  size?: number;
  /** Y10.2/UI04f: monogram text — abbreviation company (e.g. "YPE", "KB"). Mặc định "HRP" khi không truyền (backward compat). */
  label?: string;
  className?: string;
}

export function HrMonogram({ size = 64, label = 'HRP', className = '' }: HrMonogramProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-low ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-label={`${label} monogram`}
      role="img"
    >
      <span
        className="font-head text-headline-md font-extrabold text-primary"
        style={{ fontSize: `${Math.round(size * 0.4)}px`, lineHeight: 1 }}
      >
        {label}
      </span>
    </div>
  );
}
