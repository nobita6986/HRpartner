# TASK — `hrp-p1-a0-1-jobposting-authoring-stamps`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-p1-a0-1-jobposting-authoring-stamps` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `CODE` |
| Build vs adopt | `N/A` (reuses existing primitives; no new dependency, no new framework) |
| Build vs automate | `N/A` (no connector, no scheduler, no multi-system workflow) |
| Assurance lane | `CRITICAL` |
| Audit mode | `LIGHT` |
| Audit reason | `Public marketplace stamp rendering is a customer-facing surface backed by JobPosting; HR-only mutation authority + public projection rewrite + animated stamp component touch both admin and public rendering paths. LIGHT audit đảm bảo changed surface (schema migration, two service contracts, two admin UI screens, three public render paths) được đối chiếu sau khi implementation freeze SHA. Risk acceptance: T0 chấp nhận LIGHT audit cho thin slice này (T0 directive 2026-09-26, "Quyết định đã khóa" §2-§4 đã chốt đủ để Tier 1 tự review). Người chấp nhận rủi ro: T0.` |
| Spec version | `v1.3` |
| Status | `ACCEPTED` (PR #55 merged; production migration and read-only smoke verified by T0; AUD-003 remains accepted P3 tooling debt) |
| Planner | `Tier 1C` |
| Baseline | `152c0fdaa4d28934acfbacb540a207aee686e1ad` (latest `origin/main` full SHA, includes completed P1-A0/A1/B as of 2026-09-26) |
| Baseline/diff range | `152c0fdaa4d28934acfbacb540a207aee686e1ad..2c1bd1694121f822956c76e8024df9ef42dce9ad` (T0 freeze HEAD recorded in HANDOFF §0) |
| Contract gate | `ACCEPTED` (T0 directive §C-01..C-06 reconciliation closed + AUD-001 R2 post-audit integrity correction closed) |
| Decision state | `CLOSED` (no new Owner decision; T0 §2-§4 already locks semantics; T0 §corrections (1/1) confirmed v1 contract; R2 closes AUD-001 without new decision) |
| Test environment | `READY` (canonical integration lane per `package.json` `test:integration`; synthetic DB per `tests/db/*` pattern; rewrite covers 11 substantive cases (C-03); 10/10 PASS on Neon test DB at R2) |
| Correction budget | `0` (correction batch 1/1 + R2 post-audit integrity correction = max budget; no further rounds permitted) |
| In-scope roots (correction batch 1/1 + R2 post-audit integrity correction) | **C-01**: `app/api/admin/jobs/job-postings/[id]/route.ts` (`isHot`/`isUrgent` actual PATCH wire + idempotency hash); `app/api/admin/jobs/job-postings/[id]/route.test.ts` (route-level test). **C-02**: `src/domains/staffing/job-posting-list.service.ts` (`eligibleSlotPredicateSql`, `JobPostingSlotSelectorDto`, `listEligibleSlotsForNewJobPosting`); `src/domains/staffing/job-posting-authoring.service.ts` (`SlotRevalidationContext`, `assertSlotEligibleForNewJobPosting`, write-path re-read); `app/api/admin/jobs/job-postings/route.ts` (re-validate before return); `app/admin/jobs/job-postings/page.tsx` (passes `slotsAvailable` + `orderStatus`). **C-03**: `tests/db/job-posting-stamps.integration.test.ts` (rewritten, 11 cases). **C-04**: `app/admin/jobs/job-postings/[id]/editor-shell.tsx` (disable stamp toggles unless status='DRAFT'); `app/admin/jobs/job-postings/create-job-posting-form.tsx` (idempotency key retention on 5xx/network, reset on 4xx/slot change, crypto UUID entropy, safe generic error). **C-05**: `src/domains/job-board/components/landing/stamp-defs.ts` (canonical `deriveStampsFromFlags` helper); `src/domains/job-board/components/landing/stamp-badge.tsx` (new shared component); `src/domains/job-board/components/landing/__tests__/stamp-badge.test.ts` (single-source fence); reuse in `app/(jobs)/viec-lam/page.tsx` + `app/(jobs)/viec-lam/[slug]/page.tsx`; FeaturedJobCard keeps `RubberStamp` art direction but reads from shared helper. **C-06**: TASK.md v1.1 + HANDOFF.md freeze. **AUD-001 R2**: `src/domains/staffing/job-posting-authoring.service.ts` (real import of `eligibleSlotPredicateSql`; SELECT `... FOR UPDATE OF s` evaluates `(eligibleSlotPredicateSql(now)) AS is_eligible`; `is_eligible: boolean` in row type; fail-closed `slot.is_eligible !== true` gate). `src/domains/staffing/job-posting-stamps-eligibility.test.ts` (tightened: assert REAL import + body has `eligibleSlotPredicateSql(now)` call + fail-closed gate + selector parity). **AUD-002 R2**: HANDOFF unit gate counts updated (2697 passed / 0 failed / 9 skipped — 2 new AUD-001 tests); new Implementation SHA pinned (`2c1bd1694121f822956c76e8024df9ef42dce9ad`); control/revision rows honest. **AUD-003 R2 (P3 accepted debt)**: keep `verify-encoding.mjs`; delete in a dedicated tooling-cleanup PR after rebase onto main (out of scope for this correction). |
| Forbidden paths | `src/domains/talent/recruiter-workbench.*`; `app/api/admin/recruiter-workbench/**`; `tests/db/recruiter-workbench.integration.test.ts`; `src/domains/media/**`; `src/domains/referrals/**` ngoài `attribution-redirect.service` + `redirect-token` (read-only); `src/domains/crm/**`; bất kỳ frozen command contract nào (`hrp-p1-a0`, `hrp-p1-a1`, `hrp-p1-b` TASK/AUDIT/HANDOFF files); production `.env*` files; production DB/migration/deploy scripts; **sidebar, navigation, menu, IA routes** (T0 §4 forbidden); any path outside the in-scope roots above |
| Required gates | `npx prisma validate`; `npx prisma generate`; `npm run typecheck`; `npm run lint`; targeted route/component/service tests; `npm run test:unit`; deterministic targeted DB integration; full canonical integration with strict synthetic DB; p1a1 migration-chain proof; `git diff --check`; `pwsh .ai-pipeline/scripts/verify-encoding.ps1`; `pwsh .ai-pipeline/scripts/verify-task.ps1`; `pwsh .ai-pipeline/scripts/verify-handoff.ps1`. Audit self-test only — KHÔNG audit tĩnh. |
| Current execution round | `2` (correction batch 1/1 + post-audit integrity correction R2; R2 closes AUD-001 RELEASE-BLOCKING) |
| Current audit round | `2` (Tier 3 R2 DELTA audit verdict CONDITIONAL; AUD-001/AUD-002 closed; AUD-003 accepted as P3 debt; byte-exact audit adopted at `732d5a4`) |
| Implementation SHA | `34d364609a2bb1f80a524fc9924ae23b37b20aaf` (accepted main integration SHA; stamps-only R2 semantic SHA remains `2c1bd1694121f822956c76e8024df9ef42dce9ad`) |
| Frozen delivery | `YES` (Implementation SHA pinned at HANDOFF §0; source/test/migration frozen after R2 semantic commit) |
| Next gate | `NONE — MERGED_AND_PRODUCTION_VERIFIED` |

> Lane CRITICAL mặc định LIGHT. Risk acceptance: T0 chấp nhận LIGHT audit cho thin slice này; người chấp nhận rủi ro ghi rõ trong `Audit reason`.

> T0 directive đã chốt toàn bộ locked decision ở §2-§4 (storage, create/reuse, slot selector, idempotency, stamp editing, public rendering). Tier 1 tự review changed surface trước freeze; chỉ một consolidated correction batch sau audit.

## 1. Outcome

### 1.1 User-visible outcome

1. `/admin/jobs/job-postings` cho phép ADMIN, HR_MANAGER, HR_STAFF chọn một `StaffingOrderSlot` eligible từ dropdown (server-loaded) và submit create/reuse qua mutation authority P1-A0 hiện hữu. Sau thành công, điều hướng tới editor của JobPosting canonical (existing P1-A0 flow).
2. Editor shell `app/admin/jobs/job-postings/[id]/editor-shell.tsx` lưu được hai boolean độc lập cùng draft content hiện hữu:
   - `isHot` → stamp nhãn "Hot"
   - `isUrgent` → stamp nhãn "Tuyển gấp"
   Persistence đi qua canonical PATCH draft update + optimistic revision; không tạo route ghi riêng.
3. Public homepage `/`, `/viec-lam`, và `/viec-lam/[slug]` render đúng stamp từ `PUBLISHED` JobPosting — hỗ trợ none/HOT/URGENT/both. Không còn heuristic suy từ `Project.urgency`, salary, postedAt, hash.
4. Stamp animate opacity 0.7 ↔ 1.0; tắt animation dưới `prefers-reduced-motion: reduce`. Chỉ stamp animate, không animate toàn card.

### 1.2 Non-goals

- KHÔNG thay đổi existing P1-A0 create-or-reuse semantics (no `409 DUPLICATE_JOB_POSTING`, no second row).
- KHÔNG cho sửa trực tiếp PUBLISHED/ARCHIVED stamp; stamp đổi phải đi qua canonical lifecycle hiện hữu.
- KHÔNG heuristic backfill từ Project, urgency, salary, ngày đăng, hoặc hash.
- KHÔNG sửa sidebar, navigation, menu, IA.
- KHÔNG tự xây form engine, editor framework, animation library.
- KHÔNG thêm dependency mới (T0 §3 library-first).
- KHÔNG chạm P1-E0/E1 Recruiter Workbench (T1A đang làm).
- KHÔNG mở media gallery, candidate attribution, CRM integration (T0 §4 forbidden).
- KHÔNG tự bypass `withIdempotency` hoặc tạo idempotency mechanism thứ hai.

## 2. Evidence

Chỉ liệt kê evidence cần để Tier 1 implement.

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `prisma/schema.prisma:495-520` (`model JobPosting`) thiếu `isHot` / `isUrgent`. | Chứng minh schema cần additive. T0 §2 đã khóa: 2 boolean columns, `@default(false)`, NOT NULL. |
| `EV-02` | `app/api/admin/jobs/job-postings/route.ts` (existing POST create-or-reuse) + `src/domains/staffing/job-posting-authoring.service.ts:332-485` (`createOrReuseJobOpeningForSlot` + `createOrReuseJobPostingDraftForOpening`). | POST route là mutation authority T0 §2 đã freeze; chỉ cần server-loaded eligible-slot selector trên page.tsx, không tạo GET endpoint mới. |
| `EV-03` | `app/api/admin/jobs/job-postings/[id]/route.ts:90-202` (PATCH route) + `src/domains/staffing/job-posting-authoring.service.ts:492-582` (`updateDraftContent`). | PATCH đã có + optimistic revision. Stamp persistence ghép vào `UpdateDraftContentInput` (T0 §2 "Stamp editing"). |
| `EV-04` | `app/(portal)/page.tsx:67-90` (`deriveStamps` heuristic) + `src/domains/job-board/components/landing/featured-job-card.tsx:153-160` (single-rubber-stamp render). | Heuristic phải xoá; featured-job-card phải đổi sang multi-stamp. |
| `EV-05` | `src/domains/job-board/public.service.ts:651-704` (`publicSelect` allow-list) + `src/domains/job-board/public-select.static.test.ts:60-80` (top-level keys assertion). | Add `isHot: true` + `isUrgent: true` vào `publicSelect`; phải cập nhật static test allowlist MỘT CÁCH CÓ Ý THỨC. |
| `EV-06` | `src/domains/job-board/public.service.ts:19-75` (`PublicJobDto`) + `public.service.ts:170-186` (`PublicJobDetailDto extends PublicJobDto`). | `isHot` / `isUrgent` phải là 2 field mới của cả `PublicJobDto` lẫn `PublicJobDetailDto` để card + detail cùng đọc. |
| `EV-07` | `app/globals.css:668-675` (`@keyframes job-stamp-blink` 0.7↔1.0 + `.job-stamp-attention` class + `motion-reduce:animate-none motion-reduce:opacity-100` trên stamp element). | Animation infrastructure đã có sẵn đúng spec T0 §1.5. Không cần thêm CSS — chỉ xác nhận `.job-stamp-attention` được gắn trên từng stamp wrapper. |
| `EV-08` | `prisma/migrations/20260924180000_p1a0_jobposting_content_fields/migration.sql` (P1-A0 migration pattern: ADD-only, NOT NULL DEFAULT, comments). | Pattern tham chiếu cho migration mới. T0 §2 "trước khi đặt migration timestamp, kiểm tra toàn bộ migration hiện hành để tránh collision". Latest là `20260925120000_p1b_public_apply_lifecycle`; dùng timestamp muộn hơn (≥ 20260926xxx). |
| `EV-09` | `app/admin/jobs/job-postings/[id]/editor-shell.tsx:159-228` (`onSave` PATCH với idempotency-key + revision bump). | Stamp persistence ghép vào cùng `body` của PATCH; cùng UUID Idempotency-Key policy. |
| `EV-10` | `src/shared/integrity/idempotency.ts` (`withIdempotency` helper) + `src/shared/auth/scopes/ctv.scope.ts` + `src/shared/auth/auth-context.ts`. | Idempotency policy hiện hữu — không thay. Auth context đủ cho ADMIN/HR_MANAGER/HR_STAFF selector + mutation. |
| `EV-11` | `tests/db/job-posting-authoring.integration.test.ts` (existing P1-A0 DB integration). | Pattern tham chiếu cho DB integration test mới; dùng `vitest.integration.config.ts` (T0 §6). |

## 3. Decisions

| ID | Decision | Status |
|---|---|
| `DEC-01` | Additive schema `JobPosting`: `isHot Boolean @default(false) @map("is_hot")` + `isUrgent Boolean @default(false) @map("is_urgent")`. Forward-only migration. Không DROP/RENAME/heuristic backfill. | CHOSEN (T0 §2 locked) |
| `DEC-02` | Reuse P1-A0 mutation authority POST `/api/admin/jobs/job-postings` cho create draft — không tạo endpoint mới. Slot selector server-loaded bởi Server Component `app/admin/jobs/job-postings/page.tsx` qua `withDbContext` + read-only service helper; truyền DTO xuống client form. Selector KHÔNG là authorization authority; POST re-read + revalidate trong transaction. | CHOSEN (T0 §2 "Slot selector" locked) |
| `DEC-03` | Eligibility predicate (P1-A0 server-only, single source of truth): `StaffingOrder.status ∈ {OPEN, CLOSING_SOON}` AND (`deadlineDate` IS NULL OR `deadlineDate >= now()`) AND (`validTo` IS NULL OR `validTo >= now()`) AND `slotsFilled < slotsNeeded` AND slot chưa có JobPosting canonical (qua `staffingOrderSlots.jobOpeningId` → `jobOpenings.posting` IS NULL). Không yêu cầu `validFrom <= now()` (HR prep draft sớm). | CHOSEN (T0 §2 locked) |
| `DEC-04` | Stamp persistence ghép vào `UpdateDraftContentInput` (`job-posting-authoring.service.ts`) cùng canonical PATCH draft route. Hai boolean field mới: `isHot?: boolean` + `isUrgent?: boolean`. Validator: nếu field xuất hiện phải là boolean thật; null/unknown/string/number bị reject bởi `INVALID_INPUT`. Status check giữ nguyên (`status === 'DRAFT'` để edit). Optimistic revision giữ nguyên. Không mở PATCH riêng. | CHOSEN (T0 §2 "Stamp editing" locked) |
| `DEC-05` | Public projection: thêm `isHot: true` + `isUrgent: true` vào `publicSelect` của `public.service.ts:651`; map thẳng vào `PublicJobDto` (mở rộng 2 field) + `PublicJobDetailDto` (kế thừa qua extends). `where: { status: 'PUBLISHED' }` giữ nguyên — chỉ stamp của posting PUBLISHED mới được project. Heuristic `deriveStamps` trong `app/(portal)/page.tsx` bị xoá; truyền `stamps: StampKey[]` (derive đơn giản `[isUrgent ? 'tuyen-gap' : null, isHot ? 'hot' : null].filter(Boolean)`) xuống `FeaturedJobCard`. | CHOSEN (T0 §2 "Public rendering" + "Stamp editing" locked) |
| `DEC-06` | Stamp component `RubberStamp` (existing trong `featured-job-card.tsx`) được đổi thành **multi-stamp layout**: render mỗi stamp trong wrapper riêng có `-top-2 -left-2` + index offset theo STAMP_RANK; mỗi wrapper giữ `className="job-stamp-attention motion-reduce:animate-none motion-reduce:opacity-100"`. Không animate toàn card. Tất cả stamp đều dùng animation `job-stamp-blink 0.7↔1.0` (đã có sẵn trong globals.css). | CHOSEN (T0 §1.5 + §2 "Public rendering" locked) |
| `DEC-07` | `/viec-lam` và `/viec-lam/[slug]` dùng đúng `JobCard` / `PublicJobDetailDto` đã có và KHÔNG tự render stamp riêng — render stamp qua shared component `Stamps` (export mới từ `featured-job-card.tsx` hoặc `stamp-defs.ts`) để tránh duplicate. Nếu shared component chưa tồn tại, tạo `src/domains/job-board/components/landing/stamp-badge.tsx` với behavior y hệt wrapper (animation + reduced-motion + aria-label). | CHOSEN |
| `DEC-08` | Admin Viewer list page (`page.tsx`) đọc `isHot` + `isUrgent` qua `listJobPostingsForAdmin` (mở rộng `JobPostingListItemDto`) và hiển thị chip stamp trên từng row; admin có thể lọc theo stamp (filter client-side, không cần DB migration). | CHOSEN |
| `DEC-09` | Build vs Adopt = `N/A`. Lý do: không thêm dependency mới, không thêm shared framework. Reuse Tiptap editor đã có (P1-A0), Tailwind classes đã có, Prisma client đã có, Next.js dynamic route đã có, CSS animation đã có (`.job-stamp-attention` + `@keyframes job-stamp-blink` từ P1-A0 baseline). | CHOSEN |
| `DEC-10` | Build vs Automate = `N/A`. Lý do: mutation path là single-actor single-action với idempotency + revision check; không có connector, scheduler, notification worker, hay multi-system workflow. | CHOSEN |

### 3.1 Build vs Adopt

| Capability | Existing Options | Decision | License | Version/source | Wrapper boundary | Reason |
|---|---|---|---|---|---|---|
| Animation keyframe | `app/globals.css` `.job-stamp-attention` + `@keyframes job-stamp-blink` (P1-A0 baseline) | `N/A` (reused as-is) | n/a | n/a | n/a | Đã đúng opacity 0.7↔1.0 + reduced-motion. Không thêm CSS mới. |
| Stamp registry | `src/domains/job-board/components/landing/stamp-defs.ts` (`STAMPS`, `STAMP_KEYS`, `STAMP_RANK`) | `N/A` (reused) | n/a | n/a | n/a | Đã có 'hot' + 'tuyen-gap'. Wrapper component chỉ cần đổi từ single-stamp sang multi-stamp layout. |
| Tailwind reduced-motion | Tailwind built-in `motion-reduce:animate-none` + `motion-reduce:opacity-100` | `N/A` (reused) | n/a | n/a | n/a | Đã dùng trong stamp wrapper hiện hữu; copy y nguyên sang wrapper mới. |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Schema additive `JobPosting.isHot Boolean @default(false) @map("is_hot")` + `JobPosting.isUrgent Boolean @default(false) @map("is_urgent")`. Migration forward-only, NOT NULL DEFAULT false; KHÔNG DROP/RENAME/heuristic backfill. Migration timestamp ≥ latest (`20260925120000_p1b_public_apply_lifecycle`). |
| `RQ-02` | `prisma validate` + `prisma generate` xanh trên schema mới. |
| `RQ-03` | `app/admin/jobs/job-postings` (Server Component) load danh sách eligible `StaffingOrderSlot` qua service canonical mới (`listEligibleSlotsForNewJobPosting`) và truyền DTO xuống client form. Form có: slot selector (dropdown) + nút "Tạo JobPosting draft". Submit gọi POST `/api/admin/jobs/job-postings` với UUID `Idempotency-Key`. |
| `RQ-04` | POST endpoint (`/api/admin/jobs/job-postings`) re-read + revalidate eligibility TRONG transaction; reuse P1-A0 create-or-reuse semantics (không đổi thành 409 DUPLICATE_JOB_POSTING). |
| `RQ-05` | Submit thành công → redirect tới `/admin/jobs/job-postings/{id}` (canonical editor của JobPosting vừa tạo/reuse). UI loading/empty/error/success đầy đủ. |
| `RQ-06` | Editor shell `app/admin/jobs/job-postings/[id]/editor-shell.tsx` có 2 toggle controls: `isHot` (nhãn "Hot") + `isUrgent` (nhãn "Tuyển gấp"). Toggle thay đổi → bật dirty flag → đẩy vào cùng PATCH `updateDraftContent` body. Không tạo route ghi riêng. |
| `RQ-07` | `UpdateDraftContentInput` (`job-posting-authoring.service.ts`) thêm `isHot?: boolean` + `isUrgent?: boolean`. Field undefined → giữ giá trị hiện tại; field true/false → cập nhật tương ứng. Field xuất hiện nhưng không phải boolean (string/number/null/object) → `AuthoringError('INVALID_INPUT', 400)`. |
| `RQ-08` | Public `publicSelect` (`public.service.ts:651`) thêm `isHot: true` + `isUrgent: true`. `PublicJobDto` thêm `isHot: boolean` + `isUrgent: boolean`. `PublicJobDetailDto` kế thừa qua extends. Mapper `toDto` / `toDetailDto` map thẳng từ Prisma row. |
| `RQ-09` | `app/(portal)/page.tsx`: xoá `deriveStamps` heuristic (urgency/salary/postedAt/hash); thay bằng `stamps: [job.isUrgent ? 'tuyen-gap' : null, job.isHot ? 'hot' : null].filter(Boolean)` ngay trong `enrichJob`. Truyền xuống `FeaturedJobCard`. |
| `RQ-10` | `app/(jobs)/viec-lam/page.tsx` + `app/(jobs)/viec-lam/[slug]/page.tsx`: render stamp qua shared component cho DTO `isHot` / `isUrgent` non-false. KHÔNG dùng heuristic legacy (urgency, salary, postedAt, hash). |
| `RQ-11` | `src/domains/job-board/components/landing/featured-job-card.tsx`: đổi single-stamp render thành multi-stamp render. Mỗi stamp vẫn rotate -10deg + scale(0.7) + `-top-2 -left-2`; bù index để stamp sau lệch xuống (không chồng lên nhau). Mỗi wrapper giữ `.job-stamp-attention motion-reduce:animate-none motion-reduce:opacity-100`. Không animate toàn card. |
| `RQ-12` | `global.css` `.job-stamp-attention` animation keyframe `job-stamp-blink` PHẢI chạy opacity 0.7↔1.0 (verify bằng static test đọc file). `motion-reduce:animate-none motion-reduce:opacity-100` PHẢI nằm trên wrapper (verify). |
| `RQ-13` | Migration static test fence: đọc `prisma/migrations/<new>/migration.sql`, xác nhận ADD-only `is_hot` + `is_urgent` BOOLEAN NOT NULL DEFAULT false; không DROP/RENAME/CREATE FUNCTION. |

### 4.2 STEP

| ID | Step |
|---|---|
| `STEP-01` | Tạo forward-only migration `20260926120000_p1a01_jobposting_stamps` (`is_hot` + `is_urgent` BOOLEAN NOT NULL DEFAULT false ADD COLUMN). |
| `STEP-02` | Cập nhật `prisma/schema.prisma` `model JobPosting`: thêm `isHot` + `isUrgent` với `@default(false)` + `@map`. |
| `STEP-03` | Mở rộng `JobPostingDto` / `UpdateDraftContentInput` / `JobPostingModelRow` / `toJobPostingDto` trong `job-posting-authoring.service.ts`. Thêm validator `assertIsHot` / `assertIsUrgent` (nếu field xuất hiện không phải boolean → INVALID_INPUT). Update DB write trong `updateDraftContent` để set 2 field. |
| `STEP-04` | Mở rộng `JobPostingListItemDto` + `JobPostingDetailDto` trong `job-posting-list.service.ts`. Mở rộng `listJobPostingsForAdmin` / `getJobPostingForAdmin` SELECT include 2 field. Thêm helper `listEligibleSlotsForNewJobPosting(tx, ctx)` trả về `JobPostingSlotSelectorDto[]`. |
| `STEP-05` | Thêm `JobPostingSlotSelectorDto` interface (id, positionTitle, workLocation, slotsNeeded, slotsFilled, validTo, staffingOrderCode). Eligibility predicate là SQL fragment truyền vào `tx.staffingOrderSlot.findMany`. |
| `STEP-06` | Mở rộng `publicSelect` (`public.service.ts:651`) thêm `isHot: true` + `isUrgent: true`. Cập nhật `PublicJobPostingSelectPayload`. Cập nhật `PublicJobDto` (thêm `isHot` + `isUrgent`). `PublicJobDetailDto` kế thừa qua extends. Cập nhật `toDto` / `toDetailDto` mapper. |
| `STEP-07` | Cập nhật `public-select.static.test.ts` allowlist (thêm `isHot`, `isUrgent` vào sorted top-level keys). |
| `STEP-08` | `app/(portal)/page.tsx`: xoá `deriveStamps`; sửa `enrichJob` trả `stamps: ['tuyen-gap' if job.isUrgent, 'hot' if job.isHot].filter(Boolean)`. Xoá import/typing cũ nếu không dùng nữa. |
| `STEP-09` | `src/domains/job-board/components/landing/featured-job-card.tsx`: thay đoạn render single stamp (dòng ~153-160) thành multi-stamp wrapper render với offset index. |
| `STEP-10` | Tạo `src/domains/job-board/components/landing/stamp-badge.tsx` (server-safe): render stamps array với cùng wrapper className `job-stamp-attention motion-reduce:animate-none motion-reduce:opacity-100`. Dùng trong `JobCard` của `/viec-lam/page.tsx` + optional detail page sidebar. |
| `STEP-11` | `app/admin/jobs/job-postings/[id]/editor-shell.tsx`: thêm 2 toggle controls (Hot + Tuyển gấp), đẩy vào PATCH body + dirty tracking + snapshot. |
| `STEP-12` | `app/admin/jobs/job-postings/page.tsx` (Server Component): load eligible slots qua `listEligibleSlotsForNewJobPosting(tx, ctx)`, render client form (component mới `create-job-posting-form.tsx`) với slot selector + submit handler. Submit → POST → redirect. |
| `STEP-13` | Tests: (a) static migration test fence; (b) static test fence `globals.css` `.job-stamp-attention` opacity 0.7↔1.0; (c) static test fence `public-select` allowlist updated; (d) unit test `enrichJob` stamps derive từ flags; (e) unit test `toDto`/`toDetailDto` map isHot/isUrgent; (f) integration test `tests/db/job-posting-stamps.integration.test.ts` (eligibility predicate + stamp round-trip + public projection). |
| `STEP-14` | Run gates: `prisma validate`, `prisma generate`, `typecheck`, `lint`, `test:unit`, `test:integration`, `git diff --check`, `verify-encoding`, `verify-task`. |
| `STEP-15` | Commit semantic implementation (1 commit). Write HANDOFF. Re-run `verify-handoff`. Freeze docs commit. |

### 4.3 AC — Acceptance Criteria

| ID | AC |
|---|---|
| `AC-01` | `npx prisma validate` xanh; `npx prisma generate` không lỗi; `JobPosting.isHot` + `JobPosting.isUrgent` xuất hiện trong `node_modules/.prisma/client/index.d.ts`. |
| `AC-02` | Migration `prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` chỉ chứa `ALTER TABLE "job_postings" ADD COLUMN "is_hot"/"is_urgent" BOOLEAN NOT NULL DEFAULT false`; không DROP/RENAME/CREATE FUNCTION. Migration `prisma migrate diff` against DB sạch → no diff. |
| `AC-03` | Static test allowlist `src/domains/job-board/public-select.static.test.ts:68-79` đã được cập nhật đúng sorted keys mới (thêm `isHot`, `isUrgent`). Test xanh. |
| `AC-04` | `app/(portal)/page.tsx` KHÔNG còn chứa `deriveStamps`; KHÔNG còn đọc `urgency` / `salaryMaxVnd` / `postedAt` / hash để derive stamp. `enrichJob` derive từ `job.isHot` + `job.isUrgent`. |
| `AC-05` | Unit test xác nhận `enrichJob` trả `stamps: []` khi cả `isHot`/`isUrgent` false; `['hot']` khi chỉ `isHot`; `['tuyen-gap']` khi chỉ `isUrgent`; `['hot', 'tuyen-gap']` (sau sort theo STAMP_RANK) khi cả hai. |
| `AC-06` | Unit test xác nhận `toDto`/`toDetailDto` map `isHot`/`isUrgent` đúng từ Prisma row. |
| `AC-07` | Editor shell: 2 toggle xuất hiện với `aria-label` + label text; click → bật dirty flag; PATCH body chứa `isHot`/`isUrgent`; save 200; revision bump + status giữ nguyên. |
| `AC-08` | `updateDraftContent` reject payload có `isHot: 'true'` (string) hoặc `isHot: null` không hợp lệ (theo validator policy `DEC-04` → `INVALID_INPUT 400`). |
| `AC-09` | `listEligibleSlotsForNewJobPosting`: trả về đúng các slot `OPEN`/`CLOSING_SOON` chưa hết hạn, còn chỗ, chưa có JobPosting canonical. Slot `CLOSED`/`CANCELLED`/`FILLED` bị filter. Slot có `validTo < now()` bị filter. Slot đầy (`slotsFilled >= slotsNeeded`) bị filter. Slot đã có JobPosting bị filter. |
| `AC-10` | POST `/api/admin/jobs/job-postings` với slotId ineligible (sau re-read trong transaction) → 4xx; existing posting được reuse trả về posting đó (không tạo row thứ hai). |
| `AC-11` | Idempotency: 2 POST cùng `Idempotency-Key` → chỉ 1 logical attempt; 2 POST khác key → 2 attempt độc lập. |
| `AC-12` | Role gate: POST/PATCH với role không phải ADMIN/HR_MANAGER/HR_STAFF → 403. |
| `AC-13` | DB integration test `tests/db/job-posting-stamps.integration.test.ts` PASS trên synthetic DB: (a) eligibility predicate; (b) isHot/isUrgent round-trip qua createDraft + PATCH; (c) public projection chỉ trả stamp của posting PUBLISHED; (d) DRAFT/ARCHIVED không xuất hiện trong public. |
| `AC-14` | `globals.css` `.job-stamp-attention` + `@keyframes job-stamp-blink` đúng opacity 0.7↔1.0; `motion-reduce:animate-none motion-reduce:opacity-100` xuất hiện trên wrapper. Static test xanh. |
| `AC-15` | `app/(jobs)/viec-lam/[slug]/page.tsx` + `app/(jobs)/viec-lam/page.tsx` render stamps array từ DTO `isHot` + `isUrgent`. Không heuristic. |
| `AC-16` | Multi-stamp layout: card có 2 stamp (HOT + TUYỂN GẤP) render cả hai với offset index, không chồng lên nhau, aria-label + text đầy đủ. |
| `AC-17` | `verify-encoding.ps1` xanh trên toàn changed surface (UTF-8 no BOM, LF). |
| `AC-18` | `git diff --check` xanh. |
| `AC-19` | `verify-task.ps1` xanh tại `READY_TO_CODE`. `verify-handoff.ps1` xanh sau HANDOFF freeze. |
| `AC-20` | HANDOFF.md pin đúng semantic Implementation SHA. |

## 5. Execution Plan

### 5.1 RQ → STEP → AC Traceability

| RQ-ID | STEP-ID | AC-ID | Note |
|---|---|---|---|
| RQ-01 | STEP-01 | AC-01, AC-02 | Schema additive + migration |
| RQ-02 | STEP-02 | AC-01 | prisma validate + generate |
| RQ-03 | STEP-04, STEP-05 | AC-09 | Eligibility + slot selector DTO |
| RQ-04 | STEP-03 | AC-10 | POST re-read + revalidate |
| RQ-05 | STEP-12 | AC-10 | Submit → redirect |
| RQ-06 | STEP-11 | AC-07 | Editor toggle + dirty tracking |
| RQ-07 | STEP-03 | AC-08 | Validator rejects non-boolean |
| RQ-08 | STEP-06 | AC-03 | publicSelect + DTO extension |
| RQ-09 | STEP-08 | AC-04 | Replace heuristic in portal page |
| RQ-10 | STEP-10 | AC-15 | Stamp render in viec-lam pages |
| RQ-11 | STEP-09 | AC-16 | Multi-stamp layout |
| RQ-12 | STEP-09 | AC-14 | Animation 0.7↔1.0 + reduced-motion |
| RQ-13 | STEP-01 | AC-02 | Static migration test fence |

### 5.2 Step Detail

| ID | Action | Files |
|---|---|---|
| STEP-01 | Forward-only migration `20260926120000_p1a01_jobposting_stamps` | `prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql` |
| STEP-02 | Update schema: `isHot` + `isUrgent` on `JobPosting` | `prisma/schema.prisma` |
| STEP-03 | Extend service: `UpdateDraftContentInput`, validator, DB write | `src/domains/staffing/job-posting-authoring.service.ts` |
| STEP-04 | Extend service: `JobPostingListItemDto`, `listEligibleSlotsForNewJobPosting` | `src/domains/staffing/job-posting-list.service.ts` |
| STEP-05 | Add `JobPostingSlotSelectorDto` interface + SQL predicate | `src/domains/staffing/job-posting-list.service.ts` |
| STEP-06 | Extend `publicSelect` + `PublicJobDto` + mappers | `src/domains/job-board/public.service.ts` |
| STEP-07 | Update static test allowlist | `src/domains/job-board/public-select.static.test.ts` |
| STEP-08 | Replace `deriveStamps` heuristic in portal page | `app/(portal)/page.tsx` |
| STEP-09 | Multi-stamp layout in `FeaturedJobCard` | `src/domains/job-board/components/landing/featured-job-card.tsx` |
| STEP-10 | Shared stamp component for `/viec-lam` pages | `src/domains/job-board/components/landing/stamp-badge.tsx` |
| STEP-11 | Editor shell toggles for `isHot`/`isUrgent` | `app/admin/jobs/job-postings/[id]/editor-shell.tsx` |
| STEP-12 | Server Component slot selector + client form | `app/admin/jobs/job-postings/page.tsx`, `app/admin/jobs/job-postings/create-job-posting-form.tsx` |
| STEP-13 | Tests: static migration, static CSS, unit mappers, integration | `tests/db/job-posting-stamps.integration.test.ts`, `src/domains/job-board/job-posting-stamps-mapping.test.ts`, `src/domains/job-board/job-posting-stamps.static.test.ts`, `src/domains/staffing/job-posting-stamps-eligibility.test.ts` |
| STEP-14 | Run gates: validate, generate, typecheck, lint, unit, integration, git diff --check | — |
| STEP-15 | Commit implementation, write HANDOFF, freeze docs | — |

## 6. Acceptance

### 6.1 Acceptance Criteria

| ID | Criterion | Evidence |
|---|---|---|
| AC-01 | prisma validate + generate pass; `JobPosting.isHot`/`isUrgent` in client types | `npx prisma validate`; `npx prisma generate` |
| AC-02 | Migration ADD-only, NOT NULL DEFAULT false, no DROP/RENAME/CREATE FUNCTION | `prisma/migrations/20260926120000_p1a01_jobposting_stamps/migration.sql`; static test |
| AC-03 | `public-select.static.test.ts` allowlist includes `isHot` + `isUrgent` | Unit test run |
| AC-04 | `app/(portal)/page.tsx` no `deriveStamps`; no urgency/salary/postedAt/hash heuristic | Code review |
| AC-05 | Unit test: `enrichJob` derives `stamps` from `isHot`/`isUrgent` correctly | `job-posting-stamps-mapping.test.ts` |
| AC-06 | Unit test: `toDto`/`toDetailDto` map `isHot`/`isUrgent` | `job-posting-stamps-mapping.test.ts` |
| AC-07 | Editor shell: 2 toggles, dirty flag, PATCH body, revision bump | Code review |
| AC-08 | `updateDraftContent` rejects non-boolean `isHot`/`isUrgent` | Service validator |
| AC-09 | Eligibility predicate: OPEN/CLOSING_SOON, not expired, slots available, no existing posting | `job-posting-stamps-eligibility.test.ts` |
| AC-10 | POST re-read + redirect; existing posting reuse; ineligible → 4xx | `job-posting-stamps.integration.test.ts` |
| AC-11 | Idempotency: same key = 1 attempt; different key = independent | `job-posting-stamps.integration.test.ts` |
| AC-12 | Role gate: ADMIN/HR_MANAGER/HR_STAFF only for POST/PATCH | Service auth check |
| AC-13 | DB integration: eligibility, round-trip, PUBLISHED projection, DRAFT/ARCHIVED blocked | `job-posting-stamps.integration.test.ts` |
| AC-14 | Animation 0.7↔1.0; `motion-reduce` on wrapper | `job-posting-stamps.static.test.ts` |
| AC-15 | `/viec-lam` + `/viec-lam/[slug]` render stamps from DTO flags | Code review |
| AC-16 | Multi-stamp: both HOT + URGENT stamps visible with index offset | `featured-job-card.test.ts` |
| AC-17 | All changed text files are UTF-8 no BOM, LF | Encoding gate |
| AC-18 | `git diff --check` passes | CI gate |
| AC-19 | `verify-task.ps1` PASS; `verify-handoff.ps1` PASS | Gate scripts |
| AC-20 | HANDOFF.md pins exact Implementation SHA | HANDOFF §0 |

### 6.2 Gate Results (recorded at handoff)

| Gate | Result | Notes |
|---|---|---|
| `npx prisma validate` | PASS | |
| `npx prisma generate` | PASS | |
| `npx tsc --noEmit` | PASS | 0 errors |
| `vitest run` (unit) | PASS | 174 files, **2697 tests** passed / 0 failed / 9 skipped (2706 total) — 2 new AUD-001 tests added in R2 |
| `vitest run --config vitest.integration.config.ts tests/db/job-posting-stamps.integration.test.ts` (synthetic DB, Neon) | PASS | 10 tests / 10 passed; 31.8s; 11 cases incl. `eligibleSlotPredicateSql` parity |
| `vitest run --config vitest.integration.config.ts` (full) | PASS | 32 files, 551 tests, 2 skipped |
| `git diff --check` | PASS | clean |
| `verify-encoding` (Node `verify-encoding.mjs`) | PASS | 2 R2 changed files (`job-posting-authoring.service.ts`, `job-posting-stamps-eligibility.test.ts`), 0 BOM/CRLF |
| `verify-task.ps1` | PASS | DRAFT-VALID (9 warnings, all non-blocking) |
| `verify-handoff.ps1` | PASS | (run after HANDOFF commit) |

## 7. Risk

| Risk | Mitigation |
|---|---|
| Heuristic `deriveStamps` call sites other than `(portal)/page.tsx` | Grep before commit; unit test for `enrichJob` derive from flags |
| `publicSelect` allowlist drift | Static test allowlist updated + sorted |
| Migration timestamp collision | Timestamp ≥ `20260925120000`; check `ls prisma/migrations/` before mkdir |
| `updateDraftContent` overwrites existing `isHot`/`isUrgent` when client sends undefined | Explicit `input.isHot !== undefined ? input.isHot : existing.isHot` pattern |
| T1A overlap (Recruiter Workbench) | Forbidden paths in §0; grep before commit |
| Synthetic DB absent | Status = BLOCKED, Canonical DB gate = ENV_BLOCKED — NOT self-skipped |

## 8. Open Questions

- None. All decisions locked by T0 directive §2-§4. Correction batch 1/1 (C-01..C-06) closed every finding without new Owner decisions; no further rounds permitted (correction budget = 0).

## 9. Planner Resolution

- T0 directive (2026-09-26) provided complete locked decision set covering storage, create/reuse semantics, slot eligibility, idempotency, stamp editing, and public rendering.
- Correction batch 1/1 (2026-09-26, T0 directive §corrections) closed five findings (C-01, C-02, C-04, C-05, C-06) and rewrote C-03 integration test for determinism. Plan:
  - C-01 PATCH route wire → `app/api/admin/jobs/job-postings/[id]/route.ts` adds `isHot`/`isUrgent` to `PatchBody`, validator, idempotency hash, and route-level test in `[id]/route.test.ts`.
  - C-02 selector/write-path drift → one canonical predicate `eligibleSlotPredicateSql(now)` consumed by both `listEligibleSlotsForNewJobPosting` (selector) and `assertSlotEligibleForNewJobPosting` (write path inside transaction).
  - C-03 deterministic DB integration → rewrote `tests/db/job-posting-stamps.integration.test.ts` with run-scoped fixtures, reverse-FK cleanup, zero residue assertion, 11 substantive cases.
  - C-04 UI lifecycle + idempotency → disable stamp toggles on non-DRAFT statuses; preserve `Idempotency-Key` on 5xx/network errors, reset on 4xx/slot change, `crypto.randomUUID()` entropy, safe generic error UI.
  - C-05 shared stamp renderer → new `stamp-badge.tsx` + canonical `deriveStampsFromFlags` in `stamp-defs.ts`; reuse in `/viec-lam` + `/viec-lam/[slug]`; FeaturedJobCard keeps `RubberStamp` art-direction but uses shared helper.
  - C-06 evidence → TASK.md updated to v1.1; HANDOFF.md will be re-frozen after semantic commit.
- **Existing migration `20260926120000_p1a01_jobposting_stamps/migration.sql` MUST NOT be edited** (T0 §corrections batch 1/1, "Do not edit the existing migration bytes" — T0 chấp nhận additive migration đã apply).
- **R2 post-audit integrity correction (2026-09-26, T0 exception):** Tier 3 audit verdict CONDITIONAL (1 P1 RELEASE-BLOCKING + 2 P3) on R1 correction batch 1/1. T0 granted ONE post-audit integrity exception because the pre-audit correction budget was exhausted. R2 closes AUD-001 (write-path canonical helper consumption) and AUD-002 (HANDOFF counts + SHA pin). AUD-003 is P3 accepted debt (`verify-encoding.mjs` kept until rebase onto canonical main); will be resolved in a dedicated tooling-cleanup PR. No Owner decisions required beyond those already locked.
- T1C executor used V2_FAST_FREEZE protocol; corrections budget = 1 (now exhausted by R2).
- **T0 production closeout (2026-09-26):** PR #55 was reconciled with accepted P1-E0 by merge commit `73a9ed3ed6258f839f82b4437ecbce334dc14976`, then merged to `main` at `34d364609a2bb1f80a524fc9924ae23b37b20aaf`. PR CI and post-merge main CI passed. T0 created pre-migration Neon snapshot branch `br-icy-night-azmankdx`, deployed only migration `20260926120000_p1a01_jobposting_stamps`, verified migration status and both NOT NULL/default-false columns, then completed read-only HTTP smoke. Task state is now `ACCEPTED`; AUD-003 remains non-blocking P3 tooling debt.

## 10. Revision Log

| Round | Date | Change | Rationale |
|---|---|---|---|
| R0 (draft) | 2026-09-26 | Initial TASK.md authored | Baseline for implementation |
| R1 (implementation) | 2026-09-26 | TASK section names corrected to match `verify-task.ps1` required structure; RQ→STEP→AC traceability table added (T-05 failure fix); Execution Plan + Acceptance + Risk + Open Questions + Planner Resolution + Revision Log sections added per required section list | `verify-task.ps1` requires `## 5. Execution Plan` and `## 6. Acceptance`; T-05 requires RQ→STEP→AC traceability |
| R1.1 (correction batch 1/1) | 2026-09-26 | TASK bumped to v1.1. Status → `READY_FOR_AUDIT`. Contract gate → `ACCEPTED`. In-scope roots expanded with C-01..C-06 deliverables. Required gates refined (route/component/service tests; deterministic targeted DB integration; p1a1 migration-chain proof). Current audit round → `0` (Tier 3 not yet invoked). Correction budget → `0` (batch 1/1 closed all findings; no further rounds). | T0 directive §corrections batch 1/1: five findings + C-03 integration rewrite closed. Frozen delivery still pending new Implementation SHA pin (HANDOFF §0). |
| R2 (post-audit integrity correction) | 2026-09-26 | TASK bumped to v1.2. Status → `READY_FOR_AUDIT` (audit round 1 verdict CONDITIONAL; AUD-001 RELEASE-BLOCKING closed). Contract gate → `ACCEPTED`. In-scope roots expanded with **AUD-001 R2** (real import + `(eligibleSlotPredicateSql(now)) AS is_eligible` computed column + fail-closed `slot.is_eligible !== true` gate in `assertSlotEligibleForNewJobPosting`), **AUD-002 R2** (HANDOFF unit gate counts + new Implementation SHA `2c1bd1694121f822956c76e8024df9ef42dce9ad`), **AUD-003 R2 (P3 accepted debt)** (keep `verify-encoding.mjs`; cleanup deferred to dedicated PR after rebase onto main). Current execution round → `2`. Current audit round → `1` (Tier 3 audit recorded at AUDIT.md commit `b2b71a2`). Frozen delivery → `YES`. | T0 post-audit integrity exception (R1 pre-audit correction budget exhausted; no further rounds permitted). AUD-001 was the only RELEASE-BLOCKING finding (selector/write-path drift risk; authorization/runtime already intact, but drift-safety needed). AUD-002 P3 documentation debt (HANDOFF counts + SHA pin). AUD-003 P3 tooling drift (canonical `verify-encoding.ps1` exists upstream; keep Node variant until rebase). |
| R3 (T0 closeout) | 2026-09-26 | TASK bumped to v1.3. Status → `ACCEPTED`; audit round corrected to `2`; Next gate → `NONE — MERGED_AND_PRODUCTION_VERIFIED`. Recorded PR #55 merge, green CI, production snapshot, exact migration deployment, schema verification, and read-only smoke. | T0 completed merge and production gate at main merge commit `34d364609a2bb1f80a524fc9924ae23b37b20aaf`. No source, test, schema, migration, package, or audit artifact changed in this closeout. |

## 11. DEV-01 — Refreshed Line References (correction batch 1/1)

The original TASK.md DEV-01 entries referenced the v1 file/line landscape. After C-01..C-06 fixes, the relevant DEV points sit at:

| ID | v1 (now stale) | v1.1 (current) |
|---|---|---|
| PATCH wire | `route.ts` v1 omitted `isHot`/`isUrgent`; idempotency hash 9 slots only | `app/api/admin/jobs/job-postings/[id]/route.ts` adds `PatchBody.isHot/isUrgent`, `assertStrictBoolean`, both fields in `requestBody` (length 11). Test: `route.test.ts` covers false→true, combinations, omitted-undefined, invalid flag rejection (NULL/string/number/object), 409 idempotency conflict, hash stability. |
| Selector predicate | `listEligibleSlotsForNewJobPosting` typed with `orderStatus: 'OPEN'` hard-coded | `JobPostingSlotSelectorDto.orderStatus` is `'OPEN' \| 'CLOSING_SOON'` (actual DB-read). Selector runs `eligibleSlotPredicateSql(now)`. POST re-reads + revalidates via `assertSlotEligibleForNewJobPosting` inside `withDbContext`. |
| Editor stamp toggles | Toggles enabled regardless of `status` | `editor-shell.tsx` `disabled={!canMutate \|\| isSaving \|\| status !== 'DRAFT'}` — toggles locked on PUBLISHED + ARCHIVED. |
| Create form idempotency | Network error message showed raw `err.message` | `create-job-posting-form.tsx` uses `crypto.randomUUID()` entropy (RFC 4122 fallback); preserves Idempotency-Key on 5xx/network; resets on 4xx/slot-change; renders safe generic message + log safe diagnostics via existing safe logger. |
| Stamp renderer duplication | Inline `<span>` with `job-stamp-attention` duplicated across listing + detail | Single `<JobStampBadge>` at `src/domains/job-board/components/landing/stamp-badge.tsx`; `deriveStampsFromFlags` in `stamp-defs.ts` shared with homepage FeaturedJobCard. Listing + detail use badge; hero card keeps `RubberStamp` style but reads shared helper. |
| Integration test | 4 cases mostly seed-dependent; early `return` on missing fixture = fake PASS | 11 cases with run-scoped deterministic fixtures; reverse-FK cleanup; zero residue assertion; **REBUILD synthetic DB before final canonical run** (per T0 §C-03 last bullet). |
