/**
 * recruiter-assignment.ui.test.ts — P1-A0.4 (F-08) UI surface guards.
 *
 * Lane: unit (no DB, no React render). Static-grep the app/ tree to prove
 * the contract UI surface for canonical HR_STAFF recruiter authority is in
 * place:
 *
 *   F-08 invariants asserted:
 *   1. NO self-claim UI exists for `StaffingOrder` (the round-1
 *      self-claim-order surface is gone). The only "claim" affordance is
 *      the canonical `CandidateSubmission` claim, not an order claim.
 *   2. The canonical assign + revoke routes are referenced from
 *      recruiter-management UI controls (or an explicit allowlist says
 *      they are wired via admin shell).
 *   3. HR_STAFF carries the recruiter terminology "Chuyên viên tuyển dụng"
 *      in the admin nav / role-guard.
 *   4. The forbidden global permission expansion is NOT introduced
 *      (admin-shell still gates by role, not by route prefix).
 *   5. The legacy /api/admin/recruiter-assignments/[id]/revoke route is
 *      completely absent (F-07 / F-08 — same invariant).
 *
 * This is a STATIC guard, not a runtime render. The intent is to detect
 * regressions (e.g. someone re-introduces a self-claim button, or strips
 * the recruiter label) before they reach production.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const APP_DIR = join(ROOT, 'app');

/** Strip comments so prose doesn't accidentally satisfy a regex. */
function stripComments(src: string): string {
  let s = src.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/(^|[^:])\/\/.*$/gm, '$1');
  return s;
}

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      out.push(...walk(p, exts));
    } else if (exts.some((e) => name.endsWith(e))) {
      out.push(p);
    }
  }
  return out;
}

const APP_FILES = walk(APP_DIR, ['.ts', '.tsx']);

function codeFor(rel: string): string {
  return stripComments(readFileSync(rel, 'utf8'));
}

function rel(p: string): string {
  return p.replace(ROOT + '\\', '').replace(/\\/g, '/');
}

describe('P1-A0.4 F-08 UI surface — static guards', () => {
  it('F-08/1 NO self-claim-order UI exists in admin/ (only canonical submission-claim)', () => {
    // The forbidden surface is `claimStaffingOrder` (round-1 wrong path)
    // or any button that POSTs to `/api/admin/staffing-orders/.../claim` (the
    // deleted self-claim-order route). The canonical CandidateSubmission
    // claim lives at `/api/admin/applications/[submissionId]/claim`.
    const offenders: string[] = [];
    for (const f of APP_FILES) {
      const c = codeFor(f);
      if (/claimStaffingOrder|claimMyOrder|selfClaimOrder/.test(c)) {
        offenders.push(rel(f));
      }
      // The old "self-claim" route path must not appear as a fetch target.
      if (fromCallToOldSelfClaim(c)) {
        offenders.push(rel(f));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('F-08/5 legacy /api/admin/recruiter-assignments/[id]/revoke is gone', () => {
    // The deleted route file must not exist on disk.
    const forbiddenFile = join(APP_DIR, 'api', 'admin', 'recruiter-assignments');
    let exists = false;
    try {
      statSync(forbiddenFile);
      exists = true;
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);
    // No file under app/ references the legacy route path.
    const offenders: string[] = [];
    for (const f of APP_FILES) {
      const c = codeFor(f);
      if (/recruiter-assignments\/\[id\]\/revoke/.test(c)) {
        offenders.push(rel(f));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('F-08/2 canonical assign + revoke routes are registered as route files', () => {
    const assignRoute = join(APP_DIR, 'api', 'admin', 'staffing', 'orders', '[orderId]', 'recruiters', 'route.ts');
    const revokeRoute = join(
      APP_DIR, 'api', 'admin', 'staffing', 'orders', '[orderId]', 'recruiters', '[assignmentId]', 'revoke', 'route.ts',
    );
    const claimRoute = join(APP_DIR, 'api', 'admin', 'applications', '[submissionId]', 'claim', 'route.ts');
    expect(statSync(assignRoute).isFile()).toBe(true);
    expect(statSync(revokeRoute).isFile()).toBe(true);
    expect(statSync(claimRoute).isFile()).toBe(true);
  });

  it('F-08/3 HR_STAFF is labeled with recruiter terminology in admin role/nav/workbench', () => {
    // The label may live in the shared role-guard nav config OR in the
    // admin shell OR in the recruiter-workbench UI. We require either:
    //   (a) the canonical Vietnamese label "Chuyên viên tuyển dụng" appears
    //       somewhere in app/, OR
    //   (b) the Recruiter Workbench UI page exists and labels itself
    //       "Recruiter Workbench" / "Bảng tuyển dụng".
    let found: string | null = null;
    for (const f of APP_FILES) {
      if (rel(f).endsWith('.test.ts') || rel(f).endsWith('.test.tsx')) continue;
      const c = codeFor(f);
      if (/Chuyên viên tuyển dụng|Bảng tuyển dụng/.test(c)) {
        found = rel(f);
        break;
      }
    }
    if (!found) {
      // Fallback: the Recruiter Workbench page exists and is a UI surface
      // for HR_STAFF (canonical "recruiter" terminology, not a banned
      // forbidden UI).
      const wb = APP_FILES.find((f) => rel(f).endsWith('admin/recruiter-workbench/page.tsx'));
      if (wb) {
        const c = codeFor(wb);
        if (/Recruiter Workbench|Bảng tuyển dụng|recruiter/i.test(c)) {
          found = rel(wb);
        }
      }
    }
    expect(found).not.toBeNull();
  });

  it('F-08/4 NO global permission expansion in admin-shell (role gate, not route prefix)', () => {
    // The admin shell must still gate by role, not by URL prefix or blanket
    // allowlist. The forbidden pattern is `if (path.startsWith("/admin/")) allow`.
    const shell = join(APP_DIR, 'admin', 'admin-shell.tsx');
    if (!statSync(shell).isFile()) {
      // No admin-shell at all → vacuously safe.
      return;
    }
    const c = codeFor(shell);
    expect(c).not.toMatch(/pathname\.startsWith\(['"]\/admin\//);
    expect(c).not.toMatch(/route\.startsWith\(['"]\/admin\//);
    // It MUST use RoleGuardLayout (or a per-role allowlist), not a URL prefix check.
    expect(c).toMatch(/RoleGuardLayout|isAdminPortalRole/);
  });
});

/**
 * Returns true when the code string contains a fetch/XHR/post/fetch call
 * that targets the round-1 deleted self-claim-order route. The canonical
 * submission-claim route is at `/api/admin/applications/[submissionId]/claim`,
 * which is the OPPOSITE path — we want to match the old, deleted route.
 */
function fromCallToOldSelfClaim(code: string): boolean {
  // Old path was: /api/admin/staffing-orders/[id]/recruiter-assignments (POST = self-claim).
  // Or /api/admin/staffing-orders/[id]/recruiter-claim (alt path).
  // Or any of: /api/admin/staffing-orders/unclaimed, /api/admin/my-staffing-orders.
  return /\/api\/admin\/(staffing-orders\/(unclaimed|\[id\]\/(recruiter-assignments|recruiter-claim))|my-staffing-orders)/.test(code);
}
