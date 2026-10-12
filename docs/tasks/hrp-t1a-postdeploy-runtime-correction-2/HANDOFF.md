# HANDOFF — T1A Post-Deploy Runtime Correction Round 2

> Status: **FROZEN**, awaiting Owner review.
> Frozen SHA: **`566f42b6fd63d5b7be6de8b02b0bda85d138a409`** (includes HANDOFF)
> Implementation frozen SHA: **`90781a370752aea92a16f13aed25294dea9a05a2`** (commit 2)
> Worktree: `C:\CodeApp\HrP-worktrees\t1a-postdeploy-runtime-correction-2`
> Branch: `codex/t1a-postdeploy-runtime-correction-2`
> Baseline: `14712f15a5bc58d406fac784adb174c76d823d33`

## TL;DR

Triệu chứng Owner báo: **Publish 409 với JobOpening DRAFT là EXPECTED, không
phải root bug.** Root bug là:
1. Thiếu **operational bridge** giữa JobPosting page và JobOpening detail
   (RelatedObjects card không có `href`, không có CTA sang JobOpening).
2. **Publish button vẫn sáng** dù server đã biết JobOpening chưa OPEN → user
   bấm vào dead-end (server 409 mà UI không giải thích lý do / không cho
   đường đi tiếp).

Round 2 close cả hai gap bằng UX wiring ở client-side **mà không đụng
server contract** (server 409 fail-closed được giữ nguyên 100%).

**Outcome D — Editor không editable** — KHÔNG đụng tới round 2 này. Static
review không tìm được root cause rõ ràng (`editable: !disabled` với
`disabled` undefined → true, không có path nào trong source ép
`disabled=true`). Có 3 candidate root cause; Phase D chỉ trigger khi
Owner repro lại sau khi A/B/C đã deploy. Lý do tách: tránh fix bug
trên suy đoán, không có runtime evidence từ Owner.

## Records liên quan

| ID | Loại | Status |
|---|---|---|
| `655909be-65ea-4a6d-bef4-7a63297e2bc6` | JobOpening UUID (Owner evidence) | DRAFT — chưa biết serviceModel |
| Server 409 message (verbatim) | `Linked JobOpening 655909be-65ea-4a6d-bef4-7a63297e2bc6 phải ở trạng thái OPEN (hiện tại: DRAFT).` | Match canonical contract |

## Branch / commits

| Identity | Value |
|---|---|
| Branch | `codex/t1a-postdeploy-runtime-correction-2` |
| Worktree | `C:\CodeApp\HrP-worktrees\t1a-postdeploy-runtime-correction-2` |
| Baseline (pre-fix) HEAD | `14712f15a5bc58d406fac784adb174c76d823d33` |
| Commit 1 — Outcome A | `e61d87c4` |
| Commit 2 — Outcome B + C | `90781a37` |
| Frozen HEAD | `90781a370752aea92a16f13aed25294dea9a05a2` |

> 2 commits tách biệt cho phép reviewer đọc từng concern: (A) chỉ là UX
> card + hint; (B+C) mới đến gate + tests. Editor-not-editable (Outcome D)
> sẽ là commit 3 trong tương lai nếu Owner repro.

## What changed (canonical)

### Outcome A — JobPosting → JobOpening bridge (`app/admin/jobs/job-postings/[id]/page.tsx`)

- `RelatedObjects "Job Opening"` item: dùng `posting.opening.id` (UUID) làm
  React key thay cho `staffingOrderCode` (collision risk cũ).
- Item title giờ gồm:
  - `<code>{staffingOrderCode}</code>` (giữ nguyên dạng mono)
  - Một dòng subline theo status:
    - `OPEN` → `"Đã mở — sẵn sàng publish"`
    - `DRAFT` → `"DRAFT — cần mở trước khi publish"`
    - other → `"Trạng thái: {status}"`
- `href: /admin/job-openings/{opening.id}` — `RelatedObjects` tự wrap item
  trong `<Link>` khi `href` có mặt (`src/shared/ui/data-display/related-objects.tsx`).
- Thêm 1 `<p data-testid="opening-cta-hint">` ngay sau RelatedObjects
  (chỉ hiện khi `opening.status !== 'OPEN'`): nhắc admin rằng Publish
  button phía trên sẽ bật sau khi JobOpening ở OPEN.

### Outcome B — Publish precondition gating (`app/admin/jobs/job-postings/[id]/editor-shell.tsx`)

- `canPublish` useMemo giờ check thêm `initial.opening?.status === 'OPEN'`.
  Trả về `false` nếu `opening === null` (orphan).
- `publishBlockedReason` useMemo mới: trả về message Tiếng Việt cụ thể
  cho từng blocking precondition theo thứ tự ưu tiên
  (role → status → title → description → orphan → opening status).
- Khi `!canPublish` và `status === 'DRAFT'`, render mới:
  ```tsx
  <section data-testid="publish-blocked-banner" role="status" aria-live="polite">
    Publish chưa sẵn sàng
    <p data-testid="publish-blocked-reason">{publishBlockedReason}</p>
    {opening && opening.status !== 'OPEN' && (
      <a data-testid="publish-blocked-link"
         href={`/admin/job-openings/${opening.id}`>
        Mở JobOpening {opening.id.substring(0, 8)}… để chuẩn bị
      </a>
    )}
  </section>
  ```
- `ActionButton` component thêm prop optional `dataTestid` để test hook.
- KHÔNG có call server-side bị chặn — user click Publish khi bị disable
  là no-op ở UI; nếu user vẫn gọi trực tiếp qua DevTools / fetch,
  server 409 vẫn fail-closed (verified bởi test #3).

### Outcome C — JobOpening action visibility (no source change)

Source `JobOpeningActions` đã đúng spec P1-A0.5 / AC-06 từ baseline
(`canClassify` → Classify section; `canOpen` → Open submit; ngược lại →
Open disabled + `blockedReason`). Round 2 chỉ thêm regression tests
mở rộng (D section #4–7).

## Regression tests (T0 D section)

| # | File | Cases | Status |
|---|---|---|---|
| 1 | `publish-gating.test.tsx` | JobOpening DRAFT → Publish disabled + reason + bridge link | ✅ |
| 1b | `publish-gating.test.tsx` | Orphan (no opening) → Publish disabled + reason, no bridge link | ✅ |
| 2 | `publish-gating.test.tsx` | JobOpening OPEN → Publish enabled, no banner | ✅ |
| 2b | `publish-gating.test.tsx` | JobOpening FILLED → Publish disabled | ✅ |
| 2c | `publish-gating.test.tsx` | JobOpening CANCELLED → Publish disabled | ✅ |
| 1d | `publish-gating.test.tsx` | Empty title → blocks publish + bridge link still rendered | ✅ |
| 1e | `publish-gating.test.tsx` | canMutate=false → role-gated reason | ✅ |
| 3 | `job-posting-publish-contract.test.ts` | Direct publishJobPosting with JobOpening DRAFT → 409 + canonical message | ✅ |
| 3b | `job-posting-publish-contract.test.ts` | JobOpening FILLED → 409 | ✅ |
| 3c | `job-posting-publish-contract.test.ts` | JobOpening CANCELLED → 409 | ✅ |
| 3d | `job-posting-publish-contract.test.ts` | Orphan JobPosting → NOT_FOUND 500 | ✅ |
| 3e | `job-posting-publish-contract.test.ts` | JobOpening OPEN → success path, update called | ✅ |
| 3f | `job-posting-publish-contract.test.ts` | Non-mutation role → PERMISSION_DENIED 403 | ✅ |
| 4 | `job-opening-actions.test.tsx` (extended) | DRAFT chưa classify → Classify + Open disabled + lý do | ✅ |
| 5 | `job-opening-actions.test.tsx` (extended) | DRAFT đủ precondition → Open enabled | ✅ |
| 6 | `job-opening-actions.test.tsx` (extended) | DRAFT không đủ precondition → Open disabled + lý do + no PII leak | ✅ |
| 7 | `job-opening-actions.test.tsx` (extended) | Composition: sau Open, currentStatus OPEN hiển thị | ✅ |

Test count delta:
- `publish-gating.test.tsx` — NEW (7 cases)
- `job-posting-publish-contract.test.ts` — NEW (6 cases)
- `job-opening-actions.test.tsx` — extended (4 cases mới; tổng 17 cases)

## Verification gates (full unit lane)

All gates executed from `C:\CodeApp\HrP-worktrees\t1a-postdeploy-runtime-correction-2`
on frozen SHA `90781a37`.

| # | Gate | Result |
|---|---|---|
| 1 | `node .ai-pipeline/scripts/verify-encoding.mjs` (changed surface) | **PASS** — 5 files, strict UTF-8 without BOM |
| 2 | `git diff --check HEAD` (14712f15..90781a37) | exit 0 (no whitespace/line-ending issues) |
| 3 | `npm run typecheck` | exit 0 |
| 4 | `npx eslint` over all 4 changed files | exit 0 — 0 errors, 0 new warnings (1 pre-existing warning unrelated) |
| 5 | `npx vitest run --config vitest.unit.config.ts` (full unit lane) | **PASS** — 217 files, 3582 tests, 9 skipped (delta +17 vs baseline) |
| 6 | `npm run build` | exit 0; routes `/admin/job-openings/[id]` (2.24 kB) + `/admin/jobs/job-postings/[id]` (132 kB) compiled |

DB-touching integration tests: `tests/db/job-posting-authoring.integration.test.ts`
không chạy trong session này (env-blocked, không có `DATABASE_URL_TEST`
live). Test #3 ở trên cover contract integrity pure service-layer, không
cần DB.

## E — Báo cáo riêng (theo T0 yêu cầu)

### Root cause analysis (Owner-facing)

1. **Publish 409 là EXPECTED** — server contract `JOB_OPENING_NOT_OPEN`
   (HTTP 409) tồn tại từ baseline `14712f15` (commit gốc của P1-A0
   publish route, đã được audit nhiều vòng P1-final-release-safety).
   Bug KHÔNG nằm ở server.

2. **Root bug** là:
   - Thiếu **operational bridge** giữa JobPosting editor/viewer và
     JobOpening detail (RelatedObjects card không có `href` — admin
     click vào card không navigate đi đâu).
   - **UI precondition gating** thiếu: Publish button vẫn sáng khi
     JobOpening còn DRAFT, server vẫn nhận POST, server vẫn 409, user
     thấy error message cryptic mà không có cách nào trên UI để
     navigate sang JobOpening và mở nó.

3. **Với record `655909be-65ea-4a6d-bef4-7a63297e2bc6`**:
   - JobOpening status = DRAFT (Owner đã xác nhận).
   - Owner cần xem trang `/admin/job-openings/655909be-65ea-4a6d-bef4-7a63297e2bc6`
     để biết precondition cụ thể nào đang ngăn Open:
     - `serviceModel === null` → "Cần phân loại ServiceModel trước khi mở" → dùng Classify section (chỉ ADMIN/HR_MANAGER + placementCount=0)
     - parent StaffingOrder không OPEN → "StaffingOrder ở trạng thái …"
     - slot quá hạn → "StaffingOrderSlot đã quá hạn (validTo < now)"
     - slot đầy → "StaffingOrderSlot đã đủ chỉ tiêu"
     - parent order quá hạn → "StaffingOrder đã quá hạn nộp"
     - HR_STAFF chưa active → "Bạn cần được phân công vào StaffingOrder"

   Trang sẽ render **một trong các lý do trên** ngay cạnh Open button
   (đã có từ baseline P1-A0.5). Sau round 2 deploy, JobPosting page
   sẽ có 1 lối tắt sang trang đó qua RelatedObjects card + 1 lối tắt
   nữa qua banner "Mở JobOpening {id.substring(0, 8)}… để chuẩn bị".

### URL & runtime evidence

- URL cần verify trên runtime: `/admin/jobs/job-postings/{postingId}`
  (sau khi deploy) — RelatedObjects card + hint phải hiển thị
  + click được.
- JobOpening detail URL: `/admin/job-openings/655909be-65ea-4a6d-bef4-7a63297e2bc6`
  (sau khi deploy) — Open button disabled với blockedReason text,
  hoặc enabled nếu đủ precondition.
- Runtime screenshot/devtools capture: **chưa thu được** trong session
  này vì không có DB live + session HR_MANAGER/ADMIN. Cần Owner
  capture sau khi deploy round 2 để verify visually.

## Out of scope / Không đụng

- **Server contract `JOB_OPENING_NOT_OPEN` (409)** — giữ nguyên 100%.
  Verified bởi test #3 (`job-posting-publish-contract.test.ts`) 6 cases.
- **Server contract `/open` và `/classify`** — giữ nguyên. Chỉ thay đổi
  UX wiring ở client.
- **Authorization / RLS / authority** — không đụng.
- **Schema / migration / production DB** — không có delta DB.
- **Editor Tiptap (Outcome D)** — chưa có runtime evidence từ Owner;
  sẽ là round 3 nếu repro sau khi deploy.

## Stop conditions respected

- ✅ Không merge vào `main`.
- ✅ Không push lên remote (per Owner decision `freeze-implement-no-push`).
- ✅ Không touch production DB / migration.
- ✅ Không thay đổi server contract của `/publish`, `/open`, `/classify`.
- ✅ Không nới auth / RLS ở client.
- ✅ Editor fix tách commit (chưa có commit; defer).

## Rollback

`git revert 90781a37 90781a37^` (hoặc đơn lẻ) trên
`codex/t1a-postdeploy-runtime-correction-2`. No schema, production config,
or migration is mutated. Rollback purely code-level.

## CI

PR sẽ trigger Vercel Preview + Next.js typecheck/lint/test gates kế thừa
từ `main`. Không có file workflow CI mới.

## Implementation commits

- `e61d87c4` — Outcome A (JobPosting → JobOpening bridge)
- `90781a37` — Outcome B + C (Publish gating + regression tests)
- Frozen HEAD: `90781a370752aea92a16f13aed25294dea9a05a2`