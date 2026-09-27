/**
 * job-postings-ui-truth.static.test.ts — hrp-p1-a0.2 / T1C.
 *
 * Static guard that proves the admin JobPosting UI accurately reflects accepted
 * capabilities on main. The previous "Phần bị khóa" section carried three stale
 * claims:
 *
 *   1. "Tạo mới draft từ slot → form chọn StaffingOrderSlot chưa dựng"
 *      FALSE — `CreateJobPostingForm` is wired to the canonical POST endpoint
 *      since P1-A0.1 (HRP-1A01 ACCEPTED).
 *   2. "Mở JobPosting ở trang public → trang public hiện vẫn tra Project"
 *      FALSE — `/viec-lam/[slug]` cutover sang JobPosting PUBLISHED via
 *      `getPublicJobDetail` since P1-A1 (ACCEPTED).
 *   3. "Anonymous apply RPC gắn JobPosting → chờ P1-A1 (CandidateSubmission.jobPostingId)"
 *      FALSE — anonymous apply RPC bound to JobPosting PUBLISHED + OPEN + linked
 *      slot chain since P1-B (ACCEPTED).
 *
 * The only genuinely-deferred capability on this surface is the Gallery/media
 * integration (waiting on AV4 Media Library) plus the schema-level slug-immutability
 * constraint published in P1-A0 AC-11. Both are still surfaced in the UI as the
 * "Phần còn hạn chế" block, but with truthful wording.
 *
 * These regression tests guard every gate of the contract:
 *   - G1: authorized roles CAN reach the create form (`CREATE_ROLES.has(...)` is true).
 *   - G2: unauthorized roles CANNOT reach the create form (the truthy branch requires `CREATE_ROLES.has(session.role)`).
 *   - G3: stale "form chưa dựng" claim cannot return on either list or detail page.
 *   - G4: stale "P1-A1 chưa hoàn tất" claim cannot return on either list or detail page.
 *   - G5: stale "CandidateSubmission.jobPostingId" claim cannot return on either list or detail page.
 *   - G6: stale "trang public hiện vẫn tra Project" cannot return on either list or detail page.
 *   - G7: remaining deferred text (Gallery/media, slug-immutability) is truthful.
 *   - G8: role matrices in page.tsx and [id]/page.tsx are unchanged from P1-A0.1 baseline (no new permissions).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

const LIST_PAGE = 'app/admin/jobs/job-postings/page.tsx';
const DETAIL_PAGE = 'app/admin/jobs/job-postings/[id]/page.tsx';
const FORM_FILE = 'app/admin/jobs/job-postings/create-job-posting-form.tsx';

const raw = (path: string) =>
  readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');

describe('hrp-p1-a0.2 / T1C — JobPosting admin UI truth baseline', () => {
  const listSrc = raw(LIST_PAGE);
  const detailSrc = raw(DETAIL_PAGE);
  const formSrc = raw(FORM_FILE);

  describe('G1 + G2 — CreateJobPostingForm is reachable only for CREATE_ROLES', () => {
    it('list page defines CREATE_ROLES = { ADMIN, HR_MANAGER, HR_STAFF }', () => {
      // Lock the canonical role matrix. If a future PR tries to silently widen
      // CREATE_ROLES (e.g. add SALE/HR_STAFF duplicates or PM), this fails first.
      expect(listSrc).toMatch(
        /const\s+CREATE_ROLES[\s\S]*?=\s+new\s+Set\(\[?\s*['"]ADMIN['"][\s\S]*?['"]HR_MANAGER['"][\s\S]*?['"]HR_STAFF['"]\s*,?\s*\]?\s*\)/,
      );
    });

    it('list page guards CreateJobPostingForm render with CREATE_ROLES.has(session.role)', () => {
      // The guard must be the truthy condition on the render branch.
      // Format: `{CREATE_ROLES.has(session.role) ? (` followed by `<CreateJobPostingForm`.
      expect(listSrc).toMatch(
        /CREATE_ROLES\.has\(session\.role\)\s*\?\s*\([\s\S]*?<CreateJobPostingForm/,
      );
    });

    it('list page does NOT render CreateJobPostingForm outside the role gate', () => {
      // No bare `<CreateJobPostingForm` outside the conditional. Strip the role-gated
      // block first; we expect zero remaining references.
      const insideGate = listSrc.match(/CREATE_ROLES\.has\(session\.role\)\s*\?\s*\([\s\S]*?\) : null/);
      expect(insideGate).not.toBeNull();
      const outside = listSrc
        .replace(insideGate![0], '')
        .match(/<CreateJobPostingForm/);
      expect(outside).toBeNull();
    });

    it('detail page keeps MUTATION_ROLES = { ADMIN, HR_MANAGER, HR_STAFF } (unchanged from P1-A0)', () => {
      expect(detailSrc).toMatch(
        /const\s+MUTATION_ROLES[\s\S]*?=\s+new\s+Set\(\[?\s*['"]ADMIN['"][\s\S]*?['"]HR_MANAGER['"][\s\S]*?['"]HR_STAFF['"]\s*,?\s*\]?\s*\)/,
      );
    });

    it('detail page keeps VIEWER_ROLES = { PM, SALE, DIRECTOR } (unchanged from P1-A0)', () => {
      expect(detailSrc).toMatch(
        /const\s+VIEWER_ROLES[\s\S]*?=\s+new\s+Set\(\[?\s*['"]PM['"][\s\S]*?['"]SALE['"][\s\S]*?['"]DIRECTOR['"]\s*,?\s*\]?\s*\)/,
      );
    });
  });

  describe('G3..G6 — Stale claims cannot return on list or detail pages', () => {
    // Strip block comments and line comments BEFORE scanning so the test guards
    // only user-facing text rendered by the page. Otherwise the test would match
    // our own block comments documenting the cleanup.
    const stripComments = (src: string) =>
      src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/^\s*\*.*$/gm, '');
    const cleanList = stripComments(listSrc);
    const cleanDetail = stripComments(detailSrc);

    const staleClaims = [
      // G3: create-draft form not yet built
      /form chọn StaffingOrderSlot chưa dựng/i,
      /form chọn.*chưa dựng/i,
      /tạo mới draft từ slot.*chưa dựng/i,
      // G4 + G6: P1-A1 not yet completed, page still Project-backed
      /trang public hiện vẫn tra Project/i,
      /trang public hiện vẫn.*Project/i,
      /chờ\s*P1-A1\b/i,
      /chưa gắn với JobPosting/i,
      // G5: CandidateSubmission.jobPostingId still missing
      /CandidateSubmission\.jobPostingId/i,
      /P1-A1\s*\(CandidateSubmission\.jobPostingId\)/i,
      // G3-style: "form sẽ thêm ở bước sau"
      /form sẽ thêm ở bước sau/i,
    ];

    it('list page contains NO stale "Phần bị khóa" claims about form/public-detail/anonymous-apply', () => {
      for (const pattern of staleClaims) {
        expect(cleanList, `list page must not contain ${pattern}`).not.toMatch(pattern);
      }
    });

    it('detail page contains NO stale "Phần bị khóa" claims about public-detail/anonymous-apply', () => {
      for (const pattern of staleClaims) {
        expect(cleanDetail, `detail page must not contain ${pattern}`).not.toMatch(pattern);
      }
    });

    it('list page header no longer calls form "chưa dựng" or claims P1-A1 dependency', () => {
      const headerBlock = listSrc.slice(0, listSrc.indexOf('/* Filter */'));
      const header = stripComments(headerBlock);
      expect(header).not.toMatch(/chưa dựng/i);
      expect(header).not.toMatch(/chờ\s*P1-A1/i);
      // Sanity: the header should now affirm the public detail IS bound to JobPosting.
      expect(header).toMatch(/P1-A1/i);
      expect(header).toMatch(/P1-B/i);
    });

    it('detail page header no longer claims public apply goes via "Project/Slot cũ"', () => {
      const topBlock = detailSrc.slice(0, detailSrc.indexOf('import Link'));
      const topComment = stripComments(topBlock);
      expect(topComment).not.toMatch(/trang public hiện vẫn tra Project/i);
      expect(topComment).not.toMatch(/CandidateSubmission\.jobPostingId/i);
    });
  });

  describe('G7 — Remaining deferred text is truthful', () => {
    it('list page keeps Gallery/media as the only remaining deferred item', () => {
      // Surface must still mention Gallery/media; the deferred block uses new wording.
      expect(listSrc).toMatch(/Gallery\s*media/i);
      expect(listSrc).toMatch(/Phần còn hạn chế/);
      expect(listSrc).toMatch(/aria-label="Phần còn hạn chế"/);
      expect(listSrc).toMatch(/data-testid="locked-section-list"/);
    });

    it('detail page keeps Gallery/media + slug-immutability as the only remaining items', () => {
      expect(detailSrc).toMatch(/Gallery\s*media/i);
      // Slug rename (P1-A0 AC-11) is a real schema-level invariant, not a temporary
      // lock — must remain surfaced as a deferred constraint, but with truthful wording.
      expect(detailSrc).toMatch(/Sửa slug trước publish/i);
      expect(detailSrc).toMatch(/AC-11/i);
      expect(detailSrc).toMatch(/Phần còn hạn chế/);
      expect(detailSrc).toMatch(/aria-label="Phần còn hạn chế"/);
      expect(detailSrc).toMatch(/data-testid="locked-section-detail"/);
    });

    it('list page deferred section no longer uses the misleading "Phần bị khóa" wording', () => {
      // Old wording is "Phần bị khóa"; we've renamed to "Phần còn hạn chế".
      expect(listSrc).not.toMatch(/aria-label="Phần bị khóa"/);
      expect(listSrc).not.toMatch(/Phần bị khóa \(chờ bước sau\)/);
    });

    it('detail page deferred section no longer uses the misleading "Phần bị khóa" wording', () => {
      expect(detailSrc).not.toMatch(/aria-label="Phần bị khóa"/);
      expect(detailSrc).not.toMatch(/Phần bị khóa \(chờ bước sau\)/);
    });
  });

  describe('G8 — Role matrices and canonical predicates are preserved', () => {
    it('list page VIEWER_ROLES still includes PM/SALE/DIRECTOR/HR_STAFF (P1-A0.1 expansion kept)', () => {
      const block = listSrc.match(/const\s+VIEWER_ROLES[\s\S]*?\);/);
      expect(block).not.toBeNull();
      expect(block![0]).toMatch(/['"]ADMIN['"]/);
      expect(block![0]).toMatch(/['"]HR_MANAGER['"]/);
      expect(block![0]).toMatch(/['"]PM['"]/);
      expect(block![0]).toMatch(/['"]SALE['"]/);
      expect(block![0]).toMatch(/['"]DIRECTOR['"]/);
      expect(block![0]).toMatch(/['"]HR_STAFF['"]/);
    });

    it('list page still uses canonical `listEligibleSlotsForNewJobPosting` import', () => {
      // The selector service is the canonical authority — must not be replaced by
      // a local predicate. (P1-A0.1 C-02: a single repo-owned helper is shared by
      // both selector and write-path.)
      expect(listSrc).toMatch(
        /import\s*\{[\s\S]*?listEligibleSlotsForNewJobPosting[\s\S]*?\}\s+from\s+['"]@\/src\/domains\/staffing\/job-posting-list\.service['"]/,
      );
    });

    it('list page still uses canonical `getJobPostingForAdmin` import in detail page', () => {
      expect(detailSrc).toMatch(
        /import\s*\{[\s\S]*?getJobPostingForAdmin[\s\S]*?\}\s+from\s+['"]@\/src\/domains\/staffing\/job-posting-list\.service['"]/,
      );
    });
  });

  describe('Create form — improved empty/error text', () => {
    it('form still uses canonical eligible-slot predicate (no client-side recomputation)', () => {
      // The form must continue to receive eligibleSlots as a server-mapped DTO.
      // It must NOT introduce a client-side predicate that could drift from the
      // canonical `eligibleSlotPredicateSql(now)`.
      expect(formSrc).toMatch(/export interface EligibleSlotDto/);
      expect(formSrc).toMatch(/readonly eligibleSlots/);
      // And the form's pre-select hook must be empty (cannot lock users out
      // before submission):
      expect(formSrc).not.toMatch(/function isEligible\(slot/);
    });

    it('empty state explains the four canonical predicate clauses', () => {
      // The improved empty-state text must mention all four predicate clauses
      // so users understand WHY no slot is listed.
      expect(formSrc).toMatch(/OPEN/);
      expect(formSrc).toMatch(/CLOSING_SOON/);
      expect(formSrc).toMatch(/deadline_date/);
      expect(formSrc).toMatch(/valid_to/);
      expect(formSrc).toMatch(/slots_filled/);
      expect(formSrc).toMatch(/slots_needed/);
      // Canonical predicate name explicitly referenced so the user can grep:
      expect(formSrc).toMatch(/eligibleSlotPredicateSql/);
    });

    it('empty state credits write-path authority, not just selector', () => {
      // The improved empty state must credit `assertSlotEligibleForNewJobPosting`
      // so users understand the server write-path is the source of truth.
      expect(formSrc).toMatch(/assertSlotEligibleForNewJobPosting/);
    });

    it('load-error state carries data-testid for downstream assertion', () => {
      expect(formSrc).toMatch(/data-testid="create-job-posting-load-error"/);
    });

    it('form still uses RFC 4122 v4 UUID generator (no Math.random path)', () => {
      expect(formSrc).toMatch(/crypto\.randomUUID\(\)/);
      expect(formSrc).toMatch(/crypto\.getRandomValues/);
      // `Math.random` is not safe per C-04 in P1-A0.1; the form must not use it
      // as a path even in a fallback chain. Strip comments first so the comment
      // we wrote documenting the rationale does not pollute the check.
      const codeOnly = formSrc
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      expect(codeOnly).not.toMatch(/Math\.random/);
    });
  });
});
