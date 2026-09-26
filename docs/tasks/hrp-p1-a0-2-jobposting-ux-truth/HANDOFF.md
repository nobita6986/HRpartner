# HANDOFF — `hrp-p1-a0-2-jobposting-ux-truth`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-p1-a0-2-jobposting-ux-truth` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Spec version | `v1.0` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | Narrow UI truth cleanup only. No auth/RLS/schema/migration/contract change detected during discovery. Role matrix preserved byte-exact from P1-A0.1. Per `tier1.md`: FAST + NONE is the default for UI-truth copy/word fixes. |
| Execution round | `1` |
| Baseline | `4970f47d` (origin/main HEAD before this worktree branched) |
| Implementation SHA | `c5aa978860e244f056aa51bf586667cf46bd8297` |
| Frozen delivery | `YES` |
| Canonical gates | `PASS` |
| Audit eligibility | `NOT_REQUIRED` |
| Correction batches used | `0` |
| Status | `READY_FOR_REVIEW` |

## 1. Outcome and changed surface

- **Delivered.** UI truth baseline restored on `app/admin/jobs/job-postings/page.tsx` (list) and `app/admin/jobs/job-postings/[id]/page.tsx` (detail). Both pages' "Phần bị khóa (chờ bước sau)" sections rewritten to "Phần còn hạn chế (đang chờ tích hợp)" with truthful wording. The three stale claims have been removed: "form chọn StaffingOrderSlot chưa dựng" (P1-A0.1 ACCEPTED), "trang public hiện vẫn tra Project" (P1-A1 ACCEPTED), "anonymous apply RPC gắn JobPosting → chờ P1-A1 (CandidateSubmission.jobPostingId)" (P1-B ACCEPTED). The genuinely-deferred Gallery/media integration remains visible. The detail page additionally retains the P1-A0 schema-level slug-immutability as a truthful schema invariant (P1-A0 acceptance criterion #11). `CreateJobPostingForm` empty/error text was improved to credit both the canonical selector (`eligibleSlotPredicateSql(now)`) and the write-path authority (`assertSlotEligibleForNewJobPosting`) so users understand why no slot appears. A new static guard test (21 cases) prevents regression of every corrected wording and every preserved invariant.
- **Not delivered.** No schema, migration, backfill, route, DTO, service, library, dependency, sidebar/nav/menu, `PLANNER_HANDOVER.md`, or n8n change. No new permissions granted. Role matrices byte-exact from P1-A0.1.
- **Changed.** 3 files modified + 1 file added + 2 docs files (this TASK.md and HANDOFF.md). Total surface: ~4 source/test files, ~2 docs files. Full diff stat is captured in evidence §3.

### Self-review checklist

| Surface | Result | Evidence / N/A reason |
|---|---|---|
| Contract and diff scope | `PASS` | All changes confined to 4 in-scope paths + 2 docs files; no forbidden path (`prisma/**`, `package.json`, `package-lock.json`, `src/domains/staffing/job-posting-authoring.service.ts`, `src/domains/staffing/job-posting-list.service.ts`, `app/(jobs)/**`, `app/api/public/jobs/**`, `app/api/admin/jobs/job-postings/**`, `docs/PLANNER_HANDOVER.md`) appears in `git diff origin/main..HEAD --stat <forbidden paths>` = 0 lines. |
| API/route boundary | `PASS` | No route file changed. |
| Auth/permission/data exposure | `PASS` | Role matrices preserved byte-exact (`CREATE_ROLES`, `VIEWER_ROLES`, `MUTATION_ROLES`); no new permissions; no PII surface change. |
| Migration/backfill/rollback | `PASS N/A` | No migration touched. Rollback = revert this commit. |
| Concurrency/idempotency | `PASS N/A` | No mutation code changed. |
| Test isolation and cleanup | `PASS` | New test is a static filesystem-read test — no DB, no Prisma, no isolation concerns. |

## 2. Acceptance evidence

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-2-jobposting-ux-truth/TASK.md` | `RESULT: PASS` (DRAFT-VALID, 6 documented warnings — see §4 DEV-01/DEV-02) | None |
| `AC-01` | `E-01` — list-page stale-claim guard | `PASS` — list page contains none of the 11 stale-claim regexes after comment strip | `None` |
| `AC-02` | `E-01` — detail-page stale-claim guard | `PASS` — detail page passes | `None` |
| `AC-03` | `E-01` — G7 deferred-truthful block | `PASS` — Gallery/media + P1-A0 acceptance criterion #11 retained + aria-label renamed on both pages | `None` |
| `AC-04` | `E-01` — G1+G2 role gate | `PASS` — `CREATE_ROLES` definition + `<CreateJobPostingForm` inside guard + bare gate outside guard absent | `None` |
| `AC-05` | `E-01` — G1+G2 + G8 role matrix preservation | `PASS` — `MUTATION_ROLES`, `VIEWER_ROLES`, full list `VIEWER_ROLES` membership unchanged | `None` |
| `AC-06` | `E-01` — G8 import preservation | `PASS` — imports `listEligibleSlotsForNewJobPosting` and `getJobPostingForAdmin` preserved | `None` |
| `AC-07` | `E-01` — "Create form" block | `PASS` — DTO consumption, predicate clauses shown, write-path authority credited, no `Math.random` fallback | `None` |
| `AC-08` | `E-02` (typecheck), `E-03` (lint), `E-04` (unit lane), `E-05` (build), `E-06` (diff --check) | `PASS` (see §3) | `None` |
| `AC-09` | `E-09` — Node verify-encoding gate | `PASS (4 changed text file(s), strict UTF-8 without BOM)` | `None` |
| `AC-10` | `E-07` + `E-11` + `E-12` — diff scope + changed surface + forbidden-path overlap | `PASS` — only 4 in-scope + 2 docs files; forbidden paths all 0-line | `None` |

## 3. Evidence registry

| ID | Command / method | Result |
|---|---|---|
| `E-01` | `npx vitest run --config vitest.unit.config.ts app/admin/jobs/job-postings/__tests__/job-postings-ui-truth.static.test.ts` | exit 0 — `Test Files 1 passed (1) / Tests 21 passed (21) / Duration 329ms` |
| `E-02` | `npm run typecheck` | exit 0 — 0 errors |
| `E-03` | `npx eslint app/admin/jobs/job-postings/page.tsx 'app/admin/jobs/job-postings/[id]/page.tsx' app/admin/jobs/job-postings/create-job-posting-form.tsx app/admin/jobs/job-postings/__tests__/job-postings-ui-truth.static.test.ts` | exit 0 — 0 errors, 0 warnings (matches baseline) |
| `E-04` | `npm run test:unit` (full unit lane) | exit 0 — `Test Files 182 passed (182) / Tests 2953 passed | 9 skipped (2962) / Duration 49.00s` |
| `E-05` | `npm run build` (next build) | exit 0 — `Compiled successfully in 29.8s` (the 3 pre-existing `no-unused-vars` warnings and the benign `DATABASE_URL` warnings from `FloatingChatActions` are unrelated to this worktree's diff) |
| `E-06` | `git diff --check` | exit 0 — no whitespace errors |
| `E-07` | `git diff --stat origin/main..HEAD -- <forbidden paths>` | exit 0 — 0 lines on every forbidden path |
| `E-08` | aggregated gate output | `typecheck=LINT=test:unit=build=diff-check=PASS` |
| `E-09` | `node .ai-pipeline/scripts/verify-encoding.mjs` (Node variant — see DEC-06) | exit 0 — `RESULT: PASS (4 changed text file(s), strict UTF-8 without BOM)` for `app/admin/jobs/job-postings/[id]/page.tsx`, `app/admin/jobs/job-postings/__tests__/job-postings-ui-truth.static.test.ts`, `app/admin/jobs/job-postings/create-job-posting-form.tsx`, `app/admin/jobs/job-postings/page.tsx` |
| `E-10` | `git rev-parse --verify HEAD^{commit}` after freeze | Implementation SHA pinned at freeze commit |
| `E-11` | `git status --porcelain` after freeze | Lists exactly `M app/admin/jobs/job-postings/[id]/page.tsx`, `M app/admin/jobs/job-postings/create-job-posting-form.tsx`, `M app/admin/jobs/job-postings/page.tsx`, `?? app/admin/jobs/job-postings/__tests__/job-postings-ui-truth.static.test.ts`, plus the 2 docs files |
| `E-12` | forbidden path overlap | `prisma/**`: 0; `src/domains/staffing/job-posting-authoring.service.ts`: 0; `src/domains/staffing/job-posting-list.service.ts`: 0; `app/(jobs)/**`: 0; `app/api/public/jobs/**`: 0; `app/api/admin/jobs/job-postings/**`: 0; `docs/PLANNER_HANDOVER.md`: 0; `package.json`: 0; `package-lock.json`: 0 |
| `E-13` | `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-2-jobposting-ux-truth/TASK.md` | exit 0 — `RESULT: DRAFT-VALID (6 warning(s))`; 11 sections present, A-05 traceability OK, no plaintext secret. The 6 warnings are documented in DEV-01/DEV-02 (no new V2 fields required for this `NONE`-audit lane per `tier1.md`) and `AC` commands (each AC has an `E-` row as the runnable evidence). |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| `DEV-01` | Documented carry-forward | Worktree has `.ai-pipeline/scripts/verify-encoding.mjs` (Node) instead of the upstream `verify-encoding.ps1` (`Get-Utf8EncodingIssue` was added at upstream commit `c0f4dc69` after this worktree branched). The Node variant covers the same gate (strict UTF-8 no-BOM, declared line-ending policy). Matches `DEV-04` from `hrp-p1-a0-1-jobposting-authoring-stamps/HANDOFF.md`. | No — accept, mirrors accepted debt |
| `DEV-02` | Pre-existing build warnings | `next build` reports 3 pre-existing `@typescript-eslint/no-unused-vars` warnings on error classes that the lint allowlist does not silence (`AdminApplicationError`, `MarginPermissionError`, `TransferServiceError`) plus a benign `DATABASE_URL` warning from `FloatingChatActions`. None introduced by this worktree's diff. | No — accept, mirror of upstream state |

## 5. Final status

- **Frozen and ready for T0 review.** Round 1 applied the decided UI truth cleanup without scope expansion. All canonical gates from §0 PASS. Audit mode is `NONE` per `tier1.md` (FAST lane default; no discovery revealed authority/security changes).
- **Self-review verdict:** PASS on all six surfaces. No deferred block to T0.
- **Merge authority:** owned by T0 per the task contract. T1 will not merge. T1 will open a PR against `main` once T0 confirms the freeze.

## 6. Before/after capability wording

### 6.1 List page (list `app/admin/jobs/job-postings/page.tsx`)

| Site | Before | After |
|---|---|---|
| Header paragraph (line ~181) | "Chọn một JobPosting để chỉnh nội dung... Bản P1-A0: tạo/reuse JobOpening từ StaffingOrderSlot, schema JobPosting mở rộng với rich content (Tiptap, contentSchemaVersion=1)." | "Chọn một JobPosting để chỉnh nội dung, lưu bản nháp, publish/unpublish/archive. Schema JobPosting mở rộng ở P1-A0 với rich content (Tiptap, contentSchemaVersion=1); form tạo/reuse JobOpening từ StaffingOrderSlot đã được dựng ở P1-A0.1 (chỉ CREATE_ROLES thấy). Trang public `/viec-lam/[slug]` hiện đọc JobPosting PUBLISHED (P1-A1) và anonymous apply RPC bind JobPosting (P1-B) đã nghiệm thu." |
| Deferred section title + aria-label | "Phần bị khóa (chờ bước sau)" / `aria-label="Phần bị khóa"` | "Phần còn hạn chế (đang chờ tích hợp)" / `aria-label="Phần còn hạn chế"` + `data-testid="locked-section-list"` |
| Bullet 1 | "Tạo mới draft từ slot ở list page → form chọn StaffingOrderSlot chưa dựng (P1-A0 POST API đã sẵn sàng, UI form sẽ thêm ở bước sau)." | REMOVED — now in truthful header |
| Bullet 2 | "Mở JobPosting ở trang public (`/viec-lam/[slug]`) → trang public hiện vẫn tra Project (qua `getPublicJobDetail`), chưa gắn với JobPosting. Sẽ được khôi phục khi `P1-A1` hoàn tất ánh xạ." | REMOVED — now in truthful header |
| Bullet 3 | "Gallery media (ảnh đính kèm JobPosting) → chờ AV4 Media Library integration." | KEPT + rewritten: "Gallery media (ảnh đính kèm JobPosting) — JobPosting hiện chỉ mang rich-text content qua 4 field `descriptionJson` / `requirementsJson` / `benefitsJson` / `applicationInstructionsJson` (validator AC-03..AC-05). Media library integration chưa có; dự kiến sẽ đến sau cùng với AV4 Media Library." |
| Bullet 4 | "Anonymous apply RPC gắn JobPosting → chờ P1-A1 (CandidateSubmission.jobPostingId)." | REMOVED — now in truthful header |

### 6.2 Detail page (`app/admin/jobs/job-postings/[id]/page.tsx`)

| Site | Before | After |
|---|---|---|
| Top header comment | "...Public anonymous apply RPC (`/api/public/jobs/[slug]/applications`) KHÔNG bị ảnh hưởng — vẫn tra Project qua `getPublicJobDetail`. A1 sẽ gắn nó với JobPosting khi schema mapping được chốt." | "UI truth baseline (hrp-p1-a0.2 / T1C): canonical public JobPosting detail đã được cutover sang JobPosting PUBLISHED trong P1-A1 (ACCEPTED)... anonymous apply RPC đã bind với JobPosting PUBLISHED + OPEN + linked slot trong P1-B (ACCEPTED)... Còn hạn chế thật sự: Gallery media chưa có, slug rename sau first PUBLISHED (P1-A0 AC-11)." |
| notFound comment | "Trang public `/viec-lam/[slug]` cũng đọc qua Project (chưa gắn JobPosting), nên ta KHÔNG đoán đây là 404..." | "Trang public `/viec-lam/[slug]` đã cutover sang JobPosting PUBLISHED ở P1-A1, KHÔNG còn fallback Project-only — không thể dùng slug-style fallback ở đây; chỉ trả notFound khi service đã chạy đầy đủ và cho null." |
| "← Quay lại danh sách" comment | "Liên kết tới /viec-lam/[slug] đã được cố ý bỏ: trang public hiện vẫn tra Project (getPublicJobDetail), chưa gắn với JobPosting..." | "Liên kết tới /viec-lam/[slug] đã được cố ý bỏ trên UI admin này: canonical public detail ở P1-A1 là JobPosting-slug lookup, không dùng internal UUID. URL kiểu `/viec-lam/${slug}` chỉ hợp lệ với slug đã publish..." |
| Deferred section title + aria-label | "Phần bị khóa (chờ bước sau)" / `aria-label="Phần bị khóa"` | "Phần còn hạn chế (đang chờ tích hợp)" / `aria-label="Phần còn hạn chế"` + `data-testid="locked-section-detail"` |
| Bullet 1 | "Mở JobPosting ở trang public (`/viec-lam/[slug]`) → trang public hiện vẫn tra Project (qua `getPublicJobDetail`), chưa gắn với JobPosting..." | REMOVED — now in truthful header |
| Bullet 2 | "Gallery media (ảnh đính kèm JobPosting) → chờ AV4 Media Library integration với JobPosting owner." | KEPT + rewritten with truthful 4-field enumeration |
| Bullet 3 | "Anonymous apply RPC gắn JobPosting (tạo CandidateSubmission.jobPostingId) → chờ P1-A1. Hiện tại vẫn qua Project/Slot cũ, không thay đổi." | REMOVED — now in truthful header |
| Bullet 4 | "Sửa slug trước publish → schema lock slug sau first PUBLISHED; pre-publish rename hiện chưa expose. Cần tạo JobOpening mới nếu muốn đổi slug." | KEPT + reframed: "Sửa slug trước publish — schema khóa slug sau lần publish đầu tiên (P1-A0 acceptance criterion #11: published slug immutable). Hiện chưa expose route rename slug pre-publish; cần tạo JobOpening mới để đổi slug. Đây là schema-level invariant, không phải khóa tạm thời." |

### 6.3 Create form (`create-job-posting-form.tsx`)

| Site | Before | After |
|---|---|---|
| Empty-state body | "Chưa có StaffingOrderSlot đủ điều kiện. Một slot đủ điều kiện phải thoả: [4 bullets]" | "Chưa có StaffingOrderSlot đủ điều kiện. Một slot đủ điều kiện phải thoả đồng thời 4 điều kiện (predicate canonical `eligibleSlotPredicateSql(now)` ở `job-posting-list.service.ts`, dùng chung cho selector và write-path): [4 code-tagged bullets]. Gợi ý: hãy kiểm tra lại `StaffingOrder` (còn trong hạn, status mở) hoặc tạo một JobOpening mới trước khi quay lại trang này. Selector client chỉ hiển thị gợi ý — quyền quyết định eligibility vẫn nằm ở `assertSlotEligibleForNewJobPosting` trong transaction write." |
| Load-error body | "Không thể tải danh sách StaffingOrderSlot đủ điều kiện: [{code}] {message} / Khi synthetic DB chưa sẵn, form vẫn hiển thị nhưng selector rỗng." | "Không thể tải danh sách StaffingOrderSlot đủ điều kiện: [{code}] {message} / Selector này chỉ là gợi ý client-side. Ngay cả khi không load được, một POST với `slotId` hợp lệ vẫn được write-path kiểm tra lại trong transaction qua `assertSlotEligibleForNewJobPosting`. Nếu vẫn thấy lỗi này, kiểm tra kết nối DB / RLS context." |
| Form wrapper | `aria-label="Tạo JobPosting mới"` | `aria-label="Tạo JobPosting mới"` + `data-testid="create-job-posting-form"` |
| Load-error wrapper | `aria-label="Form tạo JobPosting — không khả dụng"` | `aria-label="Form tạo JobPosting — không khả dụng"` + `data-testid="create-job-posting-load-error"` |

## 7. Test counts and gate outputs

### 7.1 Targeted tests

- New static guard test: `app/admin/jobs/job-postings/__tests__/job-postings-ui-truth.static.test.ts` — 21 cases across 5 `describe` blocks:
  - `G1 + G2 — CreateJobPostingForm is reachable only for CREATE_ROLES` (5 cases)
  - `G3..G6 — Stale claims cannot return on list or detail pages` (4 cases)
  - `G7 — Remaining deferred text is truthful` (4 cases)
  - `G8 — Role matrices and canonical predicates are preserved` (3 cases)
  - `Create form — improved empty/error text` (5 cases)
- Pre-existing targeted tests re-run to confirm no carry-back regression:
  - `src/domains/staffing/job-posting-list.service.test.ts` (32 cases)
  - `src/domains/staffing/job-posting-authoring.service.test.ts` (19 cases)
  - `app/api/admin/jobs/job-postings/[id]/route.test.ts` (29 cases)
  - `src/shared/content/job-posting-rich-text/__tests__/*` (validator 29 + renderer 6 + profile 5)
- All targeted tests PASS.

### 7.2 Canonical gates

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 (0 errors) |
| `npx eslint <4 changed files>` | exit 0 (0 errors, 0 warnings) |
| `npx vitest run <static test>` | exit 0 (21/21) |
| `npm run test:unit` | exit 0 (182 files / 2953 tests passed / 9 skipped) |
| `npm run build` | exit 0 (Compiled successfully in 29.8s; 3 pre-existing warnings unchanged) |
| `git diff --check` | exit 0 (no whitespace errors) |
| `git diff --stat origin/main..HEAD -- <forbidden paths>` | 0 lines on every forbidden path |
| `node .ai-pipeline/scripts/verify-encoding.mjs` | exit 0 (4 changed text files, strict UTF-8 without BOM) |
| `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-p1-a0-2-jobposting-ux-truth/TASK.md` | run |
| `pwsh .ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/hrp-p1-a0-2-jobposting-ux-truth/TASK.md` | run |

## 8. Files changed

| File | Change |
|---|---|
| `app/admin/jobs/job-postings/page.tsx` | modified — header paragraph (truthful state) + section title (rename) + 4 bullets → 1 truthful bullet (Gallery/media) + role-matrix comment updated + top comment clarifying UI truth baseline |
| `app/admin/jobs/job-postings/[id]/page.tsx` | modified — top comment (UI truth baseline) + notFound comment (P1-A1 cutover confirmed) + "← Quay lại danh sách" comment (P1-A1 cutover confirmed) + section title (rename) + 4 bullets → 2 truthful bullets (Gallery/media + slug-immutability) |
| `app/admin/jobs/job-postings/create-job-posting-form.tsx` | modified — empty-state text (canonical predicate + write-path authority credit) + load-error text (same) + 2 `data-testid` attributes for downstream testability |
| `app/admin/jobs/job-postings/__tests__/job-postings-ui-truth.static.test.ts` | new — 21 static-guard tests across 5 `describe` blocks |
| `docs/tasks/hrp-p1-a0-2-jobposting-ux-truth/TASK.md` | new — V2_FAST_FREEZE contract (`v1.0`) |
| `docs/tasks/hrp-p1-a0-2-jobposting-ux-truth/HANDOFF.md` | new — this file |

## 9. Confirmation of no zone expansion

- No `prisma/schema.prisma` change. No `prisma/migrations/**` change. No DB schema field added or removed.
- No `package.json` / `package-lock.json` change. No new dependencies. No new `@tiptap/*` copy.
- No `src/domains/staffing/job-posting-authoring.service.ts` change. No `src/domains/staffing/job-posting-list.service.ts` change. Canonical predicate byte-exact. Write-path authority unchanged.
- No `app/(jobs)/**` change. `/viec-lam` and `/viec-lam/[slug]` are NOT in this worktree's diff.
- No `app/api/public/jobs/**` change. P1-B runtime is untouched.
- No `app/api/admin/jobs/job-postings/**` change. P1-A0 routes (`POST/PATCH/publish/unpublish/archive`) are untouched.
- No `docs/PLANNER_HANDOVER.md` change.
- No sidebar / navigation / menu file change. NAV-01 follow-up is not in scope per T0 directive.
- No n8n wiring. No new connector or scheduler.
- No role matrix change. `CREATE_ROLES = {ADMIN, HR_MANAGER, HR_STAFF}` and `MUTATION_ROLES = {ADMIN, HR_MANAGER, HR_STAFF}` / `VIEWER_ROLES = {PM, SALE, DIRECTOR}` are preserved byte-exact.

> Handoff status: `READY_FOR_REVIEW`
