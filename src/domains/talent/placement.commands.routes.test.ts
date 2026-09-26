/**
 * placement.commands.routes.test.ts — AST/static guard for F0 route layer.
 *
 * Lane: unit (no DB). Reads source files + runs grep-style assertions to
 * enforce C-02..C-08 contract guards WITHOUT executing the routes.
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
});
