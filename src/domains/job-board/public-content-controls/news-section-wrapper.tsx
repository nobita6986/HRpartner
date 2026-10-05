/**
 * public-content-controls/news-section-wrapper.tsx — Phase B / UI2
 * composition wrapper around the existing T1B-owned `<NewsSection>`.
 *
 * The wrapper:
 *   - consumes the `usePublicContentControls` hook;
 *   - returns `null` when the admin has disabled the news section
 *     (`newsSectionEnabled === false`);
 *   - otherwise renders the existing `<NewsSection>` from
 *     `src/domains/job-board/components/landing/news-section.tsx` unchanged.
 *
 * Phase B does NOT modify the section component itself. The wrapper lives
 * in the Phase A module so the boundary between UI2-owned and T1B-owned
 * surface is preserved.
 */

'use client';

import { NewsSection } from '@/src/domains/job-board/components/landing/news-section';
import type { NewsSectionContent } from '@/src/domains/job-board/public-types';
import { usePublicContentControls } from './use-public-content-controls';

export interface NewsSectionWrapperProps {
  content: NewsSectionContent;
}

/**
 * `<NewsSectionWrapper>` — public homepage gate for the news section.
 *
 * Returns `null` when the admin has set `newsSectionEnabled === false`,
 * preserving the existing section's `if (!content.enabled) return null`
 * policy without modifying the section file.
 */
export function NewsSectionWrapper({ content }: NewsSectionWrapperProps) {
  const { newsSectionEnabled } = usePublicContentControls();
  if (!newsSectionEnabled) return null;
  return <NewsSection content={content} />;
}

export default NewsSectionWrapper;
