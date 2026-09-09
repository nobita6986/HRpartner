# TASK — hrp-v6-p1-job-opening-status-card

## 0. Control

| Field | Value |
|-------|-------|
| Task slug | `hrp-v6-p1-job-opening-status-card` |
| Work type | `FEATURE` (vertical slice) |
| Assurance lane | `STANDARD` |
| Audit mode | `STANDARD_AUDIT` |
| Required gates | `verify-task.ps1`, `verify-handoff.ps1`, Tier 3 STANDARD_AUDIT |
| In-scope roots | `src/domains/staffing/`, `app/admin/jobs/`, `app/api/admin/job-opening-status/` |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Baseline | `main @ 0ba285a` (Tier 0 Resolution 09/09 — defer Neon/security) |
| Phase | `V6 Phase 1 — schema đã có → đọc + UI hiển thị` |
| Prerequisite | `hrp-v6-p1-job-opening-posting-split` đã ACCEPTED trên main (`cf887c0` + `dfcbdfb`); model `JobOpening` đã có (`git show main:prisma/schema.prisma` chứa `model JobOpening`) |
| Nguồn quyết định | `docs/V6/v6-admin-rebuild.md` §11 V6-DEC-011 (một opening nhiều slot; status DRAFT/OPEN/FILLED/CANCELLED) |
| Lane | `STANDARD` + `FOCUSED` (UI + 1 service + 1 API route) |

## 1. Outcome — nhìn thấy được khi chạy ứng dụng

Sau khi Tier 2 hoàn thành TASK này, admin mở `/admin/jobs` sẽ thấy ngay **một dải 4 thẻ badge** phía trên bảng All Jobs:

```
[ DRAFT 3 ]  [ OPEN 12 ]  [ FILLED 5 ]  [ CANCELLED 1 ]
```

- Mỗi thẻ hiển thị 1 status với số lượng `JobOpening` tương ứng.
- Tổng quan: 21 opening = 3 + 12 + 5 + 1.
- Loading: 4 placeholder shimmer.
- Empty (0 mọi status): 4 thẻ hiển thị "0".
- Error: 1 dải cảnh báo phía trên card, KHÔNG che bảng jobs bên dưới.

**Outcome có thể verify bằng mắt trong 5 giây**: mở `/admin/jobs` → thấy 4 badge đếm số.

## 2. Evidence (real command + exit code + output)

Lưu tại `docs/tasks/hrp-v6-p1-job-opening-status-card/evidence/`:

- `ac01.txt` — `npx prisma generate` exit 0; `grep -n "model JobOpening" prisma/schema.prisma` có 1 match.
- `ac02.txt` — `npm run test:unit -- job-opening-status` PASS (≥4 test).
- `ac03.txt` — `npx tsc --noEmit` exit 0.
- `ac04.txt` — `git diff --cached --name-only` (chỉ gồm path thuộc §4.1 scope).
- `ac05.txt` — `git status --porcelain` (sạch trừ staged paths + evidence).
- `ac06.txt` — `node scripts/verify-task.ps1 -TaskSlug hrp-v6-p1-job-opening-status-card` exit 0 PASS.

Không in credential, không in PII. Test dùng Prisma mock.

## 3. Decisions (chốt từ V6-DEC)

- `V6-DEC-011`: một `JobOpening` chứa nhiều slot; status DRAFT/OPEN/FILLED/CANCELLED. Task này đếm theo đúng 4 status này.
- Phạm vi đếm: **toàn hệ thống**, không lọc theo `staffingOrderId` (admin muốn nhìn tổng quan; nếu sau này cần lọc sẽ là task khác).
- Đếm bằng Prisma `groupBy({ by: ['status'] })` — chuẩn SQL, portable.
- KHÔNG denormalize count. Lý do: concurrency; `groupBy` rẻ ở scale hiện tại.
- Card nằm phía trên bảng jobs hiện tại, không thay thế bảng. Bảng jobs vẫn đọc từ `/api/projects` như cũ — không phụ thuộc round mới.

## 4. Contract

### 4.1 Scope cho phép
- `src/domains/staffing/job-opening-status.ts` (file mới)
- `src/domains/staffing/job-opening-status.test.ts` (file mới)
- `app/api/admin/job-opening-status/route.ts` (file mới)
- `app/admin/jobs/page.tsx` (sửa nhỏ — thêm 1 component card + 1 fetch hook)
- `app/admin/jobs/job-opening-status-card.tsx` (component mới, file mới)
- `app/admin/jobs/job-opening-status-card.test.tsx` (rendering test)
- `docs/tasks/hrp-v6-p1-job-opening-status-card/**` (HANDOFF.md, evidence/)

### 4.2 Cấm chạm
- `prisma/**` (schema/migration đã chốt)
- `src/domains/job-board/public*` (public surface — Phase 3)
- `app/api/projects/**`, `app/api/staffing/**` (route khác)
- `app/admin/jobs/page.tsx` phần bảng All Jobs hiện tại — KHÔNG đổi logic `useEffect` fetch `/api/projects` hay `handlePublish`
- `.env`, `package.json`, `vitest.config.ts`, `tsconfig.json`, `.gitignore`
- `git add -A`, `git add .`, commit, push, merge

### 4.3 Service contract

```ts
// src/domains/staffing/job-opening-status.ts
export type JobOpeningStatusSummary = {
  byStatus: { DRAFT: number; OPEN: number; FILLED: number; CANCELLED: number };
  total: number;
};

export async function summarizeAllJobOpenings(
  prisma: PrismaClient,
): Promise of JobOpeningStatusSummary;
```

- Trả đủ 4 key (zero-fill).
- `total = DRAFT + OPEN + FILLED + CANCELLED`.
- KHÔNG ném lỗi khi table rỗng (trả zero summary).
- Có thể ném lỗi nếu Prisma bị lỗi — caller bắt và trả 500.

### 4.4 API route contract

```
GET /api/admin/job-opening-status
→ 200 { byStatus: { DRAFT, OPEN, FILLED, CANCELLED }, total }
→ 500 { error: 'INTERNAL', message }
```

- Auth: yêu cầu role `ADMIN`/`HR_MANAGER`/`HR_STAFF` (VIEWER_ROLES giống `/api/projects`).
- KHÔNG nhận query string trong version này.

### 4.5 UI contract

Component `JobOpeningStatusCard`:
- 4 badge đặt ngang (grid 4 cột trên desktop, 2x2 trên mobile).
- Mỗi badge: label tiếng Việt + số đếm.
- Loading: 4 shimmer placeholder.
- Error: 1 dải div role alert phía trên.
- Empty: 4 badge "0".

### 4.6 Test contract
- 5 unit test cho service:
  1. 0 opening → all zero, total = 0.
  2. mix status → counts đúng.
  3. status ngoài 4 giá trị KHÔNG xuất hiện trong `byStatus`.
  4. Prisma throws → bubble up (không nuốt lỗi).
  5. groupBy không có DRAFT (chỉ OPEN) → DRAFT = 0.
- 2 component test cho card:
  1. Render 4 badge với số đếm đúng.
  2. Loading state: 4 shimmer.

## 5. Execution Plan

- `STEP-01` — Tạo `src/domains/staffing/job-opening-status.ts` với `summarizeAllJobOpenings`.
- `STEP-02` — Tạo `src/domains/staffing/job-opening-status.test.ts` 5 test.
- `STEP-03` — Tạo `app/api/admin/job-opening-status/route.ts` cho API route.
- `STEP-04` — Tạo `app/admin/jobs/job-opening-status-card.tsx` + test.
- `STEP-05` — Sửa `app/admin/jobs/page.tsx`: import + render component JobOpeningStatusCard phía trên bảng All Jobs (KHÔNG đụng logic bảng cũ).
- `STEP-06` — Chạy `npx tsc --noEmit`, `npm run test:unit -- job-opening-status`, `npx prisma generate`. Stage đúng scope; ghi evidence; viết HANDOFF.md.

### 5.1 Traceability RQ → STEP → AC

| RQ | STEP | AC |
|----|------|----|
| RQ-01 | STEP-01, STEP-02 | AC-02 |
| RQ-02 | STEP-03 | AC-01 |
| RQ-03 | STEP-04, STEP-05 | AC-02 |
| RQ-04 | STEP-04 | AC-02 |
| RQ-05 | STEP-06 | AC-03 |
| RQ-06 | STEP-06 | AC-04, AC-05 |
| RQ-07 | STEP-06 | AC-06 |

## 6. Acceptance

| AC | RQ | Điều kiện | Phương pháp đo | Bằng chứng | Chấp? |
|----|----|-----------|----------------|------------|-------|
| `AC-01` | RQ-02 | Prisma client có model `JobOpening` | `npx prisma generate` exit 0; `grep -n "model JobOpening" prisma/schema.prisma` ≥1 match | stdout + grep | Yes |
| `AC-02` | RQ-01, RQ-03, RQ-04 | 5 service test + 2 component test PASS | `npm run test:unit -- job-opening-status` | test output | Yes |
| `AC-03` | RQ-05 | TypeScript compile sạch | `npx tsc --noEmit` exit 0 | stdout + exit code | Yes |
| `AC-04` | RQ-06 | Staged paths thuộc §4.1 | `git diff --cached --name-only` | danh sách file | Yes |
| `AC-05` | RQ-06 | Working tree sạch ngoài scope | `git status --porcelain` | danh sách | Yes |
| `AC-06` | RQ-07 | verify-task script PASS | `node scripts/verify-task.ps1 -TaskSlug hrp-v6-p1-job-opening-status-card` exit 0 | script output | Yes |

## 7. Risk & Rollback

- **Count race:** `groupBy` không transaction → có thể lệch ±1 khi admin vừa xem vừa có người tạo opening mới. Acceptable cho badge.
- **Status typo:** `JobOpening.status: String` không enum → typo vẫn pass vào DB nhưng KHÔNG lọt vào `byStatus` (test case 3 ghim hành vi).
- **Auth surface:** API route mới phải dùng `getAuthContext` + `VIEWER_ROLES` đúng pattern `/api/projects`. Tier 2 copy pattern đó, không tự ý rút gọn.
- **Rollback:** revert staged files; xoá `app/api/admin/job-opening-status/`; revert 1 đoạn import + render trong `app/admin/jobs/page.tsx`.

## 8. Open Questions

- Có cần lọc theo `staffingOrderId` không? → **NGOÀI PHẠM VI**; Phase 2 admin rebuild sẽ quyết. Version này đếm toàn hệ thống.
- Có cần polling mỗi 30s? → **NGOÀI PHẠM VI**; user reload trang là đủ cho mức admin.
- Có cần drill-down click vào badge để filter bảng? → **NGOÀI PHẠM VI**; task sau nếu user cần.

## 9. Planner Resolution

(Rỗng — task chưa qua audit round nào.)

## 10. Revision Log

| Spec | Ngày | Thay đổi | Ghi chú |
|------|------|----------|---------|
| `v1.0` | `2026-09-09` | Phát hành draft sau Tier 0 Owner deferral 09/09; vertical slice: service + API + card trên admin/jobs page; STANDARD + FOCUSED; outcome nhìn thấy ngay khi mở `/admin/jobs`; không phụ thuộc task đang RESOLVING_R2 | Tier 1 viết trên worktree `tier1/job-opening-status-card-worktree`; baseline `main @ 0ba285a`; prerequisite đã có sẵn trên main |

