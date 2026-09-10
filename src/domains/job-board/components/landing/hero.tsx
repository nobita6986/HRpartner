interface HeroProps {
  children?: React.ReactNode;
  className?: string;
}

export function Hero({ children, className = '' }: HeroProps) {
  return (
    <section
      data-section="hero"
      aria-label="Giới thiệu và tìm việc nhanh"
      className={`relative w-full overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-primary-fixed text-on-primary ${className}`}
    >
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary-fixed-dim opacity-30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-tertiary-fixed opacity-30 blur-3xl"
      />
      {/* RQ-10 / DEC-14 (VIS-06): inner container max-w-[1080px] */}
      <div className="relative mx-auto w-full max-w-[1080px] px-4 py-12 md:px-6 md:py-16 lg:py-20">
        <div className="flex flex-col items-stretch gap-8 lg:flex-row lg:items-center">
          {children}
        </div>
      </div>
    </section>
  );
}
