import type { ReactNode } from 'react';

interface SearchSectionProps {
  filters: ReactNode;
  results: ReactNode;
}

export function SearchSection({ filters, results }: SearchSectionProps) {
  return (
    <section
      aria-label="Tìm kiếm và danh sách việc làm"
      className="w-full scroll-mt-24 rounded-3xl bg-surface-container-low p-4 md:p-6"
    >
      <div className="flex flex-col items-start gap-8 lg:flex-row">
        {filters}
        {results}
      </div>
    </section>
  );
}
