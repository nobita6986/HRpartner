/**
 * parse-filter.ts — Server-side URL → RecruiterWorkbenchFilter parser.
 *
 * Frozen E0 zod schema is the single source of truth (see
 * `src/domains/talent/recruiter-workbench.types.ts`). E1 MUST NOT redefine
 * the schema or coerce values in a way that diverges from E0.
 *
 * Behavior contract (TASK.md RQ-21 / AC-01):
 *   - Omitted param → safe defaults (`view` per role, `sort=ageDesc`, `pageSize=20`).
 *   - Invalid explicit (zod fail) → return `ok: false` with raw issues; page
 *     renders the validation panel and MUST NOT call `getRecruiterWorkbenchList`.
 *   - Defaults applied in this module are the URL-only defaults; role-based
 *     `view` defaulting happens in the page (because `view` requires role).
 *
 * The `view` field is intentionally NOT defaulted here even if omitted — the
 * page decides the default after reading `session.role`. This parser only
 * mirrors E0 zod behavior; authority lives at the service boundary.
 */

import {
  RecruiterWorkbenchQuerySchema,
  type RecruiterWorkbenchFilter,
} from '@/src/domains/talent/recruiter-workbench.types';

export interface ParseOk {
  ok: true;
  /** Raw values that passed zod; page applies role-based default for `view`. */
  filter: RecruiterWorkbenchFilter;
}

export interface ParseFailed {
  ok: false;
  /** Zod issues (serializable). Page must NOT call E0 service in this branch. */
  issues: ReadonlyArray<{
    path: ReadonlyArray<string | number>;
    message: string;
    code: string;
  }>;
}

export type ParseResult = ParseOk | ParseFailed;

/**
 * Convert Next.js `searchParams` (which is `string | string[] | undefined`)
 * into a plain `Record<string, string>` suitable for E0's zod schema.
 *
 * `getAll`-style values are joined with `,`; this mirrors what `URLSearchParams`
 * would do when building the query string the server would receive.
 */
export function searchParamsToRecord(
  searchParams: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(searchParams)) {
    if (raw === undefined) continue;
    out[key] = Array.isArray(raw) ? raw.filter((x) => x !== undefined).join(',') : raw;
  }
  return out;
}

/**
 * Parse the E1 URL search params using the E0 zod schema.
 *
 * IMPORTANT: when zod fails, this function returns `ok: false` and the caller
 * MUST NOT call `getRecruiterWorkbenchList`. E0 zod uses `.strict()` which
 * rejects unknown keys — this is the source of "invalid explicit" detection.
 */
export function parseRecruiterWorkbenchQuery(
  searchParams: Record<string, string | string[] | undefined>,
): ParseResult {
  const record = searchParamsToRecord(searchParams);
  const parsed = RecruiterWorkbenchQuerySchema.safeParse(record);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({
        path: i.path as ReadonlyArray<string | number>,
        message: i.message,
        code: i.code,
      })),
    };
  }
  // Apply URL-only defaults here; `view` defaulting per role is the page's job.
  // E0 schema already defaults `page` to 1 and `pageSize` to '20'.
  const filter: RecruiterWorkbenchFilter = {
    ...(parsed.data.search !== undefined ? { search: parsed.data.search } : {}),
    ...(parsed.data.caseStatus !== undefined ? { caseStatus: parsed.data.caseStatus } : {}),
    ...(parsed.data.handlerUserId !== undefined ? { handlerUserId: parsed.data.handlerUserId } : {}),
    // `view` is intentionally left as `undefined` when omitted so the page can
// apply role-based defaulting. This parser does NOT preselect 'ALL' —
// see docstring §"Behavior contract".
    view: parsed.data.view as RecruiterWorkbenchFilter['view'],
    ...(parsed.data.overdue !== undefined ? { overdue: parsed.data.overdue } : {}),
    ...(parsed.data.sort !== undefined ? { sort: parsed.data.sort } : {}),
    page: parsed.data.page,
    pageSize: Number(parsed.data.pageSize),
  };
  return { ok: true, filter };
}
