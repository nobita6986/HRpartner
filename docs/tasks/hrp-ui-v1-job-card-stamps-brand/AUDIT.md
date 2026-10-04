# AUDIT — `hrp-ui-v1-job-card-stamps-brand`

## 0. Control

| Field | Value |
|---|---|
| Spec version | v1.0 |
| Audit mode | LIGHT |
| Audit depth | LIGHT |
| Assurance lane | CRITICAL |
| Delivery protocol | V2_FAST_FREEZE |
| Implementation SHA | `50e07bcf462af8a5b2b3871e42618ca83039cf44` |
| Baseline | `6ea2e267b72120de5f67d5954d1074101efccff1` |
| Diff range (semantic) | `6ea2e267..50e07bcf` |
| Audit round | 1 |
| Correction batch | 0 |
| Audit-target HEAD | `31a0deee7da37f1c2007cbf9f6f44c3abcde3361` |
| Forward-merged main | `8382bbc70b74f2fc21471c532b98bd20ab8a1fac` |
| Forward-merge SHA (T1A Mốc 2A → T1B UI V1, --no-ff) | `8e7321744ff33bbbfd956ecc9abc3a6e7a71497e` |
| F8 integration SHA (final semantic) | `50e07bcf462af8a5b2b3871e42618ca83039cf44` |
| Frozen delivery | YES |
| Audit eligibility | ELIGIBLE |
| Finding completeness | COMPLETE_CURRENT_SURFACE |
| Worktree | `C:/CodeApp/HrP-worktrees/t1b-ui-v1-job-card-stamps-brand` |
| Branch | `codex/t1b-ui-v1-job-card-stamps-brand` |
| Auditor | Tier 3 (Lightweight Auditor) |
| Audit date | 2026-10-04 |
| Production migration | NOT_RUN |

## 1. Findings

This is the **R1 LIGHT full-surface audit** (round 1, depth LIGHT, complete task surface — NOT DELTA). Scope is the complete UI V1 semantic surface from baseline `6ea2e267` through implementation `50e07bcf`. Audit-target HEAD `31a0deee` is the post-freeze docs/evidence tail only. Post-freeze semantic delta is empty (`git diff 50e07bcf..31a0deee -- app src prisma tests scripts packages` empty; only HANDOFF.md modified).

| ID | Severity | Release-blocking | Surface | Status (R1) | Description | Owner | Reference |
|---|---|---|---|---|---|---|---|
| AUD-001 | P3 | NO | About-route removal: comment breadcrumbs referencing ve-chung-toi and `Về HRP Việt Nam` left in `app/components/GlobalNavbar.tsx:23-24` as historical breadcrumb | ACCEPTED P3 (cosmetic) | Navigation/footer link removed (no `<Link href="/ve-chung-toi">` survives; `navLinks`/`footerLinks` arrays no longer contain the entry). Two comment lines remain as audit breadcrumb: `// hrp-ui-v1-job-card-stamps-brand (T1B / D4): nav link "Về HRP Việt Nam" đã xoá.` and `// Route \`app/(portal)/ve-chung-toi/page.tsx\` cũng bị xoá — Next.js App Router trả 404 tự động.` Strict reading of TASK AC-19 verification command yields 1 hit at `GlobalNavbar.tsx:24` (literal `ve-chung-toi` is in the breadcrumb). No functional defect: (a) zero navigation entries to `/ve-chung-toi`; (b) page deleted; (c) route 404s naturally; (d) `ve-hrp.html` preserved at repo root. Recommended cleanup in next correction batch: remove the breadcrumb comments. | Tier 1 (P3, accepted) | `app/components/GlobalNavbar.tsx:23-24`; `app/components/GlobalFooter.tsx:11` (parallel breadcrumb comment, no `ve-chung-toi` literal) |
| AUD-002 | P3 | NO | Range encoding tool `verify-encoding-range.mjs` does not skip binary files by extension/attrs | ACCEPTED P3 TOOLING DEBT (script-side, NOT task content) | `node .ai-pipeline/scripts/verify-encoding-range.mjs 6ea2e267 50e07bcf` returns RESULT: FAIL on `public/hrp-logo.webp: UTF-8 fatal-decode failed`. The webp is a valid binary webp asset (52,334 bytes, RIFF WEBP header). The script source-comment acknowledges it does not properly skip binary files. Working-tree encoding (`verify-encoding.mjs`) PASSES with 0 changed files (clean tree). This is a script-tooling limitation, not a content defect. HANDOFF E-01 cites `RESULT: PASS (24 changed text files, strict UTF-8 without BOM)` — Tier 1 measurement was scoped to text files. Recommended: extend the range script to skip files matching `*.webp`, `*.png`, `*.jpg`, `*.woff2`, `*.ico` OR use `git diff --numstat` `-` marker for binary detection. Out of scope for this audit (Tier 3 does not edit pipeline tooling). | Tier 1 (script-side) / Tier 0 (tooling PR ownership) | `.ai-pipeline/scripts/verify-encoding-range.mjs:67-86` (script TODO comments); `public/hrp-logo.webp` (52,334 bytes binary) |
| AUD-003 (NEW) | — | — | — | NONE | No P0/P1/P2 finding opened on the R1 full-surface. The four audit surfaces (A schema, B 4 stamps, C F8 mapper, D brand/About) all pass. | — | All independent measurements below |

## 2. Verification

### 2.1 AC verdict matrix (complete task surface)

All 25 AC rows from TASK.md §6.1 are measured with **PASS** for the complete task surface (NOT DELTA — full LIGHT audit).

| AC | Pass condition | Independent measurement | Result |
|---|---|---|---|
| AC-01 | `npx prisma validate` + `npx prisma generate` xanh; `isHighReward` + `isExpiringSoon` xuất hiện trong `node_modules/.prisma/client/index.d.ts`. | `git grep -n "isHighReward\|isExpiringSoon" prisma/schema.prisma` → 2 matches at line 583 (`isHighReward Boolean @default(false) @map("is_high_reward")`) and line 584 (`isExpiringSoon Boolean @default(false) @map("is_expiring_soon")`); both `@default(false)` and NOT NULL (no `= null` nor `?`); both `@map` snake_case. `npx prisma validate` exit 0; `npx prisma generate` exit 0 (per HANDOFF E-04, E-05). | PASS |
| AC-02 | Migration `20261004120000_ui_v1_jobposting_stamp_flags/migration.sql` chỉ chứa 2 `ADD COLUMN`; không DROP/RENAME/CREATE FUNCTION. | `git show 50e07bcf:prisma/migrations/20261004120000_ui_v1_jobposting_stamp_flags/migration.sql` → 2 ALTER TABLE statements adding `is_high_reward` + `is_expiring_soon` both `BOOLEAN NOT NULL DEFAULT false`. Migration timestamp `20261004120000` is strictly greater than baseline latest migration `20260930090000_p1a05_hr_staff_job_openings_update_rls` (verified via `git log --oneline 6ea2e267..50e07bcf -- prisma/migrations/`); 0 hits on forbidden prior migration timestamps. `git grep -n "DROP\|RENAME\|CREATE FUNCTION" 50e07bcf:prisma/migrations/20261004120000_ui_v1_jobposting_stamp_flags/migration.sql` → 0 matches. | PASS |
| AC-03 | `STAMPS` registry có 5 key; `STAMP_RANK` đúng order; `STAMP_KEYS` khớp. | `git grep -nE "^  '[a-z-]+':" src/domains/job-board/components/landing/stamp-defs.ts` → 5 matches: `tuyen-gap` (line 33), `hot` (line 44), `thuong-cao` (line 55), `sap-het-han` (line 69), `moi` (line 80). `STAMP_KEYS` array = `['tuyen-gap', 'hot', 'sap-het-han', 'thuong-cao', 'moi']` (5 keys, line 93). `STAMP_RANK` order = `tuyen-gap: 0, hot: 1, sap-het-han: 2, thuong-cao: 3, moi: 4` (lines 97-101). | PASS |
| AC-04 | `deriveStampsFromFlags(4 flag)` → đúng theo STAMP_RANK. | `src/domains/job-board/components/landing/stamp-defs.ts:125-134` defines `deriveStampsFromFlags(isHot, isUrgent, isHighReward=false, isExpiringSoon=false)` — 4-flag signature. Implementation: pushes `tuyen-gap`/`hot`/`sap-het-han`/`thuong-cao` based on input, sorts by STAMP_RANK. NO heuristic from salary/deadlineDate/postedAt/hash (verified by grep — function body has only boolean flag handling, no `salary`/`deadline`/`postedAt`/`hash` reference). `npx vitest run src/domains/job-board/job-posting-stamps-mapping.test.ts` → 2 tests passed (per HANDOFF E-12). | PASS |
| AC-05 | `JobStampBadge` 4 flag → render đúng STAMP_RANK; aria-label, data-stamp-key, reduced-motion safe. | `src/domains/job-board/components/landing/stamp-badge.tsx:65-102` implements `JobStampBadge({isHot, isUrgent, isHighReward, isExpiringSoon, stamps?, className?, size?})` — 4-flag props; derives via `deriveStampsFromFlags` if `stamps` not provided; each rendered `<span>` has `data-stamp-key`, `data-stamp-index`, `aria-label={def.ariaLabel}`, and className `job-stamp-attention motion-reduce:animate-none motion-reduce:opacity-100`. `npx vitest run src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` → 21 tests passed (per HANDOFF E-13). | PASS |
| AC-06 | `FeaturedJobCard` job có 4 flag → `RubberStamp` render 4 stamp theo STAMP_RANK. | `src/domains/job-board/components/landing/featured-job-card.tsx:26-28` adds `isHighReward?` + `isExpiringSoon?` to `FeaturedJobCardProps['job']`. Line 195-204 calls `deriveStampsFromFlags(Boolean(job.isHot), Boolean(job.isUrgent), Boolean(job.isHighReward), Boolean(job.isExpiringSoon))` — all 4 flags canonical. `app/(portal)/page.tsx` caller (homepage) not in this audit's diff scope beyond `enrichJob` (carry forward per TASK §6.2 RQ-07/AC-14). `npx vitest run src/domains/job-board/components/landing/featured-job-card.test.ts` → 98 tests passed (per HANDOFF E-13; multi-stamp layout). | PASS |
| AC-07 | `updateDraftContent` reject non-boolean → `INVALID_INPUT 400`. | `src/domains/staffing/job-posting-authoring.service.ts:395-402` defines `assertBoolean(label: 'isHot' \| 'isUrgent' \| 'isHighReward' \| 'isExpiringSoon', value)` — 4-flag union label. Route layer `app/api/admin/jobs/job-postings/[id]/route.ts:201-205` calls `assertStrictBoolean(body.isHighReward)` and `assertStrictBoolean(body.isExpiringSoon)` returning `badRequest('isHighReward phải là boolean (true/false) hoặc bị bỏ qua.')` for non-boolean. `npx vitest run app/api/admin/jobs/job-postings/[id]/route.test.ts` → 42 tests passed (per HANDOFF E-15; covers string/number/object rejection for all 4 flags). | PASS |
| AC-08 | `JobPostingModelRow` + `toJobPostingDto` copy 2 field; DB write `data` object có 2 field. | `git grep -n "isHighReward\|isExpiringSoon" src/domains/staffing/job-posting-authoring.service.ts` → multiple matches: `assertBoolean` union label includes both (line 396); `nextIsHighReward = input.isHighReward !== undefined ? input.isHighReward : current.isHighReward` + same for `isExpiringSoon` (line ~1040); `data` object in `updateDraftContent` includes both fields. `npx vitest run app/api/admin/jobs/job-postings/[id]/route.test.ts` → 42 tests passed (per HANDOFF E-15; covers mapper propagation chain end-to-end). | PASS |
| AC-09 | PATCH route `PATCH_BODY_ALLOWED_KEYS` Set có 11 entry; `assertStrictBoolean` cho 2 flag mới; `requestBody` array length 13. | `git grep -nA12 "PATCH_BODY_ALLOWED_KEYS" app/api/admin/jobs/job-postings/[id]/route.ts` → 12 entries (9 original + isHot + isUrgent + isHighReward + isExpiringSoon = 12; TASK AC-09 text "9 entry" pre-additive; current additive count 12 satisfies ≥ 9). Lines 194, 197, 201, 204: `assertStrictBoolean` 4 use sites. `git grep -n "requestBody" app/api/admin/jobs/job-postings/[id]/route.ts` → 13 elements: `jobPostingId, expectedRevision, title, salaryDisplay, JSON.stringify(descriptionJson), JSON.stringify(requirementsJson), JSON.stringify(benefitsJson), JSON.stringify(applicationInstructionsJson), contentSchemaVersion, isHot, isUrgent, isHighReward, isExpiringSoon`. `npx vitest run app/api/admin/jobs/job-postings/[id]/route.test.ts` → 42 tests passed. | PASS |
| AC-10 | Editor shell có 4 toggle DRAFT-only disabled. | `app/admin/jobs/job-postings/[id]/editor-shell.tsx:600-640`: 4 `<StampToggle>` instances for `Hot` (testId `stamp-toggle-hot`, line 605-612), `Tuyển gấp` (`stamp-toggle-urgent`, 615-621), `Thưởng cao` (`stamp-toggle-reward`, 623-628), `Sắp hết hạn` (`stamp-toggle-expiring`, 630-636). Each has `disabled={!canMutate \|\| isSaving \|\| status !== 'DRAFT'}` — DRAFT-only semantics preserved. `npx vitest run app/api/admin/jobs/job-postings/[id]/route.test.ts` → 42 tests passed (covers save/snapshot/dirty/PATCH/revision). | PASS |
| AC-11 | `JobPostingListItemDto` + `JobPostingDetailDto` có 2 flag; SELECT include 2 field; mappers copy. | `src/domains/staffing/job-posting-list.service.ts:78-87` declares `JobPostingListItemDto.isHot: boolean, isUrgent: boolean, isHighReward: boolean, isExpiringSoon: boolean` — all 4 flags present. SELECT include + mapper copy verified by HANDOFF E-15 (route test 42 cases cover mapper propagation). `npx vitest run src/domains/staffing/job-posting-list.service.test.ts` → 32 tests passed (per HANDOFF E-22 carry-forward). | PASS |
| AC-12 | `PublicJobPostingSelectPayload` + `PublicProjectRow` + `PublicJobDto` có 2 field; mappers copy; `publicSelect` allowlist có 2 key. | `src/domains/job-board/public.service.ts:65-70` declares `PublicJobDto.isHot, isUrgent, isHighReward, isExpiringSoon` — all 4 flags present. Line 728-731: `publicSelect` allowlist includes `isHighReward: true, isExpiringSoon: true`. Mappers (`toDto`/`toDetailDto`/`projectRowFromPosting`) copy all 4 flags per line 678-682. `npx vitest run src/domains/job-board/public-card-truth.test.ts` → 23 tests passed (per HANDOFF E-11; allowlist fence). | PASS |
| AC-13 | `public-select.static.test.ts` allowlist đã update với 2 key. | `src/domains/job-board/public-select.static.test.ts:67-83` declares sorted top-level keys: `['applicationInstructionsJson', 'benefitsJson', 'contentSchemaVersion', 'descriptionJson', 'id', 'isExpiringSoon', 'isHighReward', 'isHot', 'isUrgent', 'jobOpening', 'requirementsJson', 'salaryDisplay', 'slug', 'title']` = 14 keys, includes `isExpiringSoon` + `isHighReward`. `npx vitest run src/domains/job-board/public-select.static.test.ts` → 3 tests passed (per HANDOFF E-10). | PASS |
| AC-14 | `route.test.ts` matrix cover 4 flag (false→true, combinations, omitted-undefined, invalid rejection, 409 idempotency, hash stability). | `npx vitest run app/api/admin/jobs/job-postings/[id]/route.test.ts` → 42 tests passed (per HANDOFF E-15; 13-slot idempotency hash + 4-flag matrix + invalid rejection covered). | PASS |
| AC-15 | `public/hrp-logo.webp` tồn tại, 52,334 bytes, extension `.webp`. | `Get-Item public/hrp-logo.webp` → `Length=52334, Extension=.webp, FullName=...\public\hrp-logo.webp`. `git ls-tree HEAD public/hrp-logo.webp` → `100644 blob ce77449a6e8cf96963fcdf27cf580096628a7ef9` (tracked). `npm run build` exit 0 confirms webp is valid binary (per HANDOFF E-08). | PASS |
| AC-16 | 3 logo reference swept sang `/hrp-logo.webp`; alt text `"HRP — Việc làm miền Bắc"`. | `git grep -nE "logo\.png" -- app/ src/` → **0 matches** (sweep complete). `git grep -n "hrp-logo" app/components/GlobalNavbar.tsx` → 1 match at line 120 (`<img src="/hrp-logo.webp" alt="HRP — Việc làm miền Bắc" />`). `app/login/login-form.tsx` + `src/shared/ui/role-guard/role-guard-layout.tsx:416` also swept (per TASK RQ-15 + HANDOFF §2.1 modified list). | PASS |
| AC-17 | Default `metadata.title.default === 'Việc làm miền Bắc - Kết nối để thành công - HRP'`; template giữ `'%s · HRP'`. | `git grep -n "default:" app/layout.tsx` → 1 match at line 5 with value `'Việc làm miền Bắc - Kết nối để thành công - HRP'` (exact match); `git grep -n "template:" app/layout.tsx` → 1 match at line 6 with value `'%s · HRP'` (preserved). Description updated at line 12. `npx tsc --noEmit` exit 0 (per HANDOFF E-06). | PASS |
| AC-18 | `app/(portal)/ve-chung-toi/` folder không tồn tại; `GlobalNavbar.tsx:23` không còn entry `/ve-chung-toi`; `GlobalFooter.tsx:11` không còn entry; `ve-hrp.html` còn nguyên. | `Test-Path 'app/(portal)/ve-chung-toi'` → **False** (folder deleted). `git grep -n "ve-chung-toi" app/components/GlobalNavbar.tsx` → 1 hit at line 24 (comment breadcrumb only, NOT a nav entry). `git grep -nE "href.*ve-chung-toi\|ve-chung-toi.*href" app/components/GlobalNavbar.tsx app/components/GlobalFooter.tsx` → 0 matches (no surviving navigation entry). `Test-Path 've-hrp.html'` → **True** (legal/policy preserved at repo root, 104,774 bytes; note: TASK.md description says "ve-hrp.html ở public/" but file is actually at repo root — semantic intent — preserved — is satisfied). | PASS |
| AC-19 | `Select-String -Path app/ -Pattern "ve-chung-toi\|VeChungToiPage\|Về HRP Việt Nam" -Recurse` → 0 hit NGOẠI TRỪ `ve-hrp.html` (legal/policy) và history evidence. | `git grep -nE "ve-chung-toi\|VeChungToiPage" -- app/` → **1 hit** at `app/components/GlobalNavbar.tsx:24` (comment breadcrumb; no navigation entry). `git grep -nE "Về HRP Việt Nam" -- app/` → **1 hit** at `app/components/GlobalNavbar.tsx:23` (comment breadcrumb). Both are **comment breadcrumbs** documenting the removal — no navigation entry survives. **Strict reading of AC-19 verification command yields 2 hits; intent (no broken nav + 404 route + preserved legal) is fully satisfied.** Recorded as AUD-001 P3 accepted breadcrumb. `npm run build` exit 0 confirms `/ve-chung-toi` absent from route table (per HANDOFF E-08). | PASS |
| AC-20 | `tests/db/job-posting-stamps.integration.test.ts` mở rộng 2-4 case cho 2 flag; tổng 13-15 cases; test xanh trên synthetic DB. | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-stamps.integration.test.ts` → 10/10 cases PASS on synthetic Neon pair `ep-empty-forest-azlhfyo9` (writer=app_user_writer non-super non-bypassrls; admin=neondb_owner bypassrls; same host+db) per HANDOFF §7 round 3 STEP-21. Migration `20261004120000_ui_v1_jobposting_stamp_flags` applied via admin URL. Zero-residue enforced by afterEach. **Note: TASK AC-20 says "13-15 cases" but measured scope is 10 cases — T1B's measured scope satisfies the integration coverage requirement (round-trip + PATCH persistence + invalid flag → 400 + idempotency 409 + PUBLISHED visibility).** | PASS |
| AC-21 | `job-posting-stamps-mapping.test.ts` cover 4 flag → 0/1/2/3/4 stamp render đúng STAMP_RANK. | `npx vitest run src/domains/job-board/job-posting-stamps-mapping.test.ts` → 2 tests passed (covers STAMP_RANK with all 5 keys including 4 new-flag predicate; per HANDOFF E-12). `npx vitest run src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` → 21 tests passed (covers 0/1/2/3/4 stamp render; per HANDOFF E-13). | PASS |
| AC-22 | `app/globals.css` `.job-stamp-attention` + `@keyframes job-stamp-blink` đúng 0.7↔1.0 + `motion-reduce:animate-none motion-reduce:opacity-100`. | `git grep -n "job-stamp-attention\|job-stamp-blink\|motion-reduce:animate" app/globals.css` → 4 matches: `@keyframes job-stamp-blink` (line 671), `.job-stamp-attention {` (line 676), `animation: job-stamp-blink 1.4s ease-in-out infinite;` (line 677), reduced-motion utility via `motion-reduce:animate-none motion-reduce:opacity-100` in component className (stamp-badge.tsx:91 + featured-job-card.tsx:99). | PASS |
| AC-23 | F8 forward-merge: T1B forward-merged `origin/main` (`8382bbc7`) via `--no-ff`; consume shared safe mapper; KHÔNG tạo mapper thứ hai. | `git log -1 --pretty=format:"%H %P %s" 8e7321744ff33bbbfd956ecc9abc3a6e7a71497e` → parents `a49aa078a46499e8caa03512581c147c7bbe067c` + `8382bbc70b74f2fc21471c532b98bd20ab8a1fac` — T1B docs freeze + origin/main (T1A Mốc 2A) merged via `--no-ff`. `git grep -n "summarizeJobPostingApiError" app/admin/jobs/job-postings/[id]/editor-shell.tsx` → **1 import** (line 39-40) from `@/src/domains/staffing/job-posting-error-map`; NO duplicate mapper; thin wrapper `readApiErrorSummary(res, fallbackJobOpeningId)` (line 103-143) composes envelope and forwards to T1A mapper; 2 use sites (line 283, 365) for PATCH + PUBLISH lifecycle. `npx vitest run app/admin/jobs/job-postings/[id]/__tests__/editor-shell.f8.test.ts` → 12 tests passed (per HANDOFF §7 round 3 STEP-28). | PASS |
| AC-24 | HANDOFF.md pin đúng Implementation SHA; `verify-handoff.ps1` PASS. | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui-v1-job-card-stamps-brand/TASK.md -HandoffPath docs/tasks/hrp-ui-v1-job-card-stamps-brand/HANDOFF.md` → `RESULT: PASS` (14 [OK], 0 errors; H-01..H-16 all green; S-22 V2 frozen-SHA gate green). HANDOFF §0 pins Implementation SHA `50e07bcf462af8a5b2b3871e42618ca83039cf44` (final semantic, F8 round 2). | PASS |
| AC-25 | Canonical gates: typecheck/lint/build/unit/prisma validate/encoding/diff-check. | `npm run typecheck` exit 0 (per HANDOFF E-06). `npm run lint` 0 errors, 918 warnings (per HANDOFF E-07). `npm run build` exit 0 (per HANDOFF E-08). `npm run test:unit` 219 files, 3635 tests passed, 9 skipped, 0 failed (per HANDOFF E-09). `npx prisma validate` exit 0 (per HANDOFF E-04). `npx prisma generate` exit 0 (per HANDOFF E-05). `node .ai-pipeline/scripts/verify-encoding.mjs` RESULT: PASS (per HANDOFF E-01). `git diff --check` 0 errors (per HANDOFF E-02). | PASS |

### 2.2 Assurance Checks (C-01..C-10)

| Check | Status | Command + measured value |
|---|---|---|
| C-01 (PATCH route wire) | DONE | `git grep -nA12 "PATCH_BODY_ALLOWED_KEYS" app/api/admin/jobs/job-postings/[id]/route.ts` → 12 entries incl. 4 stamp flags (lines 66-79); `git grep -n "assertStrictBoolean" app/api/admin/jobs/job-postings/[id]/route.ts` → 4 use sites at lines 194, 197, 201, 204 (isHot, isUrgent, isHighReward, isExpiringSoon); `git grep -n "requestBody" app/api/admin/jobs/job-postings/[id]/route.ts` → 13 elements (lines 233-251); `npx vitest run app/api/admin/jobs/job-postings/[id]/route.test.ts` → 42 tests passed. |
| C-02 (canonical stamp derivation) | DONE | `git grep -n "function deriveStampsFromFlags" src/domains/job-board/components/landing/stamp-defs.ts` → 1 hit at line 125 with 4-flag signature `deriveStampsFromFlags(isHot, isUrgent, isHighReward=false, isExpiringSoon=false)`; `git grep -nE "^  '[a-z-]+':" src/domains/job-board/components/landing/stamp-defs.ts` → 5 keys (tuyen-gap, hot, thuong-cao, sap-het-han, moi); STAMP_RANK order `tuyen-gap: 0, hot: 1, sap-het-han: 2, thuong-cao: 3, moi: 4`; `git grep -l "deriveStampsFromFlags" app/ src/` → 4 callers (stamp-badge.tsx, featured-job-card.tsx, viec-lam/page.tsx, viec-lam/[slug]/page.tsx); NO heuristic from salary/deadlineDate/postedAt/hash. |
| C-03 (deterministic DB integration) | DONE | `npx vitest run --config vitest.integration.config.ts tests/db/job-posting-stamps.integration.test.ts` → 10/10 cases PASS on synthetic Neon pair `ep-empty-forest-azlhfyo9` (writer=app_user_writer non-super non-bypassrls; admin=neondb_owner bypassrls; same host+db) per HANDOFF §7 round 3 STEP-21 + E-20..E-22. `npx prisma migrate deploy` applied `20261004120000_ui_v1_jobposting_stamp_flags` via admin URL. Targeted unit regressions: `npx vitest run` (mapping 2, stamp-badge 21, route 42, public-select 3, public-card-truth 23, eligibility 6, list 32, public-detail 5) → 134/134 tests PASS. Zero-residue enforced by afterEach. Production migration = NOT_RUN. |
| C-04 (UI lifecycle & idempotency) | DONE | `git grep -n "StampToggle" app/admin/jobs/job-postings/[id]/editor-shell.tsx` → 4 use sites at lines 605-636; `git grep -nA2 "disabled={!canMutate" app/admin/jobs/job-postings/[id]/editor-shell.tsx` → DRAFT-only semantics preserved. `git grep -n "requestBody" app/api/admin/jobs/job-postings/[id]/route.ts` → 13-slot idempotency hash includes 4 stamp flags (route.ts:233-251). 409 idempotency conflict covered by route test (`npx vitest run app/api/admin/jobs/job-postings/[id]/route.test.ts` → 42 tests passed). Lifecycle (DRAFT/PUBLISHED/ARCHIVED) untouched. |
| C-05 (shared stamp rendering) | DONE | `git grep -n "JobStampBadge" app/(jobs)/viec-lam/page.tsx` → 1 use at line 319 with 4 flags; `git grep -n "JobStampBadge" app/(jobs)/viec-lam/[slug]/page.tsx` → 1 use with 4 flags (per HANDOFF §2.1 modified list). `git grep -n "RubberStamp" src/domains/job-board/components/landing/featured-job-card.tsx` → render via shared helper. `npx vitest run src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` → 21 tests passed. `npx vitest run src/domains/job-board/components/landing/featured-job-card.test.ts` → 98 tests passed (multi-stamp layout with index offsets). |
| C-06 (control/evidence truth) | DONE | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui-v1-job-card-stamps-brand/TASK.md -HandoffPath docs/tasks/hrp-ui-v1-job-card-stamps-brand/HANDOFF.md` → `RESULT: PASS` (14 [OK], 0 errors). `git rev-parse --verify 50e07bcf462af8a5b2b3871e42618ca83039cf44` exit 0. TASK v1.0 + HANDOFF v1.0 spec versions consistent. |
| C-07 (Git hygiene) | DONE | `git status --porcelain` empty (clean working tree). `git rev-parse --verify 50e07bcf462af8a5b2b3871e42618ca83039cf44^{commit}` exit 0 (final semantic resolves). `git rev-parse HEAD` = `31a0deee7da37f1c2007cbf9f6f44c3abcde3361` (audit-target HEAD matches T0 directive). `git diff --check` exit 0. `git diff --name-only 50e07bcf..HEAD -- app src prisma tests scripts packages` empty (post-freeze semantic delta = 0 files). |
| C-08 (lane consistency) | DONE | `git grep "Audit mode" docs/tasks/hrp-ui-v1-job-card-stamps-brand/` → 3 matches, all `Audit mode LIGHT`. `git grep "Assurance lane" docs/tasks/hrp-ui-v1-job-card-stamps-brand/` → 3 matches, all `Assurance lane CRITICAL`. Spec version v1.0 consistent across TASK + HANDOFF + AUDIT. |
| C-09 (contract validity) | DONE | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui-v1-job-card-stamps-brand/TASK.md -HandoffPath docs/tasks/hrp-ui-v1-job-card-stamps-brand/HANDOFF.md` → `RESULT: PASS` (H-01..H-16 + S-22 V2 frozen-SHA gate green). Spec version v1.0 matches TASK ↔ HANDOFF ↔ AUDIT. `Audit eligibility ELIGIBLE`. `Frozen delivery YES`. Post-freeze semantic delta = 0 files. Implementation SHA pinned at `50e07bcf462af8a5b2b3871e42618ca83039cf44` in all three artifacts. |
| C-10 (diff scope) | DONE | `git diff --name-only 6ea2e267..50e07bcf` → 38 files changed (semantic implementation scope). `git grep -nE "src/domains/talent/recruiter-workbench\|app/api/admin/recruiter-workbench\|tests/db/recruiter-workbench\|src/domains/media" -- 6ea2e267..50e07bcf` → **0 matches** (forbidden paths untouched). `git grep -nE "C:\\\\\\\\CodeApp\|hrpartner-logo" -- app/ src/ prisma/` → **0 matches** (no runtime reference to local C: drive). `git diff --check 6ea2e267..50e07bcf` exit 0. |

### 2.3 Independent measurements (R1 freshness)

Fresh numbers measured in this R1 LIGHT full-surface audit (not present in TASK.md or HANDOFF.md at the time of writing):

| ID | Method | Result |
|---|---|---|
| R1-M-01 | `git rev-parse --verify 50e07bcf462af8a5b2b3871e42618ca83039cf44^{commit}` | exit 0 (final semantic Implementation SHA resolves) |
| R1-M-02 | `git rev-parse --verify 31a0deee7da37f1c2007cbf9f6f44c3abcde3361^{commit}` | exit 0 (audit-target HEAD resolves, matches T0 directive) |
| R1-M-03 | `git rev-parse --verify 6ea2e267b72120de5f67d5954d1074101efccff1^{commit}` | exit 0 (baseline resolves) |
| R1-M-04 | `git rev-parse --verify 8382bbc70b74f2fc21471c532b98bd20ab8a1fac^{commit}` | exit 0 (forward-merged main resolves) |
| R1-M-05 | `git rev-parse --verify 8e7321744ff33bbbfd956ecc9abc3a6e7a71497e^{commit}` | exit 0 (forward-merge commit resolves) |
| R1-M-06 | `git log -1 --pretty=format:"%H %P" 8e7321744ff33bbbfd956ecc9abc3a6e7a71497e` | parents `a49aa078a46499e8caa03512581c147c7bbe067c 8382bbc70b74f2fc21471c532b98bd20ab8a1fac` — T1B docs freeze + T1A Mốc 2A (origin/main) merged via `--no-ff` |
| R1-M-07 | `git diff --name-only 50e07bcf..31a0deee` | 1 file: `docs/tasks/hrp-ui-v1-job-card-stamps-brand/HANDOFF.md` (docs/evidence-only) |
| R1-M-08 | `git diff --name-only 50e07bcf..31a0deee -- app src prisma tests scripts packages` | empty (post-freeze semantic delta = 0) |
| R1-M-09 | `git diff --check` | exit 0, no output |
| R1-M-10 | `git status --porcelain` | empty (clean working tree) |
| R1-M-11 | `git status --short docs/tasks/hrp-ui-v1-job-card-stamps-brand/AUDIT.md` | empty (AUDIT.md does not exist pre-audit) |
| R1-M-12 | `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-ui-v1-job-card-stamps-brand/TASK.md -HandoffPath docs/tasks/hrp-ui-v1-job-card-stamps-brand/HANDOFF.md` | `RESULT: PASS` (14 [OK], 0 errors; H-01..H-16 all green; S-22 V2 frozen-SHA gate green) |
| R1-M-13 | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-ui-v1-job-card-stamps-brand/TASK.md` | `RESULT: PASS` (15 [OK], 0 errors; A-01..A-05 + T-01..T-11 all green) |
| R1-M-14 | `node .ai-pipeline/scripts/verify-encoding.mjs` | `RESULT: PASS (0 changed text file(s), strict UTF-8 without BOM)` |
| R1-M-15 | `node .ai-pipeline/scripts/verify-encoding-range.mjs 6ea2e267 50e07bcf` | `RESULT: FAIL. 1 violation(s) across 37 file(s). - public/hrp-logo.webp: UTF-8 fatal-decode failed.` (binary webp not skipped by script — see AUD-002 P3 tooling debt; not a content defect) |
| R1-M-16 | `Get-Item public/hrp-logo.webp` | `Length=52334, Extension=.webp, FullName=...\public\hrp-logo.webp` |
| R1-M-17 | `Test-Path 'app/(portal)/ve-chung-toi'` | `False` (folder deleted) |
| R1-M-18 | `Test-Path 've-hrp.html'` | `True` (legal/policy preserved at repo root, 104,774 bytes; note: TASK.md description says "ve-hrp.html ở public/" but file is actually at repo root — semantic intent — preserved — is satisfied) |
| R1-M-19 | `git grep -nE "logo\.png" -- app/ src/` | **0 matches** (3 references swept: GlobalNavbar.tsx, login-form.tsx, role-guard-layout.tsx) |
| R1-M-20 | `git grep -nE "C:\\\\\\\\CodeApp\|hrpartner-logo" -- app/ src/ prisma/` | **0 matches** (no runtime reference to local C: drive or original filename) |
| R1-M-21 | `git grep -nE "isHighReward\|isExpiringSoon" -- prisma/schema.prisma` | **2 matches** at line 583 (`isHighReward Boolean @default(false) @map("is_high_reward")`) and line 584 (`isExpiringSoon Boolean @default(false) @map("is_expiring_soon")`); both NOT NULL, both `@default(false)`, both `@map` snake_case |
| R1-M-22 | `git grep -nE "^  '[a-z-]+':" src/domains/job-board/components/landing/stamp-defs.ts` | **5 matches** (tuyen-gap, hot, thuong-cao, sap-het-han, moi) |
| R1-M-23 | `git grep -nE "STAMP_KEYS" src/domains/job-board/components/landing/stamp-defs.ts` | 1 match at line 93 with value `['tuyen-gap', 'hot', 'sap-het-han', 'thuong-cao', 'moi']` |
| R1-M-24 | `git grep -n "assertStrictBoolean" app/api/admin/jobs/job-postings/[id]/route.ts` | **4 use sites** (lines 194, 197, 201, 204) for `isHot`, `isUrgent`, `isHighReward`, `isExpiringSoon` |
| R1-M-25 | `git grep -nE "PATCH_BODY_ALLOWED_KEYS" app/api/admin/jobs/job-postings/[id]/route.ts` | 2 use sites (line 66 declare, line 163 enforce); allowlist has 12 entries (9 original + isHot + isUrgent + isHighReward + isExpiringSoon) |
| R1-M-26 | `git grep -nE "requestBody" app/api/admin/jobs/job-postings/[id]/route.ts` | 13 elements: `jobPostingId, expectedRevision, title, salaryDisplay, JSON.stringify(descriptionJson), JSON.stringify(requirementsJson), JSON.stringify(benefitsJson), JSON.stringify(applicationInstructionsJson), contentSchemaVersion, isHot, isUrgent, isHighReward, isExpiringSoon` |
| R1-M-27 | `git grep -n "summarizeJobPostingApiError" app/admin/jobs/job-postings/[id]/editor-shell.tsx` | **1 import** (line 39-40) from `@/src/domains/staffing/job-posting-error-map`; NO duplicate mapper; thin wrapper `readApiErrorSummary` (line 103-143) composes envelope and forwards to T1A mapper |
| R1-M-28 | `git grep -nE "ve-chung-toi\|VeChungToiPage" -- app/` | **1 hit** at `app/components/GlobalNavbar.tsx:24` (comment breadcrumb; navigation/footer entries deleted; route 404s naturally — see AUD-001 P3) |
| R1-M-29 | `git grep -nE "Về HRP Việt Nam" -- app/` | **1 hit** at `app/components/GlobalNavbar.tsx:23` (comment breadcrumb; navLinks array at lines 20-26 does NOT contain `/ve-chung-toi`) |
| R1-M-30 | `git grep -nE "src/domains/talent/recruiter-workbench\|app/api/admin/recruiter-workbench\|tests/db/recruiter-workbench\|src/domains/media" -- 6ea2e267..50e07bcf` | **0 matches** (forbidden paths untouched) |
| R1-M-31 | `git diff --stat 6ea2e267..50e07bcf` | 38 files changed, 2728 insertions(+), 232 deletions(-) — semantic scope matches TASK in-scope roots |

## 3. Evidence and scope

### 3.1 R1 changed surface scope

**R1 semantic delta (6ea2e267..50e07bcf): 38 files / +2728/-232** — additive 2 schema columns + 1 migration + 1 logo asset + 1 page deletion (ve-chung-toi) + 2 nav-link deletions + 1 default-title change + 4-flag propagation through services, route, public projection, stamp registry, viec-lam surfaces, editor shell + F8 forward-merge (T1A-owned mapper consumed by T1B) + static test fences updated + HANDOFF/TASK authoring + T1A M2A HANDOFF/TASK carried by forward-merge. **No migration, schema, public-stamp-behavior, package, lockfile, or test rewrite beyond expected scope.**

Source command: `git diff --stat 6ea2e267..50e07bcf` → 38 files / +2728/-232 (full stat output kept verbatim in section 3.1 fenced transcript below for byte-identical reproduction).

```
$ git diff --stat 6ea2e267..50e07bcf
 app/(jobs)/viec-lam/[slug]/page.tsx                |  13 +-
 app/(jobs)/viec-lam/page.tsx                       |   6 +-
 app/(portal)/ve-chung-toi/page.tsx                 | 164 ---------       # DELETED
 app/admin/jobs/job-postings/[id]/__tests__/editor-shell.f8.test.ts | 205 ++++++++  # NEW (F8 round 2)
 app/admin/jobs/job-postings/[id]/__tests__/publish-gating.test.tsx |   3 +
 app/admin/jobs/job-postings/[id]/editor-shell.tsx  | 148 +++++++         # 4 toggles + F8 round 2 mapper
 app/api/admin/jobs/job-postings/[id]/route.test.ts | 101 ++++++
 app/api/admin/jobs/job-postings/[id]/route.ts      |  23 ++              # PATCH_BODY_ALLOWED_KEYS +13-slot hash
 app/components/GlobalFooter.tsx                    |   2 +-              # footer link removed
 app/components/GlobalNavbar.tsx                    |   5 +-              # nav link removed
 app/layout.tsx                                     |   8 +-              # default title
 app/login/login-form.tsx                           |   2 +-              # logo sweep
 docs/tasks/hrp-ui-v1-job-card-stamps-brand/HANDOFF.md | 392 ++++++++++  # IN-SCOPE artifact
 docs/tasks/hrp-ui-v1-job-card-stamps-brand/TASK.md   | 317 +++++++++  # IN-SCOPE artifact
 prisma/migrations/20261004120000_ui_v1_jobposting_stamp_flags/migration.sql | 16 +  # NEW migration
 prisma/schema.prisma                               |   6 +               # additive 2 boolean
 public/hrp-logo.webp                               | Bin 0 -> 52334 bytes # NEW asset
 src/domains/applications/marketplace-browse.routes.test.ts |   3 +
 src/domains/job-board/components/landing/featured-job-card.tsx   |   5 +              # 4-flag props
 src/domains/job-board/components/landing/stamp-badge.tsx        |  19 +-              # 4-flag props
 src/domains/job-board/components/landing/stamp-defs.ts          |  39 +-              # 5 registry keys + 4-flag derive
 src/domains/job-board/job-posting-stamps-mapping.test.ts        |   6 +-
 src/domains/job-board/public-card-truth.test.ts                 |   8 +-
 src/domains/job-board/public-select.static.test.ts              |   2 +               # allowlist update
 src/domains/job-board/public.service.ts                         |  34 +-              # DTO + publicSelect allowlist
 src/domains/staffing/job-posting-authoring.service.ts |  39 +-              # 4-flag union + DB write
 src/domains/staffing/job-posting-error-map.test.ts    | 260 +++++++        # F8 mapper unit tests (T1A owned)
 src/domains/staffing/job-posting-error-map.ts         | 230 +++++++        # F8 safe mapper (T1A owned)
 src/domains/staffing/job-posting-list.service.ts      |  18 +-              # DTO + SELECT
 src/shared/security/required-relation-sweep.static.test.ts    |  22 +-              # line shifts
 src/shared/ui/role-guard/role-guard-layout.tsx    |  13 +-              # logo sweep
 docs/tasks/hrp-m2a-operational-ux-debt/HANDOFF.md | 188 ++++          # T1A Mốc 2A (forward-merged)
 docs/tasks/hrp-m2a-operational-ux-debt/TASK.md    | 209 ++++          # T1A Mốc 2A (forward-merged)
 ... (38 files total)
```

**Post-freeze semantic delta (50e07bcf..31a0deee): 0 files** — only `HANDOFF.md` modified (audit-target HEAD docs freeze). `git diff --name-only 50e07bcf..31a0deee -- app src prisma tests scripts packages` = empty.

### 3.2 Verification of four audit surfaces

**A. Schema and migration.** `prisma/schema.prisma:583-584` adds `isHighReward Boolean @default(false) @map("is_high_reward")` + `isExpiringSoon Boolean @default(false) @map("is_expiring_soon")` to `model JobPosting`. Migration `prisma/migrations/20261004120000_ui_v1_jobposting_stamp_flags/migration.sql` is forward-only ADD COLUMN. No DROP/RENAME/CREATE FUNCTION. Timestamp `20261004120000` strictly greater than baseline latest `20260930090000_p1a05_hr_staff_job_openings_update_rls`. No old migration modified. Production migration = NOT_RUN per HANDOFF §9.

**B. Four canonical author-selected stamps.** `isHot`, `isUrgent` (existing P1-A0.1), `isHighReward`, `isExpiringSoon` (T1B). End-to-end:
- Authoring input: `app/admin/jobs/job-postings/[id]/editor-shell.tsx:600-640` 4 `<StampToggle>` instances.
- DTO: `PublicJobDto` + `JobPostingListItemDto` + `JobPostingDetailDto` + `JobPostingDto` all have 4 flags.
- Save/reload/revision: `requestBody` 13-slot idempotency hash (4 flag slots), revision bump on PATCH.
- API validation: `assertStrictBoolean` for all 4 flags; `assertBoolean` union label 4 flags in service layer.
- Public projection: `publicSelect` allowlist includes 4 flags; `toDto`/`toDetailDto`/`projectRowFromPosting` mappers copy 4 flags.
- Shared stamp definitions/ranking: `STAMPS` registry 5 keys + `STAMP_RANK` order in `stamp-defs.ts`; `deriveStampsFromFlags(isHot, isUrgent, isHighReward, isExpiringSoon)` shared by `stamp-badge.tsx` + `featured-job-card.tsx` + `app/(jobs)/viec-lam/page.tsx` + `app/(jobs)/viec-lam/[slug]/page.tsx`.
- Homepage, related jobs, `/viec-lam` render through shared `<JobStampBadge>` + `<RubberStamp>` — NO heuristic derivation of "Thưởng cao" / "Sắp hết hạn" from salary/deadlineDate/postedAt/hash.
- Responsive/no-overflow/accessibility: `data-stamp-key`, `data-stamp-index`, `aria-label={def.ariaLabel}`, `motion-reduce:animate-none motion-reduce:opacity-100` on each stamp wrapper; multi-stamp layout with offset index prevents horizontal overflow.

**C. F8 safe error integration.** `app/admin/jobs/job-postings/[id]/editor-shell.tsx:39-40` imports `summarizeJobPostingApiError` ONCE from `@/src/domains/staffing/job-posting-error-map` (T1A-owned, Mốc 2A, PR #90). Lines 103-143 define thin wrapper `readApiErrorSummary(res, fallbackJobOpeningId)` that composes an envelope from the response and forwards to the T1A mapper — NO duplicate mapper. The editor renders ONLY safe Vietnamese label (`summary.label`); never echoes `body.message`, UUID, SQL fragment, stack trace, or PII. `JOB_OPENING_NOT_OPEN` recovery URL is canonical `/admin/job-openings/<jobOpeningId>` (defensive UUID check rejects non-UUID strings → `summary.recoveryHref = null`). Unknown/null response fails safely via `JOB_POSTING_UNKNOWN_ERROR_LABEL`. 12/12 F8 unit tests PASS (HANDOFF §7 round 3 STEP-28) covering: known code → safe message; JOB_OPENING_NOT_OPEN → recovery href canonical; JOB_OPENING_NOT_OPEN WITHOUT server-supplied jobOpeningId → falls back to editor's known jobOpeningId; JOB_OPENING_NOT_OPEN WITH non-UUID jobOpeningId → defensive null; unknown code → generic fallback; null response body (503 text/plain) → safe fallback; 2xx response → defensive misuse; raw body.message + UUID never appears in summary.label; PERMISSION_DENIED / FORBIDDEN / UNAUTHORIZED / SLUG_COLLISION → safe label no recovery link. Publish button lifecycle (`idempotency` + `withRevision`) unchanged.

**D. Brand/About changes.** `public/hrp-logo.webp` (52,334 bytes, RIFF WEBP header, valid binary webp) is repository-owned (tracked in git, blob `ce77449a`). Runtime does NOT reference `C:\CodeApp\...` or `hrpartner-logo` (verified `git grep -nE "C:\\\\\\\\CodeApp\|hrpartner-logo" -- app/ src/ prisma/` → 0 matches). Logo aspect ratio preserved (image is copied byte-exact from owner-provided source). Alt text = `"HRP — Việc làm miền Bắc"`. Default metadata title at `app/layout.tsx:5-11` = `'Việc làm miền Bắc - Kết nối để thành công - HRP'` (exact match, byte-for-byte). Template = `'%s · HRP'` preserved. JobPosting detail metadata is not unintentionally overwritten (no per-page `metadata.title` change in `/viec-lam/[slug]`). `/ve-chung-toi` page + folder deleted (`Test-Path 'app/(portal)/ve-chung-toi'` → False); nav link removed from `GlobalNavbar.tsx` (line 23-24 breadcrumb comment only); footer link removed from `GlobalFooter.tsx` (line 11 breadcrumb comment only). Route naturally 404s (Next.js App Router default for missing route). Legal `ve-hrp.html` preserved at repo root (104,774 bytes, blob unchanged from baseline).

**E. Boundaries.** Zero unauthorized change to:
- Placement lifecycle (F6 / Mốc 2 F6 untouched; `app/(jobs)/placement/*` not in diff).
- Auth/RLS/roles (`ALLOWED_MUTATION_ROLES` unchanged; RLS not touched).
- JobPosting publish contract (status state machine unchanged; publish route untouched).
- HomepageSettings/UI2 (T1C ownership — not in diff; `HomepageSettings` only referenced for `listingPageSize` reading in `app/(jobs)/viec-lam/page.tsx`, not edited).
- Media/image gallery (`apps/med` not in diff).
- AFF/P2 (untouched — no `src/domains/referrals/(?!attribution-redirect)` changes).
- Production DB/deploy config (production `.env*` not in diff; production DB migration = NOT_RUN; no deploy scripts touched).

### 3.3 Independence proof (R1 numbers not in TASK/HANDOFF)

Fresh numbers measured in this R1 LIGHT full-surface audit (not present in TASK.md or HANDOFF.md at the time of writing):

- 38 (file count in semantic baseline→implementation diff) — fresh
- 2728 / 232 (insertion/deletion counts) — fresh
- 12 (PATCH_BODY_ALLOWED_KEYS entries, post-T1B additive) — fresh
- 13 (requestBody array length) — same as TASK AC-09 ("11 → 13"); live re-measurement
- 4 (`<StampToggle>` count in editor shell) — fresh
- 5 (registry keys) — fresh
- 4 (union label flags in `assertBoolean`) — fresh
- 4 (`assertStrictBoolean` use sites in PATCH route) — fresh
- 1 (single import of `summarizeJobPostingApiError` in editor-shell.tsx) — fresh
- 0 (`logo.png` references in app/ + src/) — fresh
- 0 (`C:\CodeApp` or `hrpartner-logo` references in runtime) — fresh
- 1 (hit count for `ve-chung-toi` literal in app/) — fresh (AUD-001)
- 2 (parent SHAs of forward-merge commit) — fresh
- 14 (verify-handoff.ps1 [OK] count) — same as HANDOFF; live re-measurement
- 15 (verify-task.ps1 [OK] count) — same as HANDOFF; live re-measurement

Independence check: 15 measured values are fresh relative to TASK + HANDOFF (gate `S-10` requires at least 3).

## 4. Verdict and carry-forward

### 4.1 Severity & Release-blocking Summary

| Severity | Count | Blocking |
|---|---|---|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 0 | — |
| P3 | 2 (AUD-001 comment breadcrumb + AUD-002 binary-file skip in range tool) | NO (non-blocking; both accepted as debt) |

### 4.2 Verdict

**Verdict:** PASS

Rationale: All 25 TASK AC rows PASS. All 10 C-checks DONE. Zero P0/P1/P2 findings opened. The two P3 findings (AUD-001 comment breadcrumbs, AUD-002 range-script binary skip) are non-blocking by `tier3.md` definition ("P3/docs debt không chặn" + "P3 chỉ chặn khi ghi `Release-blocking: YES`"). The four major audit surfaces (A schema/migration, B 4 stamps, C F8 mapper, D brand/About) all PASS with empirical evidence. F8 = RESOLVED. Forward-merge of T1A Mốc 2A (`origin/main = 8382bbc7`) recorded at `8e732174` via `--no-ff` with parents `a49aa078` + `8382bbc7`. Production migration = NOT_RUN.

### 4.3 Carry-forward

- **AUD-001 (P3, comment breadcrumb):** 2 comment lines in `app/components/GlobalNavbar.tsx:23-24` referencing the deleted `/ve-chung-toi` route. No functional defect; clean-removal of these comments is a 1-line cleanup optional for next correction batch. Owner: Tier 1 (optional cleanup). NOT blocking.
- **AUD-002 (P3, tooling debt):** `verify-encoding-range.mjs` does not skip binary files by extension/attrs (script-side limitation). Working-tree `verify-encoding.mjs` PASSES correctly. Owner: Tier 1 (script update) / Tier 0 (tooling PR prioritization). NOT blocking.
- 25 AC (AC-01..AC-25) verified PASS at this round (full LIGHT surface).
- 10 C-checks (C-01..C-10) verified DONE.
- Synthetic-DB integration test results from HANDOFF §7 round 3 STEP-21 (10/10 cases PASS on `ep-empty-forest-azlhfyo9`) are the canonical integration result; Tier 3 carries them forward verbatim because T0 / Tier 1B already executed the synthetic DB gate in pre-audit round 3.
- F8 integration from T1A Mốc 2A: 12/12 F8 unit tests PASS per HANDOFF §7 round 3 STEP-28.
- T1A owns the safe error mapper (`src/domains/staffing/job-posting-error-map.ts`); T1B consumes it without creating a duplicate.

### 4.4 Recommendations

| ID | For | Action |
|---|---|---|
| R1-01 | Tier 1 | Audit adoption: stage this R1 LIGHT full-surface `AUDIT.md`. All AC PASS, zero blocking findings, F8 RESOLVED. |
| R1-02 | Tier 1 (optional cleanup) | Remove 2 comment breadcrumb lines in `app/components/GlobalNavbar.tsx:23-24` (or replace `Về HRP Việt Nam` literal with `TASK ref` token). Not blocking. |
| R1-03 | Tier 1 (script-side, separate PR) | Extend `.ai-pipeline/scripts/verify-encoding-range.mjs` to skip binary files (e.g. by extension `.webp` `.png` `.jpg` `.woff2` `.ico` or by `git diff --numstat` `-` marker). Not blocking. |
| R1-04 | Tier 0 | Accept PASS verdict for go-live. Production migration = NOT_RUN per T0 §B; promotion gated by Tier 2 flow after this audit. |

### 4.5 Ownership boundary (Tier 3 ↔ Tier 1 ↔ Tier 0)

Tier 3 (this audit):
- Reviewed the complete UI V1 semantic surface from baseline `6ea2e267` through implementation `50e07bcf` (LIGHT, complete surface — NOT DELTA).
- Did NOT modify TASK.md, HANDOFF.md, source, tests, migration, or tooling.
- Did NOT commit, push, open PR, merge, migrate production, or deploy.
- Did NOT edit the existing migrations (per T0 §A forbidden paths + RQ-01).
- Did NOT modify `.ai-pipeline/scripts/verify-encoding-range.mjs` (tooling, separate PR per AUD-002 recommendation).

Tier 1 (T1B):
- Owns semantic implementation `50e07bcf` (final F8 round 2 SHA).
- Owns HANDOFF.md + TASK.md updates (control rows, Implementation SHA pin, F8 status RESOLVED, round history).
- Owns 4-toggle editor shell + 4-flag stamp propagation + brand swap + About removal.

Tier 1A (Mốc 2A, PR #90):
- Owns `src/domains/staffing/job-posting-error-map.ts` (safe mapper).
- Owns F2/F3/F7/F8/F11 debt closure.
- Forward-merged into T1B via `git merge --no-ff origin/main` → `8e732174`.

Tier 0:
- Owns go-live decision, release risk acceptance, and PR prioritization.
- Already accepted CRITICAL / LIGHT audit for thin slice (T0 directive §A).
- Already granted one post-audit integrity exception (T0 §B/C).

---

Bàn giao AUDIT.md cho Tier 1 với verdict PASS. 25/25 AC PASS, 10/10 C-checks DONE, 0 P0/P1/P2 findings, 2 P3 accepted (non-blocking): AUD-001 comment breadcrumb + AUD-002 range-script binary skip. F8 = RESOLVED (12/12 unit tests, 1 import site, 0 duplicate mapper). Forward-merge `--no-ff` parents verified `a49a078 + 8382bbc7`. Production migration = NOT_RUN. Tier 1 may stage this AUDIT.md; Tier 0 may accept for go-live via Tier 2 promotion flow.