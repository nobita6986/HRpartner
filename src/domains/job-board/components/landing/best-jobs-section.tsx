import type { ReactNode } from 'react';

export function BestJobsSection({ children }: { children: ReactNode }) {
  return (
    <section
      aria-labelledby="hrp-best-jobs-heading"
      className="w-full rounded-3xl bg-surface-container-low px-5 py-8 md:px-8"
    >
      {children}
    </section>
  );
}
