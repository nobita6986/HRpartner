# TASK — `hrp-admin-ux-hotfix-2`

> **TIER-1 CONTROL (rev. 0 — initial scope)**: vòng HRP Admin UX hotfix tiếp
> theo `T1C` (PR #116). Mục tiêu: cải thiện trải nghiệm operator trên 4 bề
> mặt (`/admin/workers`, `/admin/labor-profiles`, copy subhead, `/admin/media`)
> + tra cứu lịch sử xóa Worker qua `audit_logs` (action
> `WORKER_PERMANENT_DELETE`). Không mở rộng ngoài danh sách Owner giao.
> BLOCKER ghi giữ nếu cột chưa có quan hệ/dữ liệu chuẩn — KHÔNG bịa.

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-admin-ux-hotfix-2` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Work type | `MIXED` (UI copy + table columns + audit read surface + media layout + font regression guard) |
| Build vs adopt | `N/A` |
| Build vs automate | `N/A` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | UI reversible + post-migration nội bộ trên đường người dùng; tuân theo PR-#116 pattern (`NONE`, Owner không yêu cầu audit). Data đọc từ schema/relation chuẩn, không đổi DB. |
| Spec version | `v1.0` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1` |
| Baseline | `8f93178a81c9f35c6f9be1e016bc4377928db185` (`origin/main`) |
| Implementation SHA | (set after commit) |
| Contract gate | `READY_TO_CODE` |
| Decision state | `CLOSED` |
| Test environment | `READY` |
| Correction budget | `1` |
| Frozen delivery | `NO` (in-progress) |
| Canonical gates | `TBD` |
| Audit eligibility | `NOT_REQUIRED` |
| In-scope roots | `app/admin/workers/page.tsx`; `app/admin/workers/[id]/worker-delete-button.tsx`; `app/admin/workers/[id]/page.tsx`; `app/api/workers/route.ts`; `app/api/admin/worker-delete-history/route.ts` (NEW); `app/admin/workers/delete-history/page.tsx` (NEW); `app/admin/labor-profiles/page.tsx`; `app/admin/labor-profiles/[id]/page.tsx`; `src/domains/talent/labor-profile.read-service.ts`; `app/admin/vendors/page.tsx`; `app/admin/media/page.tsx`; `app/admin/media/media-library-client.tsx`; `app/admin/workers/__tests__/*` (NEW); `app/admin/__tests__/operator-terminology.static.test.ts`; `app/admin/__tests__/admin-bvp-font.static.test.ts` (NEW); `docs/tasks/hrp-admin-ux-hotfix-2/{TASK.md,HANDOFF.md}` |
| Forbidden paths | `prisma/schema.prisma`; `prisma/migrations/**`; `package.json`; `package-lock.json`; `app/api/auth/**`; `middleware.ts`; `app/fonts/local-fonts.tsx`; `app/fonts/**` (font assets are frozen per P1 release); production env/DB; P1 pre-p2 deliverables locked in PR #116 |
| Required gates | `npx vitest run --config vitest.unit.config.ts <targeted>`; `npm run test:unit`; `npm run typecheck`; `npm run lint`; `npm run build`; `npx --no-install prisma validate`; `node .ai-pipeline/scripts/verify-encoding.mjs`; `git diff --check`; `pwsh .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-admin-ux-hotfix-2/TASK.md` |
| Current execution round | `1` |
| Current audit round | `0` |
| Next gate | `PUSH_PR_CI_MERGE` |

## 2. Outcome

### 2.1 User-visible outcome

1. **Xóa Worker**: sau khi xóa thành công, operator thấy thông báo xác nhận (`Đã xóa người lao động …`) trước khi quay về danh sách; từ danh sách có thể mở **Lịch sử xóa Worker** (`/admin/workers/delete-history`) — bảng phân trang/lọc theo thời gian + lý do + actor, che thông tin nhạy cảm (fullName/phone) theo permission, 403 với role không đủ quyền.
2. **Bảng Người lao động** (`/admin/workers`) thêm 4 cột vận hành: `Dự án/Job đang làm`, `Ngày làm đầu tiên`, `Quản lý dự án`, `Người hưởng hoa hồng`. Tất cả lấy từ quan hệ chuẩn (`ProjectAssignment`, `Project`, `CommissionLedger`). Bỏ cột/cell "Xem" riêng; giữ nguyên RowLink click hàng vào `/admin/workers/[id]`.
3. **Bảng Hồ sơ tiếp nhận** (`/admin/labor-profiles`) thêm 4 cột vận hành: `Job/đơn gần nhất`, `Số đơn`, `Người phụ trách`, `Nguồn tiếp nhận`. KHÔNG đẩy CCCD vào bảng. KHÔNG tạo thêm row hồ sơ (giữ 1 row/profile). Giữ quy tắc mask PII sẵn có (mask CCCD/phone theo permission).
4. **Copy sweep**:
   - `/admin/workers` subhead: `"Phân hệ M5 — …"` → `"Quản lý thông tin và trạng thái người lao động."`.
   - `/admin/vendors` subhead: `"Phân hệ M7 — …"` → `"Quản lý thông tin, liên hệ và trạng thái nhà cung cấp."`.
   - Quét toàn repo để đảm bảo KHÔNG còn `Phân hệ M*`/`Phân hệ M5`/`Phân hệ M7`/tương tự trong copy người dùng cuối nhìn thấy (`app/admin/**` + metadata).
5. **Font admin panel**: xác nhận bằng static guard rằng admin layout không override `--font-bvp`/`--font-inter` đi nơi khác; public site giữ nguyên.
6. **`/admin/media`** responsive: padding/margin đồng đều ở 360/768/1024/1440px; grid không tràn ngang; folder sidebar collapse đúng viewport nhỏ; pagination ổn định.

### 2.2 Non-goals

- KHÔNG migration, KHÔNG đổi Prisma schema.
- KHÔNG thêm relation mới; KHÔNG thêm cột label rộng (vd: "số ngày làm", "PM thực tế hiện tại") nếu không có quan hệ chuẩn — ghi BLOCKER + đề xuất.
- KHÔNG đổi font public site, KHÔNG thêm font mới.
- KHÔNG đổi role matrix hiện hữu của `/admin/workers`, `/admin/labor-profiles`, `/admin/vendors`, `/admin/media`.
- KHÔNG đẩy CCCD vào bất kỳ cột list bảng nào.
- KHÔNG xóa/mutate audit_logs ngoài đường đọc (`SELECT` chỉ).
- KHÔNG mở rộng ngoài scope (vd: P2-B candidate profile, placement không thuộc tính năng hiện tại).

## 3. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/domains/workforce/worker.service.ts:693-714` — `tx.auditLog.create` ghi `WORKER_PERMANENT_DELETE` với `before` snapshot `{id, userId, fullName, createdAt}` + `actorId` + `reason`. | Có sẵn data audit trong schema; chỉ cần read surface + UI. |
| `EV-02` | `app/api/workers/[id]/route.ts:217-280` — DELETE trả `{ok: true, id, deletedAt}`. UI hiện `window.location.href = '/admin/workers'` (silent redirect). | Cần toast confirm + flag "vừa xóa" trước khi redirect. |
| `EV-03` | `app/admin/workers/page.tsx:166,209-219` — `<th>Thao tác</th>` + `<td><Link>Xem</Link></td>`. Row có `onClick` mở detail rồi. | Drop cột Thao tác + cell "Xem"; giữ nguyên RowLink/onClick. |
| `EV-04` | `app/admin/workers/page.tsx:79-89` — heading `Danh sách người lao động` + subhead `Phân hệ M5 — Quản lý hồ sơ người lao động …` | Copy cần đổi sang copy Owner chỉ định. |
| `EV-05` | `prisma/schema.prisma:247-301,762-772,1568-1578,1362-1370` — `Worker.assignments ProjectAssignment[]`, `Worker.episodes EmploymentEpisode[]`, `ProjectAssignment.status PLANNED|ACTIVE|…`, `Project.pmUserId`, `CommissionLedger.ctvId/workerId`. | Quan hệ chuẩn cho 4 cột bảng Worker. |
| `EV-06` | `prisma/schema.prisma:1513-1570,1822-1840` — `LaborProfile.intakes LaborProfileIntake[]` (channel), `LaborProfile.submissions[]`, `LaborProfile.handlingAssignments[]` (assigneeUserId → User.name), `ReferralAttribution.referrerUserId`. | Quan hệ chuẩn cho 4 cột bảng LaborProfile. |
| `EV-07` | `app/admin/vendors/page.tsx:160-161` — subhead `Phân hệ M7 — Quản lý đối tác`. | Copy cần đổi sang copy Owner chỉ định. |
| `EV-08` | `app/fonts/local-fonts.tsx` + `app/globals.css:101-104,227-228` — `body { font-family: var(--font-body) }`, `--font-body = --font-bvp`. | Đã là BVP. Cần static guard confirm không bị override. |
| `EV-09` | `app/admin/media/page.tsx:33-69` + `app/admin/media/media-library-client.tsx:122-260` — render shell + Client. Sidebar 220px + grid 2/3/4 col. | Surface padding/media. |
| `EV-10` | `app/admin/workers/page.tsx:79` — `px-6 py-8 lg:px-8` (Tailwind). | Có thể đụng quai `gte:` để chống tràn mobile. |

## 4. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Worker delete success UX: toast/banner inline hiển thị `"Đã xóa người lao động <fullName> (Mã: <userId>). Đang chuyển về danh sách…"` 2.5s, sau đó `router.push('/admin/workers')`. Không dùng `window.location.href` để giữ client-side navigation. | `CHOSEN` |
| `DEC-02` | Delete history surface: route mới `/admin/workers/delete-history` (server component đọc `audit_logs`) + `/api/admin/worker-delete-history` (route handler, ADMIN+HR_MANAGER+DIRECTOR role, projection rules, pagination, `?from`, `?to`, `?search`, `?take`, `?skip`). 403 với role khác. PII masking theo `canSeeSensitive`. | `CHOSEN` |
| `DEC-03` | Worker list columns 4 cột mới: (a) "Dự án/Job đang làm" = `ProjectAssignment.status='ACTIVE'` → `Project.code`/`name` (ưu tiên dòng ACTIVE mới nhất theo `validFrom desc`); (b) "Ngày làm đầu tiên" = MIN(`EmploymentEpisode.startedAt`, `ProjectAssignment.validFrom`) qua Worker; (c) "Quản lý dự án" = `Project.pmUser.name` (lookup User); (d) "Người hưởng hoa hồng" = `CommissionLedger.ctvId` (CTV/User) của dòng CREDIT mới nhất gắn Worker (≠ ctvId trống). `null` → "—". | `CHOSEN` |
| `DEC-04` | Worker list: drop cột `<th>Thao tác</th>` + cell `<Link>Xem</Link>`; giữ nguyên `<tr>` `onClick → router.push('/admin/workers/[id]')`. | `CHOSEN` |
| `DEC-05` | LaborProfile list columns 4 cột mới: (a) "Job/đơn gần nhất" = MAX(`placementCase.openedAt`) + `Project.name`/`code`; (b) "Số đơn" = COUNT(`placementCases`); (c) "Người phụ trách" = `LaborProfileHandlingAssignment` ACTIVE → `User.name`; (d) "Nguồn tiếp nhận" = `LaborProfileIntake.channel` (mới nhất theo `createdAt desc`) → label qua `laborProfileIntakeChannelLabel`. KHÔNG thêm CCCD cột. | `CHOSEN` |
| `DEC-06` | Subhead copy: workers subhead = `"Quản lý thông tin và trạng thái người lao động."`; vendors subhead = `"Quản lý thông tin, liên hệ và trạng thái nhà cung cấp."`. Bỏ các "Phân hệ M5/M7/…" trong cả 2 file. | `CHOSEN` |
| `DEC-07` | Font admin guard: thêm `app/admin/__tests__/admin-bvp-font.static.test.ts` để (a) đảm bảo không có inline style nào trong `app/admin/**` set `font-family` không phải `var(--font-bvp)`/`var(--font-inter)`; (b) `app/layout.tsx` tiếp tục bind `--font-bvp` + `--font-inter`; (c) public site (route `/viec-lam`, `app/(landing)/**`) không có override font-family. | `CHOSEN` |
| `DEC-08` | Media responsive: outer container `p-4 sm:p-6 lg:p-8`; sidebar ở `<md` collapse thành 1 cột; grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`; card padding `p-3 sm:p-4`; pagination full-width. | `CHOSEN` |
| `DEC-09` | BLOCKER (ghi giữ T0): nếu trong implementation phát hiện (i) `Worker.episodes[]` rỗng cho toàn bộ Worker trong dataset → cột "Ngày làm đầu tiên" hiển thị `"—"` đồng nhất; (ii) `CommissionLedger.ctvId` cho Worker null → cột "Người hưởng hoa hồng" hiển thị `"—"`. KHÔNG fallback ngày = `Worker.createdAt`. KHÔNG suy diễn beneficiary từ `Worker.assignedToId`. | `CHOSEN` |
| `DEC-10` | KHÔNG sửa `app/admin/workers/[id]/page.tsx` (T1B đã đóng): giữ nguyên 7 sections hiện hữu (Nhận diện / Liên hệ / Giấy tờ / Việc làm / Ngân hàng / Liên kết / Audit cơ bản). | `CHOSEN` |
| `DEC-11` | Route guard: `/admin/workers/delete-history` chỉ ADMIN + HR_MANAGER + DIRECTOR. 401 → redirect `/login?returnUrl=/admin/workers/delete-history`; 403 → render `"Bạn không có quyền xem lịch sử xóa người lao động."`. | `CHOSEN` |

### 4.1 Build vs Adopt

| Capability | Existing options | Decision | Reason |
|---|---|---|---|
| Audit log read API | None exists; rely on `prisma.auditLog.findMany` + existing `withAuthorizedDbReadOnly` | `N/A` | No new dependency; reuse existing helper. |
| Toast/confirm | Inline banner `<div>` + `setTimeout` (vanilla) | `N/A` | No dependency; small UX. |
| Font guard | Static text scan | `N/A` | Reuse vitest pattern from `operator-terminology.static.test.ts`. |

### 4.2 Build vs Automate

`N/A` — no connector, scheduler, worker, or multi-system workflow.

## 5. Contract

### 5.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Worker delete success: hiển thị toast/banner inline tiếng Việt với fullName + userId; auto-redirect `/admin/workers` sau 2.5s; không reload. |
| `RQ-02` | Route `/admin/workers/delete-history`: page server-side, pagination (`take`, `skip`), filter `?from=YYYY-MM-DD` & `?to=YYYY-MM-DD` & `?search=…` (match `actor.name`, `reason`, `before.fullName`, `before.userId`). Mask `before.fullName`/`before.userId` per `canSeeSensitive`. 401 redirect login; 403 nếu không phải ADMIN/HR_MANAGER/DIRECTOR. |
| `RQ-03` | API `GET /api/admin/worker-delete-history`: JSON trả `{items, total, take, skip}`. Items có `{auditId, deletedAt, actorId, actorRole, actorName, reason, before: {id, userId, fullName, createdAt}}`. 401/403 theo JSON. |
| `RQ-04` | Worker list page (`/admin/workers`): thêm cột `Dự án/Job đang làm`, `Ngày làm đầu tiên`, `Quản lý dự án`, `Người hưởng hoa hồng`. Drop cột `Thao tác` + cell `Xem`. Row click `router.push('/admin/workers/[id]')`. |
| `RQ-05` | LaborProfile list page (`/admin/labor-profiles`): thêm cột `Job/đơn gần nhất`, `Số đơn`, `Người phụ trách`, `Nguồn tiếp nhận`. Không thêm CCCD. Không tạo nhiều row/profile. Mask PII theo permission hiện hữu. |
| `RQ-06` | Subhead copy: `/admin/workers` = `"Quản lý thông tin và trạng thái người lao động."`; `/admin/vendors` = `"Quản lý thông tin, liên hệ và trạng thái nhà cung cấp."`. Bỏ `Phân hệ M*`/`Phân hệ M5`/`Phân hệ M7`. |
| `RQ-07` | Static font guard: `app/admin/__tests__/admin-bvp-font.static.test.ts` enforce (i) không có inline `font-family` trong `app/admin/**` trừ CSS Module scoped; (ii) `app/layout.tsx` vẫn bind `beVietnamPro.variable` + `inter.variable`; (iii) `app/fonts/local-fonts.tsx` declare `variable: '--font-bvp'` + `variable: '--font-inter'`. |
| `RQ-08` | `/admin/media` responsive: padding/margin responsive 360/768/1024/1440px; grid không tràn; folder sidebar full-width `<md`; pagination full-width. |

### 5.2 Scope boundaries

- **In:** `app/admin/workers/**`, `app/admin/labor-profiles/**`, `app/admin/vendors/page.tsx`, `app/admin/media/**`, `app/api/admin/worker-delete-history/route.ts` (NEW), `src/domains/talent/labor-profile.read-service.ts` (extend `LaborProfileListDto`), `app/admin/__tests__/admin-bvp-font.static.test.ts` (NEW), this task `TASK.md` + `HANDOFF.md`.
- **Out:** schema/migrations; `app/api/workers/[id]/route.ts` DELETE behavior (giữ nguyên service + status code); public site font; `app/admin/workers/[id]/page.tsx` (T1B lock); `app/admin/layout.tsx` (giữ nguyên structure).
- **Allowed task artifacts:** `docs/tasks/hrp-admin-ux-hotfix-2/{TASK.md,HANDOFF.md}`.

### 5.3 Domain boundaries

- **Data/state:** KHÔNG migration. KHÔNG đổi shape enum/role. Tất cả cột mới lấy từ quan hệ chuẩn (`Worker.assignments`/`Worker.episodes`/`Project.pmUser`/`CommissionLedger.ctvId`/`LaborProfile.intakes`/`LaborProfile.placementCases`/`LaborProfile.handlingAssignments`). Placeholder `"—"` khi null. KHÔNG suy diễn ngày làm từ `Worker.createdAt`. KHÔNG suy diễn beneficiary từ `Worker.assignedToId`.
- **Permission/security:** `/admin/workers/delete-history` chỉ ADMIN/HR_MANAGER/DIRECTOR. Mask `actorName`/'before.fullName'/`before.userId`/`reason` không mask (reason là free-text audit). Audit-log entries KHÔNG bao giờ lộ CCCD/CCCDImageUrl/SelfieImageUrl (đã không có trong `before` snapshot).
- **Interface/API:** `GET /api/admin/worker-delete-history?take=&skip=&from=&to=&search=` → `{items, total, take, skip}`. Không thêm field PII mới.
- **Migration/rollback:** N/A — không migration. Rollback = revert commit branch.

## 6. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `app/admin/workers/__tests__/worker-list-columns.static.test.ts` (NEW) | Static fence: lock 4 cột mới + drop `Xem`/`Thao tác` + new copy subhead. | New test passes + `npm run test:unit` | Would change DB |
| `STEP-02` | `app/api/workers/route.ts` + `src/shared/auth/worker-projection.ts` | Extend API select + DTO 4 trường cols; project cẩn thận. | Targeted vitest | Out-of-scope DB join |
| `STEP-03` | `app/admin/workers/page.tsx` | Render 4 cột; drop cột Thao tác + cell Xem; subhead đổi copy. | Static test + manual | Would introduce `RowLink` (existing `onClick` đủ) |
| `STEP-04` | `app/admin/workers/[id]/worker-delete-button.tsx` | Toast/banner sau DELETE 2.5s trước redirect; `router.push` thay `window.location.href`. | Static test | Would block delete UX |
| `STEP-05` | `app/api/admin/worker-delete-history/route.ts` (NEW) | Read `auditLog` filtered `entityType=Worker & action=WORKER_PERMANENT_DELETE`; auth + projection + pagination. | Targeted vitest | Auth boundary fail |
| `STEP-06` | `app/admin/workers/delete-history/page.tsx` (NEW) | Server component render bảng phân trang/lọc + mask PII. | Manual review + static test | 403 path |
| `STEP-07` | `src/domains/talent/labor-profile.read-service.ts` | Extend `LaborProfileListDto` với 4 trường + lookup joins trong cùng `withDbContext`. | Targeted vitest | Worker relation in scope of `Worker` ownership (use `Worker.assignments`); KHÔNG mở rộng ngoài |
| `STEP-08` | `app/admin/labor-profiles/page.tsx` | Render 4 cột mới (không CCCD); giữ RowLink. | Static test | New row per profile |
| `STEP-09` | `app/admin/vendors/page.tsx` | Subhead đổi copy theo RQ-06. | Static test | Remove table col |
| `STEP-10` | `app/admin/__tests__/admin-bvp-font.static.test.ts` (NEW) | Font guard: không override font-family trong admin; public site không đổi. | New test pass | Collision với hiện trạng |
| `STEP-11` | `app/admin/media/page.tsx` + `app/admin/media/media-library-client.tsx` | Responsive padding/grid/sidebar/pagination. | Manual + targeted | Out-of-scope feature |
| `STEP-12` | All changed surface | Run canonical gates; diff review; commit. | All gates | Any blocker |
| `STEP-13` | `docs/tasks/hrp-admin-ux-hotfix-2/HANDOFF.md` | Pin SHAs + frozen delivery. | verify-handoff.ps1 | None |

## 7. Acceptance

### 7.1 Acceptance criteria

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Worker delete hiển thị toast inline tiếng Việt có `fullName + userId`; auto-redirect sau 2.5s. | `app/admin/workers/__tests__/worker-delete-toast.static.test.ts` (NEW) |
| `AC-02` | Route `/admin/workers/delete-history` + API `/api/admin/worker-delete-history` hoạt động; 401/403/200 đúng theo role; pagination/filter/search hoạt động; mask PII. | Targeted vitest + manual UI |
| `AC-03` | Worker list bảng có 4 cột mới với data từ quan hệ chuẩn; placeholder `"—"` khi null; KHÔNG suy diễn từ `createdAt`/`assignedToId`. | Static test `worker-list-columns.static.test.ts` + manual |
| `AC-04` | Worker list KHÔNG còn `<th>Thao tác</th>` và `<Link>Xem</Link>`. Row click mở detail. | Static test + manual |
| `AC-05` | LaborProfile list bảng có 4 cột mới (không CCCD); 1 row/profile. | Static test `labor-profile-list-columns.static.test.ts` (NEW) + manual |
| `AC-06` | Subhead copy workers + vendors đổi đúng theo RQ-06; KHÔNG còn `Phân hệ M*`/`M5`/`M7`. | Static test sweep |
| `AC-07` | Font admin guard: không có inline font-family override trong `app/admin/**`; layout vẫn bind BVP/Inter; local-fonts vẫn declare 2 variables. | `admin-bvp-font.static.test.ts` |
| `AC-08` | `/admin/media` responsive 360/768/1024/1440px: không tràn ngang; sidebar collapse `<md`; grid columns 1/2/3/4 đúng breakpoint; pagination full-width. | Manual review + targeted |
| `AC-09` | Gates pass: `npx --no-install prisma validate`, `npm run test:unit`, `npm run typecheck`, `npm run lint`, `npm run build`, `node .ai-pipeline/scripts/verify-encoding.mjs`, `git diff --check`. | Each gate exit 0 |
| `AC-10` | Diff scope: chỉ chạm rễ in-scope §0; không file forbidden (schema/migrations/auth/RLS/font assets). | `git diff --stat` review |

### 7.2 Traceability

| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-04` | `AC-01` |
| `RQ-02` | `STEP-05`, `STEP-06` | `AC-02` |
| `RQ-03` | `STEP-05`, `STEP-06` | `AC-02` |
| `RQ-04` | `STEP-01`, `STEP-02`, `STEP-03` | `AC-03`, `AC-04` |
| `RQ-05` | `STEP-07`, `STEP-08` | `AC-05` |
| `RQ-06` | `STEP-03`, `STEP-09` | `AC-06` |
| `RQ-07` | `STEP-10` | `AC-07` |
| `RQ-08` | `STEP-11` | `AC-08` |

## 8. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Worker.episodes rỗng → cột "Ngày làm đầu tiên" = "—" đồng nhất (không suy diễn từ `Worker.createdAt`). | DEC-09; rollback = revert commit |
| `RISK-02` | Join `User.name` qua `CommissionLedger.ctvId` (CTV table không có FK string) có thể ra null cho orphan ctvId. | Render `"—"`. |
| `RISK-03` | Delete history API có thể bị brute-force nếu 401 không áp dụng cho HR_STAFF/PM. | DEC-02/DEC-11 chỉ ADMIN/HR_MANAGER/DIRECTOR. |
| `RISK-04` | Thêm cột mới làm bảng rộng → tràn ngang trên màn hình nhỏ. | `<div className="overflow-x-auto">` đã có; col widths thu gọn. |
| `RISK-05` | Worker API projection list cũ dùng `projectWorkerList` cho 26-field; thêm 4 cột dẫn đến API DTO nở. | Thêm DB select + render riêng, KHÔNG qua `projectWorkerList` allowlist (ghi nhận: cột mới = "currentJobName"/"firstEpisodeStartedAt"/"pmName"/"commissionBeneficiaryName" — KHÔNG phải field Worker nhạy cảm). |

## 9. Open Questions

NONE — Owner directive (1..6) đã rõ.

## 10. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| `1` | Sửa theo T0 directive §1..§6; lock 4 cột Worker + 4 cột LaborProfile + delete history + copy sweep + font guard + media responsive. | T0 đã rõ; KHÔNG cần hỏi lại. |

## 11. Revision Log

| Spec version | Date | Author | Change | Reason |
|---|---|---|---|---|
| `v1.0` | `2026-10-07` | Tier 1 (T1C) | Initial TASK. Status `READY_FOR_EXECUTION`. | T0 directive vòng HRP Admin UX hotfix (post-PR-#116). |