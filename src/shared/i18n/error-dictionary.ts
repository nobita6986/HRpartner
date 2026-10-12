/**
 * error-dictionary.ts — T1B Wave 1 Foundation shared error mapper.
 *
 * Re-exports the existing JobPosting error map (canonical) and the placement
 * conflict label map (canonical) WITHOUT changing their signatures, then
 * exposes a single `errorLabel({ module, code, fallback })` for future Wave
 * 2/3/4 consumers.
 *
 * Boundary rule:
 * - `JOB_POSTING_ERROR_LABELS` and `CONFLICT_LABELS` are still the canonical
 *   sources for their respective modules. Consumers in those modules continue
 *   to import them directly. This file is a thin re-export + the unified helper.
 * - The helper does NOT own domain-specific error mappings; it just dispatches
 *   on `module` to the appropriate map.
 */

import { JOB_POSTING_ERROR_LABELS } from '@/src/domains/staffing/job-posting-error-map';
import { CONFLICT_LABELS } from '@/src/domains/applications/placement-ui';

export {
  JOB_POSTING_ERROR_LABELS,
  type JobPostingErrorCode,
} from '@/src/domains/staffing/job-posting-error-map';

export {
  CONFLICT_LABELS,
  conflictLabel as placementConflictLabel,
} from '@/src/domains/applications/placement-ui';

export type ErrorModule = 'job-posting' | 'placement';

export interface ErrorLabelInput {
  module: ErrorModule;
  code: string | undefined | null;
  /** Returned when `code` is missing in the merged dictionary. */
  fallback?: string;
}

/**
 * Dispatch on `module` and resolve `code` via the corresponding dictionary.
 * If `code` is null / undefined / not in the dictionary, returns `fallback`
 * (when provided) or the original `code` string.
 */
export function errorLabel(input: ErrorLabelInput): string {
  const { module: mod, code, fallback } = input;
  if (!code) return fallback ?? '';
  switch (mod) {
    case 'job-posting': {
      const labels = JOB_POSTING_ERROR_LABELS as Readonly<Record<string, string>>;
      return labels[code] ?? fallback ?? code;
    }
    case 'placement': {
      const labels = CONFLICT_LABELS as Readonly<Record<string, string>>;
      return labels[code] ?? fallback ?? code;
    }
    default: {
      return fallback ?? code;
    }
  }
}