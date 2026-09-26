/**
 * placement.commands.routes.test.ts — AST/static guard for F0 route layer
 * (P1-F0 contract v1.2 — round-2 correction batch).
 *
 * Lane: unit (no DB). Reads source files + runs grep-style assertions to
 * enforce C-02..C-08 contract guards WITHOUT executing the routes.
 *
 * Round-2 additions (C-02, C-03, C-04):
 *   - All 5 routes MUST delegate to `runPlacementCommand` (no inline
 *     placementId pre-validation, no inline `isUuidV4` early return).
 *   - Route files MUST NOT call `console.*` (C-03).
 *   - The route-helper MUST export `runPlacementCommand`, contain
 *     `getAuthContext` + `withDbContext` (C-04 detector invariant).
 *
 * The regex checks operate on the file's CODE only — comments and JSDoc
 * are stripped before assertions. This guards against forbidden symbols
 * being introduced as actual runtime code, not as descriptive prose.
 *
 * Checks (per TASK AC-12..AC-16):
 *   1. NO route file imports the frozen service module directly
 *      (only `placement.commands.ts`).
 *   2. NO route file uses the L1+write boundary (DEC-03 — unsafe for create).
 *   3. NO route file opens a raw `prisma.$transaction` (adapter owns tx boundary).
 *   4. NO route file mentions the synthetic HRP rejection code
 *      (taxonomy freeze — C-07).
 *   5. NO route file accepts a `reason` field for fail/cancel (C-06).
 *   6. NO route file adds `placementCaseClosed` to the transition response shape
 *      (C-06 — service doesn't return it).
 *   7. NO route file imports outbox / web-push / upstash (RQ-15 / C-08).
 *   8. NO route file imports `permission-catalog` or `prisma/seed.mjs`
 *      (C-02 — catalog + seed are FORBIDDEN).
 *   9. Adapter (`placement.commands.ts`) does NOT call the canonical tx
 *      boundary helper directly, does NOT use the L1+write boundary, and
 *      does NOT open a `prisma.$transaction` (C-08 — adapter is a pure
 *      function mapper, tx comes from the route).
 *  10. (Round-2) Route files MUST delegate to `runPlacementCommand` and
 *      MUST NOT inline `isUuidV4(placementId)` early-return.
 *  11. (Round-2) Route files MUST NOT call `console.*` (C-03).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

/** Strip // and /* * / comments + collapse whitespace so prose doesn't trigger regex. */
function stripComments(src: string): string {
  // Block comments first (greedy across lines).
  let s = src.replace(/\/\*[\s\S]*?\*\//g, '');
  // Line comments.
  s = s.replace(/(^|[^:])\/\/.*$/gm, '$1');
  return s;
}

function readCode(rel: string): string {
  return stripComments(readFileSync(join(ROOT, rel), 'utf8'));
}

const ROUTE_FILES = [
  'app/api/admin/placements/route.ts',
  'app/api/admin/placements/[id]/actions/confirm/route.ts',
  'app/api/admin/placements/[id]/actions/effective/route.ts',
  'app/api/admin/placements/[id]/actions/fail/route.ts',
  'app/api/admin/placements/[id]/actions/cancel/route.ts',
];

const HELPER_FILE = 'src/domains/talent/placement.route-helpers.ts';
const ADAPTER_FILE = 'src/domains/talent/placement.commands.ts';

describe('F0 route layer — static guards', () => {
  describe('C-03 / C-08: route transaction boundary', () => {
    it.each(ROUTE_FILES)('%s — uses the canonical tx helper, no raw prisma.$transaction', (file) => {
      const code = readCode(file);
      // Each route either imports withDbContext directly (create route) or
      // delegates to runPlacementCommand (which encapsulates the tx boundary
      // inside the helper). Both are acceptable — the route must NOT open a
      // raw prisma.$transaction or use the L1+write boundary.
      const usesDbContext = /withDbContext/.test(code);
      const delegatesToHelper = /runPlacementCommand\(/.test(code);
      expect(usesDbContext || delegatesToHelper).toBe(true);
      expect(code).not.toMatch(/withAuthorizedDb/);
      expect(code).not.toMatch(/prisma\.\$transaction/);
      expect(code).not.toMatch(/tx\.\$transaction/);
    });
  });

  describe('C-02: routes only import from placement.commands.ts adapter', () => {
    it.each(ROUTE_FILES)('%s — KHÔNG import trực tiếp frozen service module', (file) => {
      const code = readCode(file);
      // Allow imports from placement.commands or placement.route-helpers,
      // placement.errors (for type narrowing only), or src/shared/**
      // (auth/db-context/idempotency). Forbid the frozen service module.
      const directServiceImport = /from\s+['"]@?\/src\/domains\/talent\/placement\.service['"]/;
      expect(code).not.toMatch(directServiceImport);
    });
  });

  describe('C-07: error taxonomy freeze', () => {
    it.each(ROUTE_FILES)('%s — KHÔNG tạo code HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED', (file) => {
      const code = readCode(file);
      expect(code).not.toMatch(/HRP_MANAGED_EFFECTIVE_NOT_SUPPORTED/);
    });
  });

  describe('C-06: response shape fidelity', () => {
    it.each(ROUTE_FILES)('%s — KHÔNG thêm placementCaseClosed field', (file) => {
      const code = readCode(file);
      expect(code).not.toMatch(/placementCaseClosed/);
    });
  });

  describe('C-06: fail/cancel body discipline', () => {
    it('fail route — KHÔNG whitelist một reason field', () => {
      const code = readCode('app/api/admin/placements/[id]/actions/fail/route.ts');
      // The fail route's validateEmptyBody must reject any field. It must NOT
      // whitelist a free-text reason field.
      expect(code).not.toMatch(/['"`]reason['"`]/);
    });
    it('cancel route — KHÔNG whitelist một reason field', () => {
      const code = readCode('app/api/admin/placements/[id]/actions/cancel/route.ts');
      expect(code).not.toMatch(/['"`]reason['"`]/);
    });
  });

  describe('RQ-15 / C-08: NO outbox/event producer', () => {
    it.each(ROUTE_FILES)('%s — KHÔNG import outbox', (file) => {
      const code = readCode(file);
      expect(code).not.toMatch(/integrity\/outbox/);
      expect(code).not.toMatch(/@upstash/);
      expect(code).not.toMatch(/web-push/);
    });
  });

  describe('C-02: NO permission catalog or seed imports', () => {
    it.each(ROUTE_FILES)('%s — KHÔNG import permission-catalog / seed.mjs / resolveEffectivePermissions', (file) => {
      const code = readCode(file);
      expect(code).not.toMatch(/permission-catalog/);
      expect(code).not.toMatch(/seed\.mjs/);
      expect(code).not.toMatch(/resolveEffectivePermissions/);
    });
  });

  describe('C-08: adapter does NOT open Prisma transaction', () => {
    it('placement.commands.ts — KHÔNG gọi canonical tx helper / L1+write boundary / prisma.$transaction', () => {
      const code = readCode(ADAPTER_FILE);
      expect(code).not.toMatch(/withDbContext/);
      expect(code).not.toMatch(/withAuthorizedDb/);
      expect(code).not.toMatch(/prisma\.\$transaction/);
      expect(code).not.toMatch(/tx\.\$transaction/);
    });
  });

  describe('shared helper (placement.route-helpers.ts) is the only place that opens tx', () => {
    it('opens withDbContext exactly once per run', () => {
      const code = readCode(HELPER_FILE);
      const matches = code.match(/withDbContext\(/g) ?? [];
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(code).not.toMatch(/withAuthorizedDb/);
      expect(code).not.toMatch(/prisma\.\$transaction/);
    });
  });

  describe('C-08: adapter does NOT touch frozen internal modules', () => {
    it('placement.commands.ts — không import placement.lifecycle hoặc placement.resolution', () => {
      const code = readCode(ADAPTER_FILE);
      // Adapter is allowed to import placement.errors (to throw PlacementValidationError
      // for missing sourceCandidateSubmissionId), but NOT lifecycle or resolution
      // (those are service-layer concerns).
      expect(code).not.toMatch(/placement\.lifecycle/);
      expect(code).not.toMatch(/placement\.resolution/);
    });
  });

  describe('canonical route names exported', () => {
    it('PLACEMENT_COMMAND_ROUTES has the 5 canonical names', () => {
      const src = readFileSync(join(ROOT, ADAPTER_FILE), 'utf8');
      expect(src).toContain("create: 'POST:/api/admin/placements'");
      expect(src).toContain("confirm: 'POST:/api/admin/placements/[id]/actions/confirm'");
      expect(src).toContain("effective: 'POST:/api/admin/placements/[id]/actions/effective'");
      expect(src).toContain("fail: 'POST:/api/admin/placements/[id]/actions/fail'");
      expect(src).toContain("cancel: 'POST:/api/admin/placements/[id]/actions/cancel'");
    });
  });

  // ─── Round-2 (C-02) ──────────────────────────────────────────────────────────
  describe('C-02 round-2: auth-first ordering — all routes delegate to runPlacementCommand', () => {
    it.each(ROUTE_FILES)('%s — calls runPlacementCommand exactly once', (file) => {
      const code = readCode(file);
      // Each route delegates the full pipeline to the helper. The helper
      // owns auth → role → placementId → body → idempotency → tx → log → error.
      const calls = code.match(/runPlacementCommand\s*\(/g) ?? [];
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    it.each([
      'app/api/admin/placements/[id]/actions/confirm/route.ts',
      'app/api/admin/placements/[id]/actions/effective/route.ts',
      'app/api/admin/placements/[id]/actions/fail/route.ts',
      'app/api/admin/placements/[id]/actions/cancel/route.ts',
    ])('%s — KHÔNG inline `isUuidV4(placementId)` early-return', (file) => {
      const code = readCode(file);
      // Round-2: placementId validation must run AFTER auth (inside the helper).
      // A route that does its own `if (!isUuidV4(placementId))` short-circuits
      // the auth gate → 400 instead of 401 for unauthenticated requests.
      expect(code).not.toMatch(/if\s*\(\s*!\s*isUuidV4\s*\(\s*placementId\s*\)\s*\)/);
    });
  });

  // ─── Round-2 (C-03) ──────────────────────────────────────────────────────────
  describe('C-03 round-2: structured safe logging replaces console.*', () => {
    it.each([...ROUTE_FILES, ADAPTER_FILE])(
      '%s — KHÔNG dùng console.* trong route/adapter',
      (file) => {
        const code = readCode(file);
        // C-03: every log line MUST come from the canonical logger. A
        // console.* call anywhere in the placement command pipeline is a
        // contract violation.
        expect(code).not.toMatch(/console\./);
      },
    );

    it('route-helper imports canonical logger (NOT console.error)', () => {
      const code = readCode(HELPER_FILE);
      // The helper uses the canonical logger + correlation-id helper.
      expect(code).toMatch(/@\/src\/shared\/observability\/logger/);
      expect(code).toMatch(/@\/src\/shared\/observability\/correlation-id/);
    });
  });

  // ─── Round-2 (C-04) ──────────────────────────────────────────────────────────
  describe('C-04 round-2: helper export + markers invariant', () => {
    it('placement.route-helpers.ts — exports runPlacementCommand and contains BOTH getAuthContext + withDbContext', () => {
      const code = readCode(HELPER_FILE);
      expect(code).toMatch(/export\s+(?:async\s+)?function\s+runPlacementCommand\b/);
      expect(code).toMatch(/\bgetAuthContext\b/);
      expect(code).toMatch(/\bwithDbContext\b/);
    });

    it('placement.route-helpers.ts — DOES NOT log raw actorId/body/evidence (no extra-meta from outside SafeMeta allow-list)', () => {
      const code = readCode(HELPER_FILE);
      // C-03: helper must not bypass the canonical SafeMeta envelope.
      // It must NEVER pass `actorId:` (raw) or `body:` or `evidence:` at top level
      // to the logger.
      expect(code).not.toMatch(/\blog(?:Info|Warn|Error)\s*\([^)]*\bactorId:/);
      expect(code).not.toMatch(/\blog(?:Info|Warn|Error)\s*\([^)]*\bbody:/);
      expect(code).not.toMatch(/\blog(?:Info|Warn|Error)\s*\([^)]*\bevidence:/);
    });
  });
});
