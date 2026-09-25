# P1-C/P1-D Residual & P1-E Simple Recruiter Workbench — Reconciliation

**Pipeline V2 — Discovery / Realignment**

| Field | Value |
| --- | --- |
| Doc type | `discovery/realignment` |
| Status | `PROPOSED_ONLY` |
| Delivery protocol | `V2_FAST_FREEZE` |
| Correction budget (this doc) | `1` |
| Baseline (origin/main @ planning pin) | `8c8e0446b0f6d8750de2e9d42a1a25b4fb431e7b` |
| Worktree | `C:\CodeApp\HrP-worktrees\t1a-p1e-recruiter-workbench-planning` |
| Branch | `codex/t1a-p1e-recruiter-workbench-planning` |
| Owner of this doc | T1A (independent) |
| Next gate | `WAIT_P1_B_ACCEPTED` for P1-E0; `WAIT_P1_E0_INTERFACE_FREEZE` for P1-E1 |

## 0. Mục đích & phạm vi

Tài liệu này **reconcile** trạng thái thật của:

- **P1-C — LaborProfile create-or-match** (identity resolution + canonical DB helper `hrp_score_labor_profile`).
- **P1-D — PlacementCase** (state lifecycle + handler/nextAction/age/overdue + HandlingAssignment liên quan).

và **lập capability matrix** cho surface mới:

- **P1-E — Simple Recruiter Workbench**, được tách thành:
  - **P1-E0 — Backend / Read-model contract** (đọc danh sách + named commands), xem `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/TASK.md`.
  - **P1-E1 — UI contract** (table/list), xem `docs/tasks/hrp-p1-e1-recruiter-workbench-ui/TASK.md`.

Ngoài phạm vi (đã có task riêng hoặc đã frozen):

- **P1-A0** JobPosting authoring/publish — `ACCEPTED` trên main.
- **P1-A1** Canonical public job detail & continuous cutover — `ACCEPTED` trên main.
- **P1-B** Public apply with candidate intake & provenance — `READY_FOR_EXECUTION` tại `f640c0829fb5b01a67cb29487bce117c120f85a8` (chưa `ACCEPTED`).
- **P1-F** Placement conversions & formal placement — task mới, **CHƯA** được khởi tạo trong round này.
- Notification/n8n — **TASK RIÊNG**, không dùng tên canonical P1-D; xem `docs/N8N_AUTOMATION_BOUNDARY.md`.

Tài liệu này **không** sửa `docs/PLANNER_HANDOVER.md` (T0 sở hữu) và **không** tạo PR.

## 1. Canonical naming (từ `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §23–§30)

| Canonical ID | Tên | Vai trò |
| --- | --- | --- |
| P1-A0 | JobPosting authoring/publish | Đã `ACCEPTED` |
| P1-A1 | Canonical public job detail + continuous cutover | Đã `ACCEPTED` |
| P1-B | Public apply with candidate intake & provenance | Approved v1.3 tại `f640c08` — **chưa `ACCEPTED`** |
| **P1-C** | **LaborProfile create-or-match** (identity resolution) | **Reconcile trong doc này** |
| **P1-D** | **PlacementCase** (state lifecycle) | **Reconcile trong doc này** |
| **P1-E** | **Simple Recruiter Workbench** (E0 read-model + E1 UI) | **Contract hóa trong doc này** |
| P1-F | Placement (SELECTED→CONFIRMED→EFFECTIVE/FAILED/CANCELLED) | Đặt ngoài scope; sẽ là task mới |

Các tên provisional cũ **bị cấm**:

- “P1-C CRM review” → dùng canonical **P1-C = LaborProfile create-or-match**.
- “P1-D notification” → dùng task riêng **N-series** (notification/n8n) — **P1-D là PlacementCase**.

## 2. Capability matrix

Phân loại sử dụng các tag:

- `IMPLEMENTED` — code đã ở trên `origin/main`, không cần sửa để dùng.
- `PARTIAL` — code một phần ở main, còn lại phải bổ sung trong task mới (P1-B sau khi ACCEPTED, hoặc task E0/E1).
- `MISSING` — chưa có trên main, cần task mới (xác định rõ task nào).
- `REFERENCE_ONLY` — chỉ là tài liệu/decision log, không phải implementation.
- `OUT_OF_SCOPE` — thuộc task khác (P1-F, notification/n8n, AFF-05A R3+, v.v.).

### 2.1 P1-C — LaborProfile create-or-match

| Capability | Tag | Bằng chứng / vị trí | Ghi chú |
| --- | --- | --- | --- |
| Canonical model `LaborProfile` (id, fullName, phone, cccdNumber, identityVerification, completeness, workerId, ...) | `IMPLEMENTED` | `prisma/schema.prisma` model `LaborProfile`; migration `20260908150000_v6_phase1a_labor_profile_schema` | Đã RLS (`20260908150001_v6_phase1a_labor_profile_rls`). |
| Canonical enum `IdentityVerification` (`UNVERIFIED`/`PENDING`/`VERIFIED`/...) | `IMPLEMENTED` | `prisma/schema.prisma` | — |
| Canonical enum `LaborProfileCompleteness` (`MINIMAL`/`BASIC`/`FULL`) | `IMPLEMENTED` | `prisma/schema.prisma` | — |
| Identity resolution core `scoreAndClassify` (≥2 signals → `EXACT_MATCH`, 1 signal hoặc conflict → `POSSIBLE_MATCH`, 0 → `NEW_PROFILE`) | `IMPLEMENTED` | `src/domains/talent/labor-profile.service.ts` (`scoreAndClassify`) | Là logic quyết định classification, **fail-closed** cho uncertain. |
| Canonical DB helper `hrp_score_labor_profile` (RPC, owner-isolated) | `PARTIAL` | Plan §23 định nghĩa; một số call-site tham chiếu; chưa chốt cột trả về cuối cùng | Cần **freeze shape** trong P1-B (sau khi ACCEPTED) hoặc task phụ trợ; xem §3.1. |
| Không auto-merge uncertain identity | `IMPLEMENTED` (policy) | `scoreAndClassify` + handler `createOrMatchLaborProfile` chỉ merge khi `EXACT_MATCH` | Tài liệu hóa rõ trong TASK để khỏi regress. |
| Identity resolution từ intake (candidate_intake) | `IMPLEMENTED` | AFF-03B public_intake_rpc; W5/AFF-05A | Đã chạy trên main. |
| Identity resolution từ submission (candidate_submissions) | `IMPLEMENTED` | `src/domains/applications/conversion.service.ts` `convertApplication` | Dùng cho conversion path. |
| List/filter LaborProfile cho admin | `IMPLEMENTED` | `src/domains/talent/labor-profile.read-service.ts`; `app/admin/labor-profiles/page.tsx` | Có RLS + masking (`maskPhone`, `maskCccd`). |
| Backfill LaborProfile từ WorkerProfile cũ | `IMPLEMENTED` | `prisma/migrations/20260921140000_aff03c_cs_labor_profile_backfill` | Đã chạy. |
| Worker link cập nhật theo propagation rules | `IMPLEMENTED` | AFF-04 conversion propagation migration + `conversion.service.ts` `resolveCanonicalReferrer` | Đã chạy. |
| RLS LaborProfile (read/write policy cho các role) | `IMPLEMENTED` | `prisma/migrations/20260908150001_v6_phase1a_labor_profile_rls` | Tái sử dụng cho E0. |
| **`P1-B` shape cuối cùng cho `hrp_score_labor_profile`** (cột trả về, idempotency, fail-closed behavior trên intake RPC) | `MISSING` (chờ P1-B ACCEPTED) | P1-B TASK.md §5–§6 | Approved design — implementation pending — chưa merge vào main. |

### 2.2 P1-D — PlacementCase

| Capability | Tag | Bằng chứng / vị trí | Ghi chú |
| --- | --- | --- | --- |
| Model `PlacementCase` (`id`, `laborProfileId`, `status`, `openedAt`, `closedAt`, `closeReason`) | `IMPLEMENTED` | `prisma/schema.prisma`; migration `20260912140411_n1_placement_case_foundation` | — |
| Canonical enum `PlacementCaseStatus` (`OPEN`/`IN_PROGRESS`/`READY_TO_PLACE`/`CLOSED`) | `IMPLEMENTED` | `prisma/schema.prisma` | Stage enum (NEW/CONTACTING/...) deferred — đã ghi trong comment schema. |
| Max 1 active case / LaborProfile (partial unique index) | `IMPLEMENTED` | `prisma/migrations/20260912140411_n1_placement_case_foundation` (`placement_case_labor_profile_id_active_unique`, `WHERE status IN ('OPEN','IN_PROGRESS','READY_TO_PLACE')`) | Comment trong schema trùng tên. |
| `openPlacementCase` service với PL/pgSQL exception-block subtransaction | `IMPLEMENTED` | `src/domains/talent/placement-case.service.ts` | Trả `OPEN` + idempotency qua submission tie-breaker. |
| RLS PlacementCase (admin/reviewer) | `IMPLEMENTED` | `prisma/migrations/20260912140412_n1_placement_case_rls` | Tái sử dụng cho E0/E1. |
| Submission ↔ PlacementCase FK (nullable, ON DELETE RESTRICT) | `IMPLEMENTED` | `20260912140411_n1_placement_case_foundation` | `placement_case_id` column trên `candidate_submissions`. |
| Back-relation `placements` từ PlacementCase | `IMPLEMENTED` | `prisma/schema.prisma`; migration `20260914212136_n3_service_model_placement` | Chuẩn bị cho P1-F. |
| `LaborProfileHandlingAssignment` (assignee/source/startsAt/expiresAt) | `IMPLEMENTED` | `prisma/migrations/20260918000000_aff05a_labor_profile_handling_assignment`; `20260922100000_w5_handling_assignment_safety`; `20260922160000_aff05a_r1_initial_handling_window` | W5 + AFF-05A R1 đã merge. |
| Handler/current work context — `activeAssignment` trên detail | `IMPLEMENTED` (read path) | `labor-profile.read-service.ts` `getLaborProfileDetail` → `activeHandlingAssignment` | Read-only DTO; **chưa có** field tương đương ở **workbench list**. |
| `getLaborProfileDetail` include `placementCases` summary | `IMPLEMENTED` | `labor-profile.read-service.ts` | Chỉ là detail — không phải list read-model. |
| **Canonical `nextAction` derivation** (server-side, stable) | `MISSING` | — | Cần ký hợp đồng rõ trong P1-E0 §3.2; **không** tính ở client. |
| **Age/overdue derivation** (server-side, dựa trên `openedAt` + handling window) | `MISSING` | — | Cần ký hợp đồng rõ trong P1-E0 §3.3; client chỉ render. |
| **`Recent interactions` cho từng case** (lastApplicationEvent / last note) | `MISSING` | — | Là một phần của read-model P1-E0; **không tự ý** thêm cột — chỉ join các bảng đã có. |
| **Placement transition commands** (`SELECTED`→`CONFIRMED`→`EFFECTIVE`/`FAILED`/`CANCELLED`) | `OUT_OF_SCOPE` | `prisma/schema.prisma` `PlacementStatus` enum | Thuộc **P1-F**; E0 chỉ expose placeholder action (read-only), không mở transition. |
| Notification/reminder trên `IN_PROGRESS` quá hạn | `OUT_OF_SCOPE` | — | Thuộc task riêng (n8n-boundary); **không** dùng tên P1-D. |
| **Reviewer filter theo handling assignment + handler derivation cho workbench** | `MISSING` | — | Phần lõi của P1-E0 §3.4 — phải chờ P1-B ACCEPTED. |

### 2.3 HandlingAssignment / W5 / AFF-05A — mức sẵn sàng

| Capability | Tag | Bằng chứng / vị trí | Ghi chú |
| --- | --- | --- | --- |
| AFF-05A R1 — initial handling window | `IMPLEMENTED` | `20260922160000_aff05a_r1_initial_handling_window` | Đã merge. |
| W5 — handling assignment safety (RR + closed-window) | `IMPLEMENTED` | `20260922100000_w5_handling_assignment_safety` | Đã merge. |
| AFF-05A R2 — bounded manager assignment | `IMPLEMENTED` | `20260924170000_aff05a_r2_bounded_manager_assignment` | Đã merge. |
| AFF-05A R3 — UI/workbench surface | `MISSING` | — | Là phần của P1-E0/E1. |

### 2.4 P1-E — Simple Recruiter Workbench surface (read-model)

| Capability | Tag | Ghi chú |
| --- | --- | --- |
| Canonical endpoint `/api/admin/recruiter-workbench` (list) | `MISSING` | Định nghĩa trong P1-E0 §4. |
| Canonical DTO `RecruiterWorkbenchRow` (candidate + case + last interaction + nextAction + handler + age/overdue + primary actions) | `MISSING` | P1-E0 §3. |
| Filter: `caseStatus`, `handler`, `overdue`, `view` (NEW/MINE/ALL) | `MISSING` | P1-E0 §3.1, §3.5. |
| Pagination/sort (URL sync) | `MISSING` | P1-E0 §3.6. |
| RLS boundary (admin/reviewer, Org) | `MISSING` (read service) — `IMPLEMENTED` (DB-level RLS) | P1-E0 §5. |
| No-leak behavior (mask PII ngoài allowlist) | `MISSING` | P1-E0 §5.3. |
| Named canonical commands cho action | `MISSING` | P1-E0 §6 (`navigateToDetail`, `navigateToSubmission`, ...). |
| Server-derived `nextAction` (deterministic) | `MISSING` | P1-E0 §3.2. |
| Server-derived `age` / `overdue` | `MISSING` | P1-E0 §3.3. |
| UI workbench list/table | `MISSING` | P1-E1 §3. |

## 3. P1-C / P1-D — Residual thật sự trước P1-E

Dựa trên capability matrix §2.1–§2.2 và code đang ở `origin/main`, **residual thật sự** trước P1-E gồm:

1. **P1-C**:
   - **(R-C1)** Freeze shape cuối của `hrp_score_labor_profile` (RPC, idempotency, fail-closed semantics trên intake) — phụ thuộc P1-B ACCEPTED (xem `docs/tasks/hrp-p1-b-public-apply/TASK.md` §5–§6 tại `f640c08`). E0 chỉ đọc; **không** tự ý freeze helper này.
   - **(R-C2)** Tài liệu hóa chính sách “không auto-merge uncertain” trong TASK E0/E1 — đã là policy nhưng cần ghi rõ để không regress.
2. **P1-D**:
   - **(R-D1)** Định nghĩa **server-side, deterministic** `nextAction` derivation (`serverDerivedNextAction`) cho mỗi row workbench (xem P1-E0 §3.2). Client **không** suy diễn.
   - **(R-D2)** Định nghĩa server-side `age` (đã mở) / `overdue` (so với handling window) cho row workbench (xem P1-E0 §3.3).
   - **(R-D3)** Xác định read-model **bao gồm `lastInteraction`**: chỉ join các bảng đã có (`candidate_submissions`, `application_status_history`, `placement_case`); **không** thêm cột DB mới ở round này.
   - **(R-D4)** Handler derivation cho workbench: derive từ `LaborProfileHandlingAssignment` ACTIVE (ưu tiên) → fallback theo “current reviewer on case” (nếu có) → fallback `UNASSIGNED`. Phải là server-side (xem P1-E0 §3.4).
   - **(R-D5)** Filter/UI cho reviewer chỉ thấy case mình handle (theo Org boundary + assignment). Ký hợp đồng rõ trong P1-E0 §5.1, §5.2; UI ở P1-E1 §4.2.
   - **(R-D6)** Mở rộng masking cho danh sách (giống `labor-profile.read-service.ts`): phone/cccdNumber chỉ hiện khi `CAN_VIEW_WORKER_SENSITIVE`. Tái sử dụng `maskPhone`/`maskCccd` (xem P1-E0 §5.3).
   - **(R-D7)** **Không** thêm `currentHandler`/`nextAction`/`overdueAt` column vào `PlacementCase` ở round này. Nếu cần persistent state, sẽ mở round sau với gate riêng.
3. **P1-B gating**:
   - **(R-B0)** Toàn bộ E0 implementation chỉ chạy sau khi P1-B `ACCEPTED`. E0 đang ở `WAIT_P1_B_ACCEPTED`.

## 4. P1-E — Capability target & scope guard

### 4.1 Outcome tối thiểu (P1-E0 + P1-E1)

Recruiter (admin/reviewer thuộc Org) có một danh sách xử lý ứng viên gồm:

- **Candidate**: fullName (mask nếu cần), phone (mask nếu cần), identityVerification, completeness.
- **Current stage/status**: `PlacementCase.status` (`OPEN`/`IN_PROGRESS`/`READY_TO_PLACE`/`CLOSED`) + last `applicationStatus` (nếu có).
- **Job/context**: JobPosting title, project/company denorm, opened/closed dates của JobOpening.
- **Last interaction**: timestamp + loại event gần nhất (join các bảng đã có).
- **Next action**: server-derived, deterministic; client chỉ render label/icon.
- **Handler**: assigneeUserId + assigneeName (nếu có).
- **Age/overdue**: server-derived.
- **Primary actions**: link canonical (detail/submission/conversion/...) — không mutation.

### 4.2 Khóa kỹ thuật (carry sang TASK E0/E1)

- Canonical source: `placement_case`, `labor_profile`, `labor_profile_handling_assignment`, `candidate_submissions`, `application_status_history`, `job_posting`, `job_opening`.
- Projection shape do server quyết định — client **chỉ render**.
- Pagination/filter/sort: URL sync, sử dụng `use-table-url-state.ts` (xem `src/shared/ui/data-table/`) và `DataTable` wrapper.
- RLS: `tx` với RLS context; tái sử dụng `resolveEffectivePermissions` từ `src/shared/auth/permission-resolver`.
- Org boundary: filter theo `ctx.orgId` (nếu role yêu cầu). Mặc định admin/reviewer thuộc Org.
- No-leak: chỉ trả field trong `RecruiterWorkbenchRow` DTO; phone/cccdNumber mask theo permission.
- NextAction: deterministic, server-derived, enum đóng (xem P1-E0 §3.2).
- Handler derivation: server-side (xem P1-E0 §3.4).
- Age/overdue: server-side (xem P1-E0 §3.3).
- Query consistency: `tx` Prisma + count + findMany chạy trong cùng RLS context.
- Named commands cho action: chỉ là link canonical; **không** gọi mutation trực tiếp từ UI.
- **Cấm**:
  - Tạo Kanban-specific status mới.
  - Mở transition `Placement` (thuộc P1-F).
  - Sửa canonical `PlacementCaseStatus` enum.
  - Thêm DB column mới cho workbench.
  - Tự xây data-grid / form / query cache.
  - Cài package mới trong round documentation.
  - `contentEditable` / rich-text editor.

### 4.3 Library-first / BUILD_VS_ADOPT

Đã khảo sát trên main (xem P1-E0 §7 / P1-E1 §6):

- **Reuse (ưu tiên 1)**: `DataTable` (`src/shared/ui/data-table/data-table.tsx`), `use-table-url-state.ts`, `EmptyState` (`src/shared/ui/data-display/empty-state.tsx`), `maskPhone`/`maskCccd` (`src/shared/privacy/mask.ts`), `resolveEffectivePermissions` (`src/shared/auth/permission-resolver.ts`), `AuthContext` (`src/shared/auth/auth-context.ts`), Prisma `tx` RLS pattern từ `labor-profile.read-service.ts`.
- **Adopt (ưu tiên 2)**: shadcn/Radix đã cài (`Button`, `Input`, `Select`, `Badge`, ...) — dùng cho filter chips / facet; TanStack Table đã wire qua `DataTable`.
- **Đề xuất mới (ưu tiên 3 — chỉ khi có capability gap thật)**: **không có** ở round documentation. Nếu sau khi E0 freeze cần thêm (ví dụ date-range picker), sẽ mở round riêng.

### 4.4 BUILD_VS_AUTOMATE (N8N boundary)

| Aspect | Owner | Lý do |
| --- | --- | --- |
| Read / list workbench | **HRP runtime** (Node.js + Prisma + RLS) | Cần RLS, PII masking, deterministic projection. n8n không giữ auth/RLS. |
| Navigate to detail/submission | **HRP runtime** (route canonical) | Stable, không qua workflow. |
| Mutation (sau này) | **HRP runtime** (canonical command) | Khi P1-E có action thật (không thuộc round này). |
| Notification / reminder / distribution | **Task riêng** (outbox → narrow HRP API → n8n workflow) | xem `docs/N8N_AUTOMATION_BOUNDARY.md`. **KHÔNG** dùng tên P1-D. |

Quy tắc cứng:

- n8n không direct DB write.
- n8n không giữ authorization/RLS/state/idempotency authority.
- Không export PII mặc định ra khỏi HRP.
- P1-E core read/action **không phụ thuộc** n8n availability.
- **Không triển khai workflow n8n** trong round documentation này.

## 5. Open Owner decisions

Theo nguyên tắc: chỉ ghi `OWNER_DECISION_REQUIRED` khi lựa chọn **thay đổi business behavior thật**. Các câu hỏi kỹ thuật routine đã được xử lý trong doc này / TASK E0 / TASK E1.

| ID | Câu hỏi | Options | Impact | Recommendation | Default-safe |
| --- | --- | --- | --- | --- | --- |
| `OWNER_DECISION_REQUIRED` | None | — | — | — | — |

Lý do: không có quyết định Owner nào bắt buộc để freeze E0/E1 contracts trong round này. Mọi quyết định còn lại (filter mặc định, sort mặc định, label tiếng Việt cho `nextAction`,...) đã được ghi nhận là default-safe trong TASK E0 §3.5–§3.6 và TASK E1 §3–§4.

## 6. Execution order (đề xuất)

1. **P1-B ACCEPTED** trên main (gate bắt buộc).
2. **P1-E0** implementation → **interface freeze** (DTO, filter, sort, nextAction, handler, age/overdue).
3. **P1-E1** UI implementation (consume đúng E0 frozen).
4. **P1-F** Placement contract + implementation (tách task).

Trong round này: chỉ dừng ở bước (1a) — viết doc, chưa triển khai E0/E1.

## 7. File allowlist (sẽ carry sang TASK)

> Tài liệu này **không** sửa code. File allowlist dự kiến cho **E0** và **E1** được định nghĩa chính thức trong `docs/tasks/hrp-p1-e0-recruiter-workbench-read-model/TASK.md` §10 và `docs/tasks/hrp-p1-e1-recruiter-workbench-ui/TASK.md` §9.

**Không overlap** với:

- P1-B worktree/implementation (đang chạy song song ở worktree khác).
- File frozen của P1-A0/A1.
- Migration của AFF (`prisma/migrations/**`).
- Prisma schema / `package.json` / lockfile nếu reconciliation chưa chứng minh cần (chưa cần ở round này).
- `docs/PLANNER_HANDOVER.md`.

## 8. Verification (cho doc này)

- `git diff --check` → không cảnh báo.
- UTF-8 strict, no BOM.
- LF only.
- U+FFFD = 0.
- Mojibake = 0.
- Scope guard: doc này nằm trong đúng 3 files docs (xem commit message và report cuối).

## 9. Tóm tắt

- **P1-C** đã `IMPLEMENTED` đến mức `EXACT_MATCH`/`POSSIBLE_MATCH` fail-closed/`NEW_PROFILE` + masking + RLS. Residual duy nhất là freeze shape cuối của `hrp_score_labor_profile` — **phụ thuộc P1-B ACCEPTED**.
- **P1-D** đã `IMPLEMENTED` về model, enum, partial unique index, RLS, `openPlacementCase`. Residual là: server-derived `nextAction`, `age/overdue`, handler derivation cho list, filter theo assignment, masking cho list, lastInteraction join — **không thêm DB column mới**.
- **P1-E** contract hóa trong E0 (read-model) + E1 (UI), không Kanban, không mutation trực tiếp, không tự suy diễn ở client, library-first trên primitives đã có.
- **Không code / không cài package / không migration / không PR** trong round này.
- **Open Owner decisions: None.**

---

*Tài liệu này thuộc vòng planning/reconciliation documentation-only. Implementation sẽ chờ `WAIT_P1_B_ACCEPTED`.*
