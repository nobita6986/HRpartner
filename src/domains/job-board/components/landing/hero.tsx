import type { ReactNode } from 'react';

export function Hero({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Giới thiệu và tìm việc nhanh"
      className="relative w-full overflow-hidden rounded-3xl border border-outline-variant/50 bg-gradient-to-br from-primary-dark to-primary-fixed text-on-primary px-5 py-8 shadow-card md:px-8 md:py-10"
    >
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary-fixed-dim opacity-20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-tertiary-fixed opacity-20 blur-3xl"
      />
      <div className="relative flex w-full flex-col items-stretch gap-8 lg:flex-row">
        {children}
      </div>
    </section>
  );
}
