# T1A — Post-Deploy Runtime Correction Round 2: JobPosting/JobOpening Operational Bridge + Editor Editable

## Outcome

Round 2 đóng hai gap operational runtime quan sát được sau khi round 1
(`hrp-t1a-jobposting-editor-schema-hotfix`) đã được merge (PR #81) trên
`main` @ `14712f15`:

**Outcome A — JobPosting → JobOpening operational UX bridge.**
Người dùng đang thao tác JobPosting (status DRAFT) với linked JobOpening
DRAFT phải có một đường dẫn rõ ràng để:
1. 0. Mở trang JobOpening từ JobPosting editor/viewer.
2. 0. Hiểu tại sao nút Publish bị disabled.
3. 0. Biết cần thao tác gì tiếp theo (Classify hoặc Open) và click thẳng vào CTA.

**Outcome B — Publish button precondition gating.**
Nút Publish trên JobPosting editor/viewer phải reflect server-side
precondition `status === 'OPEN'` của Linked JobOpening. Khi JobOpening chưa
OPEN, nút Publish phải:
- Bị disable (server contract 409 vẫn giữ nguyên);
- Hiển thị lý do ngay cạnh nút;
- Cung cấp link/CTA sang JobOpening.

Không gửi POST publish vô ích khi đã biết sẽ 409.

**Outcome C — JobOpening action visibility & explanation.**
Trang `/admin/job-openings/[id]`:
- DRAFT chưa classify: phải hiển thị Classify section **hoặc** thông báo
  "Cần phân loại ServiceModel trước".
- DRAFT đã classify nhưng thiếu precondition khác: hiển thị Open button
  disabled kèm lý do cụ thể.
- DRAFT đủ precondition: Open button bật.
- Sau Open → router.refresh → JobPosting page nhìn thấy linked status OPEN
  và Publish được enable.

Không nới server authority, auth hoặc RLS ở client. Server 409 contract
`JOB_OPENING_NOT_OPEN` được giữ nguyên — fail-closed.

**Outcome D — Editor editable.**
Editor Tiptap trên JobPosting detail page phải editable cho mutation roles
(ADMIN/HR_MANAGER/HR_STAFF) khi status DRAFT.

Owner báo editor "không editable" — static review không tìm thấy root cause
rõ ràng: `editable: !disabled` với `disabled` undefined → editable true.
Có 3 candidate root cause:
- (a) Sau save, content local state update nhưng Tiptap editor không re-sync
  (Tiptap pitfall: `useEditor({content:...})` chỉ dùng initialContent);
- (b) Click handler ở button Publish fire nhưng server 409 → user nghi editor hỏng;
- (c) Bug tách biệt không liên quan UX fix.

Plan: implement Outcome A/B/C trước. Phase D được trigger SAU khi A/B/C đã
fix nếu Owner confirm còn repro trên runtime evidence. Phase D sẽ tách
commit riêng để review độc lập (per Owner decision `separate-commit-same-round`).

## Baseline & worktree

| Identity | Value |
|---|---|
| Branch | `codex/t1a-postdeploy-runtime-correction-2` |
| Worktree | `C:\CodeApp\HrP-worktrees\t1a-postdeploy-runtime-correction-2` |
| Baseline SHA | `14712f15a5bc58d406fac784adb174c76d823d33` |
| Source line | `main @ 14712f15` (PR #81 merge commit) |

## Boundary

**In scope**
- `app/admin/jobs/job-postings/[id]/page.tsx` — JobOpening card link + CTA
- `app/admin/jobs/job-postings/[id]/editor-shell.tsx` — Publish gating +
  pre-publish UI changes
- `app/admin/job-openings/[id]/page.tsx` — review: hiện đã render
  `JobOpeningActions` với server-derived flags + `blockedReason`. Phase A
  evidence
- Regression tests (D section — 7 tests)
- `docs/tasks/hrp-t1a-postdeploy-runtime-correction-2/HANDOFF.md`
- Editor Tiptap editable bug (separate commit, own file allowlist)

**Out of scope**
- Server contract `/api/admin/jobs/job-postings/[id]/publish` — giữ
  `JOB_OPENING_NOT_OPEN` 409 fail-closed
- Server contract `/api/admin/staffing/job-openings/[id]/open` và
  `/classify` — giữ nguyên precondition gate
- Server authority / RLS / authorization — không đụng
- Schema / migration / production DB
- Other admin pages
- Gallery media (AV4) — không liên quan

## Phase A — Static evidence (đã thu thập)

Vì session này không có DB production/dev live + không có HR_MANAGER/ADMIN
session để reproduce trực tiếp trên URL
`/admin/job-openings/655909be-65ea-4a6d-bef4-7a63297e2bc6` (theo
`static-evidence-only` decision), evidence Phase A dựa trên code review
của source đã committed:

**A.1 /admin/job-openings/[id] — JobOpeningActions render**

Source `app/admin/job-openings/[id]/page.tsx:243-256` render
`<JobOpeningActions opening={{ id: opening.id }} flags={flags} />` —
**ĐÚNG** spec. Action island là Client Component narrow, chỉ nhận
`opening.id` + `flags` (server-derived).

`flags` compute (`page.tsx:131-181`):
- `canClassify = isAdminOrHrManager && isDraft && opening.placementCount === 0`
- `canOpen = callerHasOpenAuthority && allPreconditionsMet` với 7 preconditions
- `blockedReason` được set khi `canOpen === false`, dựa trên precondition
  fail đầu tiên (theo thứ tự authority → status → serviceModel → orderOpen
  → slotExists → deadlineOk → slotValidToOk → slotCapacityOk)

**A.2 Nút Classify/Open**
`JobOpeningActions.tsx:309-345` render ServiceModel selector + Classify
button khi `flags.canClassify === true`. `JobOpeningActions.tsx:344-390`
render Open submit khi `flags.canOpen === true`, ngược lại render Open
disabled + `blockedReason`.

**A.3 JobOpening record `655909be-65ea-4a6d-bef4-7a63297e2bc6`**

Owner đã cung cấp status = DRAFT. Không có thông tin:
- `serviceModel`: null hay đã set?
- parent StaffingOrder.status?
- slot validity/capacity?
- role session của admin đang xem.

Nếu `serviceModel === null` (DRAFT chưa classify), `canOpen === false`,
`blockedReason === 'Cần phân loại ServiceModel trước khi mở'`. Owner cần
Classify section trước.

Nếu đã classify nhưng parent order không OPEN / slot quá hạn / capacity
full → `blockedReason` khác (`StaffingOrder ở trạng thái ...;`,
`StaffingOrder đã quá hạn nộp`, `StaffingOrderSlot đã quá hạn`,
`StaffingOrderSlot đã đủ chỉ tiêu`).

**A.4 `posting.opening.id` shape**

`getJobPostingForAdmin` (`src/domains/staffing/job-posting-list.service.ts:226-274`)
trả `opening: { id, status, openedAt, closedAt, staffingOrderId, staffingOrderCode, staffingOrderSlotId }`. Đã có `id` UUID động.

**A.5 Publish route contract**

`app/api/admin/jobs/job-postings/[id]/publish/route.ts` → `publishJobPosting`
(`src/domains/staffing/job-posting-authoring.service.ts:777-871`) check
`current.jobOpening.status !== 'OPEN'` → throw `JOB_OPENING_NOT_OPEN` 409 với
message chính xác:
`Linked JobOpening ${id} phải ở trạng thái OPEN (hiện tại: ${status}).`

→ Match đúng error string Owner đã capture.

## Decision: Build vs Adopt / Automate

**BUILD_VS_ADOPT**: N/A — task không thêm capability kỹ thuật phổ thông
mới. Chỉ sửa UX wiring của existing components. Không thêm package.

**BUILD_VS_AUTOMATE**: N/A — task không tạo/thay connector, scheduler,
notification worker, multi-system workflow.

## Lane / Audit

- Lane: **STANDARD** — public contract của JobPosting page +
  JobOpeningActions đã chốt từ P1-A0.5 / P1-A0. Đây là UX bug, không
  phải security/auth/RLS/migration thay đổi.
- Audit mode: **NONE** — changes local to admin UX, có regression tests
  cover cả 7 điều kiện theo D section. canonical gates (typecheck,
  build, full unit lane) là evidence đầy đủ. Không gọi Tier 3.

## File ownership

| File | Change | Commit |
|---|---|---|
| `app/admin/jobs/job-postings/[id]/page.tsx` | RelatedObjects "Job Opening" → có link `href` động `posting.opening.id`; thêm CTA "Chuẩn bị & mở JobOpening" / "Xem JobOpening" khi status DRAFT | Commit 1 (Outcome A) |
| `app/admin/jobs/job-postings/[id]/editor-shell.tsx` | (i) `canPublish` thêm check `posting.opening?.status === 'OPEN'`; (ii) hiển thị Publish-blocked reason + link JobOpening; (iii) **editor-not-editable fix** (commit riêng) | Commit 2 (Outcome B+C) + Commit 3 (Outcome D — Tiptap editable) |
| `app/admin/jobs/job-postings/[id]/__tests__/job-posting-editor-shell.test.tsx` | NEW — regression test cho canPublish gate + JobOpening link | Commit 2 |
| `app/admin/jobs/job-postings/[id]/__tests__/job-posting-page-link.test.tsx` | NEW — regression test cho JobPosting page RelatedObjects link | Commit 1 |
| `app/admin/job-openings/[id]/__tests__/job-opening-action-visibility.test.tsx` | NEW — regression test cho D section #4–6 (Classify visible / Open disabled+reason / Open enabled) | Commit 1 (extend existing test if possible) |
| `src/domains/staffing/job-posting-authoring.service.test.ts` (NEW) | Regression test cho server-side 409 fail-closed khi JobOpening DRAFT (D section #3) | Commit 1 |

## Canonical gates

1. `node .ai-pipeline/scripts/verify-encoding.mjs` over changed surface
   (no BOM, valid UTF-8).
2. `git diff --check HEAD` (no whitespace / line-ending issues).
3. `npx vitest run --config vitest.unit.config.ts` (full unit lane — exit 0).
4. `npx vitest run --config vitest.integration-files.ts` (DB-touching — chỉ
   chạy khi `DATABASE_URL_TEST` không env_blocked).
5. `npm run typecheck` (exit 0).
6. `npx eslint` over changed files (exit 0).
7. `npm run build` (exit 0).

## D — Mandatory regression tests (7 items theo T0 brief)

| # | Test | Where | Status |
|---|---|---|---|
| 1 | JobPosting + linked opening DRAFT → Publish disabled; lý do hiển thị; link `/admin/job-openings/<id>` đúng | `job-posting-editor-shell.test.tsx` | NEW |
| 2 | JobPosting + linked opening OPEN → Publish enabled | `job-posting-editor-shell.test.tsx` | NEW |
| 3 | Direct call publish với JobOpening DRAFT → canonical 409 `JOB_OPENING_NOT_OPEN` | `job-posting-authoring.service.test.ts` | NEW |
| 4 | JobOpening DRAFT chưa classify → Classify section visible | `job-opening-action-visibility.test.tsx` (extend) | NEW |
| 5 | JobOpening đủ precondition → Open button visible + enabled + gọi canonical `/open` | `job-opening-action-visibility.test.tsx` (extend) | NEW |
| 6 | JobOpening không đủ precondition → button disabled + lý do cụ thể, KHÔNG rò rỉ data | `job-opening-action-visibility.test.tsx` (extend) | NEW |
| 7 | Full flow classify → open → return to JobPosting → publish enabled (assertion ở component level) | Combined #4 + #5 + #2 | Composition |

## Self-review (≤3 risks, since Audit = NONE)

1. **Server contract integrity**: trong quá trình sửa editor-shell, có thể
   vô tình wrap gọi server với client-side gating quá chặt → ẩn hành vi
   fail-closed. Mitigation: tests #3 giữ server contract nguyên; UI chỉ
   disable button, không chặn server call nếu user vẫn click (vì
   server-side vẫn reject).

3. **RelatedObjects href propagation**: page.tsx hiện đang gán `staffingOrderCode`
   làm `id` cho RelatedObjects — không phải JobOpening UUID. Cần đổi sang
   `posting.opening.id` để đảm bảo key ổn định + link đúng. Mitigation:
   test #1 cover cả `id === opening.id` và `href === /admin/job-openings/${opening.id}`.

3. **Editor editable fix scope**: bug "editor không editable" có thể là do
   nhiều nguyên nhân (PRD descriptionJson null → asRichDoc fallback → editor
   mount OK nhưng không có toolbar hit? hoặc state dirty không fire? hoặc
   Tiptap's `editable` prop bị set false somewhere?). Cần reproduce
   statically trước khi patch. Mitigation: tách commit riêng để review
   độc lập; nếu root cause chưa rõ trong changeset, chuyển Tier 0 xin
   runtime evidence.

## Stop conditions

- Không merge/deploy.
- Không touch production DB / migration.
- Không thay đổi server contract của `/publish`, `/open`, `/classify`.
- Không nới auth / RLS ở client.
- Editor fix commit riêng với UX fix commit để review độc lập.
- **CHƯA READY_TO_CODE** cho tới khi:
  - Đã pin baseline SHA (`14712f15a5bc58d406fac784adb174c76d823d33`).
  - Đã verify worktree sạch (sẽ verify ngay khi viết).
  - Owner đã approve scope (đã approved qua AskQuestion).