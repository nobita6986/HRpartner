import type { ReactNode } from 'react';

interface SearchSectionProps {
  filters: ReactNode;
  results: ReactNode;
  className?: string;
}

export function SearchSection({ filters, results, className = '' }: SearchSectionProps) {
  return (
    <section
      aria-label="Tìm kiếm và danh sách việc làm"
      className={`w-full scroll-mt-24 bg-surface-container-lowest px-4 py-12 md:px-8 md:py-16 ${className}`}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-8 lg:flex-row">
        {filters}
        {results}
      </div>
    </section>
  );
}
