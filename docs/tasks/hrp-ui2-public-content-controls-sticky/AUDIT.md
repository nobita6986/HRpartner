# AUDIT

## 0. Audit Control

| Field | Value |
|---|---|
| Spec version | v1.1 |
| Assurance lane | CRITICAL |
| Audit depth | LIGHT |
| Audit round | 1 |
| Delivery protocol | V2_FAST_FREEZE |
| Implementation SHA | b48e4bbddf5f328f4bf38ed1b01e67586e6eeda0 |
| Finding completeness | COMPLETE_CURRENT_SURFACE |
| Correction batch | 0 |

## 1. Findings

| ID | Severity | Release-blocking | Description | Resolution |
|---|---|---|---|---|
| AUD-001 (UI2-R1-01) | P1 | YES | AC-34 is violated. admin-settings-form.tsx buildPayload() always sends all settings fields. The contract requires a dirty-field-only partial POST. This can overwrite concurrent admin changes. | Release-blocking. Tier 1 must refactor buildPayload() to submit dirty fields only. |
| AUD-002 (UI2-R1-02) | P2 | YES | Required route-level acceptance coverage is absent: AC-27 public homepage-settings route projection, AC-28 successful admin POST + persistence + cache revalidation, AC-29 admin route 400 for message over 280, AC-30 admin route 400 for unsafe CTA URL. Existing hook/service/static tests do not prove these route contracts. | Release-blocking. Tier 1 must author dedicated Next.js route handler tests. |
| AUD-003 (UI2-R1-03) | P2 | YES | AC-28/29/30 were declared PASS using filters that executed zero tests. AC-25/26 counts and AC-19/20/21 evidence were materially inaccurate. | Release-blocking. Correct measurements recorded; AC-28/29/30 set to FAIL. |
| AUD-004 | P3 | NO | TASK.md status is 'READY_FOR_AUDIT' rather than an execution state, generating a minor verify-task warning. | Non-blocking. Documented as docs debt. |

## 2. Acceptance Verification

| AC | Status | Evidence / Command | Result / Note |
|---|---|---|---|
| AC-01 | PASS | `node .ai-pipeline/scripts/verify-encoding-range.mjs b3d9de9b HEAD` | exit 0; 4/4 text files verified, 0 BOM, 0 CRLF, 0 mojibake streaks |
| AC-02 | PASS | `npm run typecheck` | exit 0; TypeScript 0 errors, carried forward from E-40a at b48e4bbd (impact check: zero semantic delta) |
| AC-03 | PASS | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls` | exit 0; 10 test files passed, 198 tests passed in 4.58s |
| AC-04 | PASS | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls/url-safety.test.ts` | exit 0; 17/17 passed; rejects javascript:, data:, vbscript:, file:, http |
| AC-05 | PASS | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls/url-safety.test.ts -t "resolveCtaHref"` | exit 0; 4/4 assertions passed; returns canonical string or null |
| AC-06 | PASS | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls/revision.test.ts` | exit 0; 16/16 passed; deterministic 16-hex content revision hash |
| AC-07 | PASS | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls/sticky-announcement.test.tsx` | exit 0; 13/13 passed; renders role="region" aria-label="Thông báo" |
| AC-08 | PASS | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls/sticky-announcement.test.tsx -t "target"` | exit 0; 3/3 passed; target="_blank" rel="noopener noreferrer" on external URLs |
| AC-09 | PASS | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls/sticky-announcement.test.tsx -t "marquee"` | exit 0; 2/2 passed; no marquee tag or substring in rendered output |
| AC-10 | PASS | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls/animation.test.ts` | exit 0; 7/7 passed; prefers-reduced-motion suppresses CSS animation |
| AC-11 | PASS | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls/news-section-gate.test.ts` | exit 0; 4/4 passed; resolveNewsSectionGate outputs REAL and INTEGRATION_PENDING |
| AC-12 | PASS | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls/content-controls.static.test.ts` | exit 0; 121/121 passed; static fence verifies zero forbidden AST patterns |
| AC-13 | PASS | `git diff origin/main HEAD -- package.json pnpm-lock.yaml` | exit 0; 0 diff lines; dependencies unchanged from origin/main |
| AC-14 | PASS | `git diff origin/main b48e4bbd -- prisma/schema.prisma` | exit 0; additive schema only, carried forward Phase A freeze 53696afb |
| AC-15 | PASS | `git diff origin/main b48e4bbd -- app/components/GlobalFooter.tsx` | exit 0; 0 changes to GlobalFooter, carried forward Phase A freeze 53696afb |
| AC-16 | PASS | `git diff origin/main b48e4bbd -- src/domains/job-board/chat-links.ts src/domains/job-board/components/landing/news-section.tsx` | exit 0; 0 changes to landing components, carried forward Phase A freeze 53696afb |
| AC-17 | PASS | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` | exit 0; RESULT: PASS (Phase A handoff substance verified, 0 errors) |
| AC-18 | PASS | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` | exit 0; RESULT: DRAFT-VALID (1 warning) |
| AC-19 | PASS | `git rev-parse fb9ae379dcea3c422f3787f30bbe66fd69df0f13^2` | exit 0; 796e13c69996756d1298bc1a7ec9b50bab935c9f matches baseline (current origin/main is 937133c2fe96ebbf80c64d5b36f5f830e215efbb) |
| AC-20 | PASS | `git log -1 --pretty=%P fb9ae379dcea3c422f3787f30bbe66fd69df0f13` | exit 0; parents are 0d4a606ca3c522a606bf69e27a5340db6dc78e18 and 796e13c69996756d1298bc1a7ec9b50bab935c9f |
| AC-21 | PASS | `git status --porcelain -- "app/(portal)/layout.tsx" "app/(portal)/page.tsx" "app/components/GlobalNavbar.tsx" "app/components/GlobalFooter.tsx" "app/components/FloatingChatActions.tsx" "app/api/public/homepage-settings/route.ts" "app/admin/settings/page.tsx" "src/domains/job-board/chat-links.ts" "src/domains/job-board/fixtures/demo-content.ts"` | exit 0; 0 rows; 0 uncommitted modifications in specified TASK paths |
| AC-22 | PASS | `git diff origin/main b48e4bbd -- prisma/schema.prisma` | exit 0; adds news_section_enabled and sticky_announcement fields |
| AC-23 | PASS | `npx --no-install vitest run --config vitest.unit.config.ts prisma/migrations/20261004230000_ui2_public_content_controls/migration.test.ts` | exit 0; 5/5 passed; migration syntax and 4096-byte CHECK constraint verified |
| AC-24 | PASS | `pwsh -Command '$env:DATABASE_URL="postgresql://localhost/fake"; $env:DATABASE_URL_ADMIN="postgresql://localhost/fake"; npx --no-install prisma validate'` | exit 0; The schema at prisma/schema.prisma is valid |
| AC-25 | PASS | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-settings.test.ts -t "getHomepageSettings"` | exit 0; 4 passed | 37 skipped (41 total tests) |
| AC-26 | PASS | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-settings.test.ts -t "updateHomepageSettings"` | exit 0; 15 passed | 26 skipped (41 total tests) |
| AC-27 | FAIL | `git ls-files "app/api/public/homepage-settings/*.test.*"` | exit 0; 0 rows; required route-level acceptance test is absent (UI2-R1-02) |
| AC-28 | FAIL | `npx --no-install vitest run --config vitest.unit.config.ts app/admin/settings/__tests__/admin-settings-form.ui2.test.ts -t "wires all required"` | exit 0; 0 tests executed; 6 skipped (admin route test absent, UI2-R1-02/03) |
| AC-29 | FAIL | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-settings.test.ts -t "rejects message over 280"` | exit 0; 0 tests executed; 41 skipped (admin route test absent, UI2-R1-02/03) |
| AC-30 | FAIL | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-settings.test.ts -t "rejects invalid ctaUrl"` | exit 0; 0 tests executed; 41 skipped (admin route test absent, UI2-R1-02/03) |
| AC-31 | PASS | `git grep -n "PublicStickyAnnouncement" app/` | exit 0; exactly 1 mount at app/(portal)/layout.tsx:21, 0 mounts in admin/auth layouts |
| AC-32 | PASS | `git grep -n "newsSectionEnabled" app/components/GlobalNavbar.tsx` | exit 0; navbar filters 'Tin tức' link at line 40 via hook gate |
| AC-33 | PASS | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls/__tests__/news-section-wrapper.test.tsx` | exit 0; 2/2 passed; renders null when newsSectionEnabled is false |
| AC-34 | FAIL | `node -e "const fs=require('fs'),s=fs.readFileSync('app/admin/settings/admin-settings-form.tsx','utf8');if(!s.includes('buildPayload'))process.exit(1);const p=s.match(/function buildPayload\(\)[^{]*\{[\s\S]*?\n  \}/);console.log(p?p[0]:'none')"` | exit 0; 1 match; buildPayload() always sends all 7 fields rather than dirty-only partial POST (UI2-R1-01) |
| AC-35 | PASS | `npm run typecheck` | exit 0; 0 type errors across workspace (carried forward from E-40a at b48e4bbd) |
| AC-36 | PASS | `npm run lint -- src/domains/job-board/public-content-controls src/domains/job-board/public-settings.service.ts src/domains/job-board/public-types.ts app/(portal)/layout.tsx app/components/GlobalNavbar.tsx app/admin/settings/admin-settings-form.tsx app/admin/settings/page.tsx app/api/admin/homepage-settings/route.ts` | exit 0; 0 errors, 919 warnings (carried forward from E-40b at b48e4bbd) |
| AC-37 | PASS | `npx --no-install vitest run --config vitest.unit.config.ts prisma/migrations/20261004230000_ui2_public_content_controls/migration.test.ts src/domains/job-board/public-settings.test.ts src/domains/job-board/public-content-controls/__tests__/news-section-wrapper.test.tsx src/domains/job-board/public-content-controls/__tests__/use-public-content-controls.test.tsx app/admin/settings/__tests__/admin-settings-form.ui2.test.ts src/domains/job-board/public-content-controls/url-safety.test.ts src/domains/job-board/public-content-controls/revision.test.ts src/domains/job-board/public-content-controls/sticky-announcement.mount.test.tsx src/domains/job-board/public-content-controls/sticky-announcement.test.tsx src/domains/job-board/public-content-controls/animation.test.ts src/domains/job-board/public-content-controls/content-controls.static.test.ts src/domains/job-board/public-content-controls/news-section-gate.test.ts src/domains/job-board/public-content-controls/__tests__/dto-projection.test.ts src/shared/ui/design-tokens.static.test.ts` | exit 0; 14 test files passed, 262 passed tests in 5.02s |
| AC-38 | PASS | `npm run build` | exit 0; Next.js production build succeeded with 0 errors (carried forward from E-40c at b48e4bbd) |
| AC-39 | PASS | `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0; RESULT: PASS (1 changed text file(s), strict UTF-8 without BOM) |
| AC-40 | PASS | `git diff --check` | exit 0; 0 whitespace or merge conflict markers |
| AC-41 | PASS | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` | exit 0; RESULT: DRAFT-VALID (1 warning(s)) |
| AC-42 | PASS | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` | exit 0; RESULT: PASS (Phase B final handoff gate verified clean) |
| AC-43 | PASS | `pwsh -Command "Get-ChildItem prisma/migrations -Directory | Sort-Object Name | Select-Object -Last 1"` | exit 0; 20261004230000_ui2_public_content_controls is lexicographically latest |
| AC-44 | PASS | `node -e "const fs=require('fs'),s=fs.readFileSync('tests/db/public-settings.integration.test.ts','utf8'),required=['created_at::text AS created_at','updated_at::text AS updated_at'],casts=s.match(/::timestamptz/g);if(!required.every(x=>s.includes(x)))process.exit(1);if(casts===null)process.exit(1);if(casts.length<2)process.exit(1);if(/new Date\(/.test(s))process.exit(1);if(/\.toISOString\(/.test(s))process.exit(1);console.log('TIMESTAMP_TEXT_RESTORE_GUARD_PASS')"` | exit 0; TIMESTAMP_TEXT_RESTORE_GUARD_PASS; carried forward E-44/E-45 from b48e4bbd; zero-residue snapshot 3156914f65d9b214c8414b36173882119a1397506157e0f58a5f403f5e9b0691 verified |

### Assurance Checks

| ID | Check | Status |
|---|---|---|
| C-07 | Is the implementation safe? | DONE via `npm run lint` exit code 0, 0 errors |
| C-09 | Are the migrations safe? | DONE via `pwsh -Command '$env:DATABASE_URL="postgresql://localhost/fake"; $env:DATABASE_URL_ADMIN="postgresql://localhost/fake"; npx --no-install prisma validate'` exit code 0 |
| C-10 | Are the tests passing? | DONE via `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-content-controls src/domains/job-board/public-settings.test.ts` exit code 0, 239 passed |

## 3. Scope
- **Audited surface**: Complete final UI2 task-surface audit (Phase A + Phase B) including `app/(portal)/page.tsx`, `app/(portal)/layout.tsx`, `app/components/GlobalNavbar.tsx`, `app/admin/settings/admin-settings-form.tsx`, `src/domains/job-board/public-content-controls/**`, `src/domains/job-board/public-settings.service.ts`, `src/domains/job-board/public-types.ts`, `prisma/schema.prisma`, migration `20261004230000_ui2_public_content_controls`, and synthetic integration test `tests/db/public-settings.integration.test.ts`.

## 4. Independent Evidence

| Evidence ID | Command | Result |
|---|---|---|
| E-01 | `node .ai-pipeline/scripts/verify-encoding-range.mjs b3d9de9b HEAD` | exit 0; 4/4 text file(s) in range b3d9de9b..HEAD; 0 BOM, 0 NUL, 0 U+FFFD, 0 CRLF, 0 mojibake streaks |
| E-02 | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` | exit 0; RESULT: PASS WITH WARNINGS (1 warning(s)) |
| E-03 | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui2-public-content-controls-sticky/TASK.md` | exit 0; RESULT: DRAFT-VALID (1 warning(s)) |
| E-04 | `git diff b48e4bbd HEAD -- . ":(exclude)docs/**"` | exit 0; 0 lines (zero semantic delta between audit anchor b48e4bbd and HEAD) |
| E-05 | `npx --no-install vitest run --config vitest.unit.config.ts prisma/migrations/20261004230000_ui2_public_content_controls/migration.test.ts src/domains/job-board/public-settings.test.ts src/domains/job-board/public-content-controls/__tests__/news-section-wrapper.test.tsx src/domains/job-board/public-content-controls/__tests__/use-public-content-controls.test.tsx app/admin/settings/__tests__/admin-settings-form.ui2.test.ts src/domains/job-board/public-content-controls/url-safety.test.ts src/domains/job-board/public-content-controls/revision.test.ts src/domains/job-board/public-content-controls/sticky-announcement.mount.test.tsx src/domains/job-board/public-content-controls/sticky-announcement.test.tsx src/domains/job-board/public-content-controls/animation.test.ts src/domains/job-board/public-content-controls/content-controls.static.test.ts src/domains/job-board/public-content-controls/news-section-gate.test.ts src/domains/job-board/public-content-controls/__tests__/dto-projection.test.ts src/shared/ui/design-tokens.static.test.ts` | exit 0; 14 test files passed, 262 passed tests in 5.02s |
| E-06 | `node -e "const fs=require('fs'),s=fs.readFileSync('tests/db/public-settings.integration.test.ts','utf8'),required=['created_at::text AS created_at','updated_at::text AS updated_at'],casts=s.match(/::timestamptz/g);if(!required.every(x=>s.includes(x)))process.exit(1);if(casts===null)process.exit(1);if(casts.length<2)process.exit(1);if(/new Date\(/.test(s))process.exit(1);if(/\.toISOString\(/.test(s))process.exit(1);console.log('TIMESTAMP_TEXT_RESTORE_GUARD_PASS')"` | exit 0; TIMESTAMP_TEXT_RESTORE_GUARD_PASS; timestamp text restoration verified, no Date/toISOString precision loss |
| E-07 | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-settings.test.ts -t "getHomepageSettings"` | exit 0; 4 passed | 37 skipped (41 total tests) |
| E-08 | `npx --no-install vitest run --config vitest.unit.config.ts src/domains/job-board/public-settings.test.ts -t "updateHomepageSettings"` | exit 0; 15 passed | 26 skipped (41 total tests) |
| E-09 | `npx --no-install vitest run --config vitest.unit.config.ts app/admin/settings/__tests__/admin-settings-form.ui2.test.ts -t "wires all required"` | exit 0; 0 tests executed; 6 skipped (admin route test absent) |

## 5. Coverage Gaps
- **Implementation gap (UI2-R1-01 / AC-34):** `app/admin/settings/admin-settings-form.tsx` `buildPayload()` unconditionally transmits all settings fields instead of a dirty-field-only partial POST payload. This violates AC-34 and risks overwriting concurrent admin updates.
- **Test coverage gaps (UI2-R1-02 / AC-27, AC-28, AC-29, AC-30):** Missing route-level integration tests for `/api/public/homepage-settings` (AC-27 projection) and `/api/admin/homepage-settings` (AC-28 persist + revalidate, AC-29 400 for message > 280, AC-30 400 for unsafe CTA URL). Existing hook and service tests do not verify Next.js route handlers.
- **Reporting gap (UI2-R1-03):** Previous pass declarations for AC-28/29/30 relied on Vitest filters that executed zero tests (100% skipped).
- **Environment limitation:** Synthetic PostgreSQL integration credentials (`DATABASE_URL_TEST` / `DATABASE_URL_ADMIN_TEST`) are absent in this ambient execution environment; `tests/db/public-settings.integration.test.ts` self-skips via `describe.skipIf(!writerUrl && !adminUrl)`. Carried forward E-44/E-45 from `b48e4bbd` based on zero semantic delta.

## 6. Verdict & Recommendation
**Verdict:** FAIL

Based on independent review and verification:
1. **Implementation Defect (UI2-R1-01):** AC-34 is violated because `admin-settings-form.tsx` `buildPayload()` always submits the full settings payload rather than issuing a dirty-field-only partial POST.
2. **Missing Acceptance Tests (UI2-R1-02):** Route-level test coverage required by AC-27, AC-28, AC-29, and AC-30 is absent.
3. **Execution Gaps (UI2-R1-03):** AC-28, AC-29, and AC-30 were previously passed using filters that ran 0 tests (all skipped).

**Recommendation:** DO NOT MERGE. Tier 1 must consume correction budget to fix `buildPayload()` in `admin-settings-form.tsx` to transmit only dirty fields, and author route-level tests for AC-27 through AC-30 before requesting re-audit.

## 7. Re-audit Trace

| Round | Date | Reason |
|---|---|---|
| 1 | 2026-10-04 | Initial audit round 1: FAIL due to AC-34 dirty-payload violation, missing route-level tests (AC-27..30), and filter discrepancies |

Báo cáo AUDIT.md cho Tier 1.
