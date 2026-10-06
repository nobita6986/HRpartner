# TASK — hrp-t1b-pre-p2-intake-worker-separation

## 0. Control

| Field | Value |
|-------|-------|
| Task slug | `hrp-t1b-pre-p2-intake-worker-separation` |
| Work type | `FAST_HOTFIX` (UI/API tightening; no schema; no migration; no Tier 3) |
| Audit mode | `NONE` (Tier 1 self-review; directive explicitly disables Tier 3 / AUDIT.md) |
| Spec version | `v1.0` |
| Status | `READY_TO_CODE` |
| Baseline | `origin/main @ bbdbe94862dc58c9ec97c3f1627a43d9c0e8ab0b` (PR #107 merged; `LaborProfile.workerId` schema is in place) |
| Worktree | `C:\CodeApp\HrP-t1b-pre-p2-intake-worker-separation` |
| Branch | `codex/t1b-pre-p2-intake-worker-separation` |
| Updated | 2026-10-06 08:20 UTC+7 |
| Nguồn quyết định | T0 directive `T0 → T1B — PRE-P2 HOTFIX: TÁCH HỒ SƠ TIẾP NHẬN / NGƯỜI LAO ĐỘNG` (issued by Tier 0) |

## 1. Outcome

Tách rõ hai mặt của workforce ingestion trong admin portal:

1. `/admin/labor-profiles` mặc định chỉ liệt kê **Hồ sơ tiếp nhận** — tức `LaborProfile` chưa liên kết `Worker` (`workerId IS NULL`). Profiles đã chuyển đổi không còn xuất hiện trong intake list.
2. `/admin/workers` chỉ liệt kê **Người lao động** — `Worker` rows thuần (đã có sẵn; giữ nguyên cấu trúc).
3. **LaborProfile edit UI/API thật sự** với role matrix chuẩn:
   - `ADMIN`, `HR_MANAGER`: đọc + sửa.
   - `HR_STAFF`: chỉ đọc.
   - `PATCH /api/admin/labor-profiles/[id]` chấp nhận `fullName`, `phone`, `cccdNumber`; tự chuẩn hoá `normalizedPhone`; tự tính lại `completeness`.
   - `workerId` KHÔNG được nhận từ client — đường duy nhất set `workerId` vẫn là conversion flow từ PR #107.
   - Profile đã `workerId != null` → `409 LABOR_PROFILE_ALREADY_LINKED` (fail-closed; UI hiển thị banner read-only + link sang danh sách Worker).
4. Trang chi tiết LaborProfile vẫn truy cập được qua deep-link; nếu đã chuyển đổi thì read-only với banner "Đã chuyển thành người lao động".
5. Modal thêm/sửa ở `/admin/workers` không được render raw comment `// T0 T1B …` vào DOM nữa.
6. Anti-regression tests cho: list separation, role matrix, PATCH 409, modal không leak comment, banner presence, 4 filter chips canonical.

## 2. Scope (allowlist)

Được phép chỉnh (chỉ những file này):

- `app/admin/labor-profiles/page.tsx` (filter chips, bỏ cột Worker link)
- `app/admin/labor-profiles/[id]/page.tsx` (read-only banner + edit form mount)
- `app/admin/labor-profiles/[id]/labor-profile-edit-form.tsx` (component mới, client; modal/edit)
- `app/api/admin/labor-profiles/[id]/route.ts` (thêm `PATCH`)
- `app/admin/workers/page.tsx` (sửa comment rendering trong modal `<h2>`)
- `src/domains/talent/labor-profile.read-service.ts` (mặc định `workerId: null` filter; thêm helper `deriveCompleteness`)
- `src/domains/talent/labor-profile.service.ts` (thêm `updateLaborProfileIntakeProfile` writer: phone normalization + completeness recompute + 409 guard)
- `src/domains/talent/labor-profile.types.ts` (thêm `LaborProfileEditableFields`, `LaborProfileAlreadyLinkedError`)
- `app/admin/labor-profiles/__tests__/labor-profiles-separation.static.test.ts` (mới; fence list separation)
- `app/admin/labor-profiles/__tests__/labor-profile-edit-form.test.tsx` (mới; fence form props + role)
- `app/api/admin/labor-profiles/__tests__/route-patch.test.ts` (mới; fence PATCH RBAC + 409)
- `app/admin/workers/__tests__/workers-modal-no-comment-leak.static.test.ts` (mới; fence modal không render `// T0 T1B …` raw)
- `src/domains/talent/labor-profile.update-service.test.ts` (mới; fence update + completeness + 409)
- `docs/tasks/hrp-t1b-pre-p2-intake-worker-separation/TASK.md` (file này)
- `docs/tasks/hrp-t1b-pre-p2-intake-worker-separation/HANDOFF.md`

## 3. Cấm chạm (forbidden)

- `prisma/schema.prisma` và bất kỳ `prisma/migrations/**` (không migration).
- `prisma/seed.mjs`, dữ liệu production, .env*, `package.json` dependency bump.
- `src/domains/talent/conversion*.ts`, `src/domains/applications/conversion.service.ts` (PR #107 invariant — không động vào `linkLaborProfileWorker`).
- `app/api/workers/**` (chỉ chỉnh page.tsx, không sửa API Worker).
- `app/admin/recruiter-workbench/**`, `app/admin/applications/**` (out of scope PR #105).
- `src/shared/auth/with-db-context.ts`, `with-auth-scope.ts`, RLS-related code (không mở rộng quyền).
- `scripts/ci/**`, `vitest.*.config.ts`, `tsconfig.json`, `eslint.config.mjs`.
- `package.json`, `package-lock.json`, `pnpm-workspace.yaml`, `.gitignore`, `Dockerfile`.
- `.env`, `.env.local*`, `.env.secrets`.

## 4. Decisions

- `DEC-P2-01` Default filter: `getLaborProfilesList` luôn AND thêm `workerId: null` trừ khi caller truyền `includeLinked: true`. Caller hợp lệ là route `[id]` PATCH handler (cần đọc cả linked profile để guard 409) và future admin tools. UI list page không bao giờ truyền `includeLinked: true`. → Outcome §1.1 + §1.2.
- `DEC-P2-02` Role matrix tại route layer:
  - GET `/api/admin/labor-profiles/[id]`: `ADMIN | HR_MANAGER | HR_STAFF` (read-only cho cả 3; HR_STAFF xem cũ).
  - PATCH `/api/admin/labor-profiles/[id]`: `ADMIN | HR_MANAGER` (writer); `HR_STAFF` → 403. Không mở rộng ra `DIRECTOR` vì directive yêu cầu giữ authority hiện có.
  - GET `/api/admin/labor-profiles`: giữ nguyên (admin-portal-gated ở layout).
- `DEC-P2-03` Editable fields server-side: `fullName`, `phone`, `cccdNumber`. Mọi field khác (kể cả `workerId`, `consentAt`, `identityVerification`, `completeness`) bị zod `.strict()` reject. `phone` chỉ chấp nhận 1 dòng, tối đa 20 chars; `fullName` 1..255; `cccdNumber` 0..20 (optional).
- `DEC-P2-04` Phone normalization: gọi `normalizePhone(input.phone)` cùng helper hiện có (`src/domains/talent/normalize.ts`). Kết quả ghi `normalizedPhone`; nếu chuỗi rỗng (invalid) → lưu `null` cho cả `phone` và `normalizedPhone` (fail-closed; UI hiển thị warning, completeness rớt MINIMAL).
- `DEC-P2-05` Completeness recompute: server-side pure helper `deriveCompleteness(input)`:
  - `COMPLETE` (alias `FULL` để tương thích dictionary hiện có): có `fullName`, `phone`/`normalizedPhone`, `cccdNumber` đều non-null.
  - `MINIMAL`: thiếu một trong ba.
  - Hàm pure; thuộc `src/domains/talent/labor-profile.service.ts`; đã có test cover boundary.
- `DEC-P2-06` 409 guard: trước khi UPDATE, server `findUnique` theo `id`; nếu `workerId != null` → throw `LaborProfileAlreadyLinkedError` → route map thành `{ error: 'LABOR_PROFILE_ALREADY_LINKED', workerId }` 409. KHÔNG tự ý clear hay ghi đè `workerId`.
- `DEC-P2-07` Duplicate detection (fail-closed): sau khi UPDATE, server probe các profile khác (cùng `normalizedPhone` hoặc cùng `cccdNumber`, loại trừ self). Nếu có → trả 200 với field `warnings: [{ kind: 'POSSIBLE_DUPLICATE', signal: 'normalizedPhone' | 'cccdNumber', laborProfileIds: [...] }]`. KHÔNG auto-merge. Cùng pattern với `createOrMatchLaborProfile` (DEC-01..04) — typed warning, caller quyết.
- `DEC-P2-08` CAS / idempotency: route PATCH dùng `prisma.laborProfile.update` với `where: { id }` (single-row); KHÔNG chạm `workerId`. Vì update chỉ giới hạn ở 3 field, không có race với conversion flow PR #107. `linkLaborProfileWorker` của PR #107 giữ nguyên (DEC-013 unique).
- `DEC-P2-09` UI list filter chips: chỉ giữ 4 chips canonical `Tất cả | Chưa hoàn thiện | Cần đối chiếu | Kho chung`. Map sang `view` enum hiện: `'' | 'INCOMPLETE' | 'UNVERIFIED' | 'COMPANY_POOL'`. Bỏ `NEVER_WORKED | WORKING | TERMINATED` (vì đã merge thành Worker thì chuyển sang `/admin/workers`).
- `DEC-P2-10` UI list column: bỏ cột "Liên kết nhân viên" — toàn bộ row đã là unlinked theo DEC-P2-01, nên cột luôn "Chưa liên kết" (thừa). Bỏ luôn để giảm nhiễu.
- `DEC-P2-11` UI detail page banner: nếu `data.workerId`:
  - Read-only: tắt nút "Sửa thông tin" (ẩn hoặc disabled + tooltip).
  - Banner nổi bật: "Đã chuyển thành người lao động" + nút "Xem người lao động" link `/admin/workers?highlight=…` (UI accept `?highlight=<id>` để focus; nếu không có list page tự fallback).
- `DEC-P2-12` Edit form (client component): dùng `fetch('/api/admin/labor-profiles/[id]', { method: 'PATCH' })`. Role gate UI: nếu `ctx.role === 'HR_STAFF'` thì nút "Sửa thông tin" bị ẩn hoàn toàn (không show). Server vẫn enforce RBAC ở PATCH; defense in depth.
- `DEC-P2-13` Workers modal fix: di chuyển comment `// T0 T1B …` ra TRƯỚC JSX của component `Modal` (module-level JSDoc-style comment), KHÔNG đặt trong `<h2>`. Anti-regression: test static assert comment KHÔNG nằm trong khoảng giữa `<h2` và `</h2>` đầu tiên của file.

## 5. Execution Plan

- `STEP-01` — Update `src/domains/talent/labor-profile.read-service.ts`:
  - `LaborProfileListFilter` thêm `includeLinked?: boolean` (default `false`).
  - `getLaborProfilesList`: nếu `!includeLinked` thì `where.workerId = null`.
  - Test (existing) `labor-profile.read-service.test.ts` phải vẫn pass; thêm case mới: includeLinked=false → where có `workerId: null`; includeLinked=true → không có.
- `STEP-02` — Update `src/domains/talent/labor-profile.service.ts`:
  - Thêm `deriveCompleteness(input: { fullName, phone, normalizedPhone, cccdNumber }): 'MINIMAL' | 'COMPLETE'`.
  - Thêm `updateLaborProfileIntakeProfile(tx, args)`:
    - Input: `{ id, fullName, phone, cccdNumber, actor }`.
    - Read current row bằng `findUnique`; nếu `workerId != null` → throw `LaborProfileAlreadyLinkedError(current.workerId)`.
    - Normalize phone; derive completeness; build `data` zod-strict; `prisma.laborProfile.update` không bao gồm `workerId`.
    - Probe duplicate: `findMany` other profiles có same `normalizedPhone` hoặc same `cccdNumber` (exclude self). Trả `{ updated, warnings: PossibleDuplicateWarning[] }`.
- `STEP-03` — Update `src/domains/talent/labor-profile.types.ts`:
  - `export class LaborProfileAlreadyLinkedError extends Error`.
  - `export interface PossibleDuplicateWarning { kind: 'POSSIBLE_DUPLICATE'; signal: 'normalizedPhone' | 'cccdNumber'; laborProfileIds: string[] }`.
  - `export interface LaborProfileEditableFields { fullName?: string; phone?: string; cccdNumber?: string | null }`.
- `STEP-04` — Update `app/api/admin/labor-profiles/[id]/route.ts`:
  - Thêm `PATCH`:
    - `getAuthContext`; if role not in `WRITER_ROLES` (`ADMIN` | `HR_MANAGER`) → 403.
    - Zod `.strict()` schema cho editable fields (zod đã có ở project).
    - Trong `withDbContext`: gọi `updateLaborProfileIntakeProfile(tx, …)`; map `LaborProfileAlreadyLinkedError` → 409 + `{ error: 'LABOR_PROFILE_ALREADY_LINKED', workerId }`.
    - Trả `{ profile, warnings }` 200.
- `STEP-05` — Update `app/admin/labor-profiles/page.tsx`:
  - Filter chips: chỉ 4 (`'' | 'INCOMPLETE' | 'UNVERIFIED' | 'COMPANY_POOL'`).
  - Bỏ `<td>` "Liên kết nhân viên"; giảm `colSpan` empty-state từ 6 → 5.
  - Pass `includeLinked` không → default mặc định.
- `STEP-06` — Tạo `app/admin/labor-profiles/[id]/labor-profile-edit-form.tsx` (client):
  - Props `{ profile, role, canEdit, onSaved }`.
  - State `{ fullName, phone, cccdNumber, submitting, err, warnings }`.
  - Submit → `fetch PATCH`; on success `onSaved()` (refresh router); on 409 → show error "Hồ sơ đã được chuyển thành người lao động, không thể chỉnh sửa".
  - Nếu `!canEdit` thì chỉ render read-only view.
- `STEP-07` — Update `app/admin/labor-profiles/[id]/page.tsx`:
  - Banner read-only khi `data.workerId`:
    - Vàng/cam border; text "Đã chuyển thành người lao động"; nút "Xem người lao động" link `/admin/workers`.
  - Ẩn nút "Sửa thông tin" nếu `workerId` set hoặc role `HR_STAFF`.
  - Mount `<LaborProfileEditForm>` chỉ khi `!data.workerId && canEdit(role)`.
- `STEP-08` — Update `app/admin/workers/page.tsx`:
  - Di chuyển block comment `// T0 T1B …` ra TRƯỚC `function Modal` (JSDoc-style). Đảm bảo modal `<h2>` chỉ chứa `isEdit ? 'Sửa người lao động' : 'Thêm người lao động mới'`.
- `STEP-09` — Tests (mới):
  - `app/admin/labor-profiles/__tests__/labor-profiles-separation.static.test.ts` (4 filter chips fence, không có filter cũ, không có cột worker link, breadcrumb vẫn nguyên).
  - `app/admin/labor-profiles/__tests__/labor-profile-edit-form.test.tsx` (props fence, role gate UI).
  - `app/api/admin/labor-profiles/__tests__/route-patch.test.ts` (mock service; cover: HR_STAFF 403, ADMIN 200 happy, 409 khi workerId set, warnings when duplicate).
  - `app/admin/workers/__tests__/workers-modal-no-comment-leak.static.test.ts` (assert không có `// T0 T1B` text nằm giữa `<h2` và `</h2>`).
  - `src/domains/talent/labor-profile.update-service.test.ts` (cover: deriveCompleteness boundaries, 409 throw, warnings aggregate, no workerId in data).
- `STEP-10` — Gates & commit (sau khi tất cả tests xanh): `npm run typecheck && npm run lint && npm run test:unit && npm run build && npx prisma validate && node .ai-pipeline/scripts/verify-encoding.mjs && git diff --check`.

## 6. Acceptance

| AC | Mô tả | Phương pháp đo | Bằng chứng |
|----|-------|----------------|-----------|
| AC-01 | `getLaborProfilesList` mặc định AND `workerId: null`; `includeLinked: true` bỏ filter | `npm run test:unit -- labor-profile.read-service`; chạy targeted assertion | test output |
| AC-02 | `deriveCompleteness` pure: có cả 3 → COMPLETE; thiếu → MINIMAL | `npm run test:unit -- labor-profile.update-service` | test output |
| AC-03 | PATCH 200 với ADMIN/HR_MANAGER; 403 với HR_STAFF/DIRECTOR/CTV/... | `npm run test:unit -- route-patch` | test output |
| AC-04 | PATCH 409 khi `workerId != null`, body chứa `workerId` của profile linked | `npm run test:unit -- route-patch` | test output |
| AC-05 | PATCH tự `normalizePhone`; thiếu → null; `normalizedPhone` được set | `npm run test:unit -- labor-profile.update-service` | test output |
| AC-06 | PATCH KHÔNG nhận `workerId` từ client; zod `.strict()` reject | `npm run test:unit -- route-patch` | test output |
| AC-07 | PATCH trả `warnings` mảng rỗng khi không trùng; có entries khi trùng phone/cccd | `npm run test:unit -- labor-profile.update-service` | test output |
| AC-08 | `/admin/labor-profiles` list chỉ có 4 filter chips (`Tất cả, Chưa hoàn thiện, Cần đối chiếu, Kho chung`); bỏ 3 chips cũ | `npm run test:unit -- labor-profiles-separation.static` | test output |
| AC-09 | `/admin/labor-profiles` list bỏ cột "Liên kết nhân viên"; `colSpan` empty-state = 5 | `npm run test:unit -- labor-profiles-separation.static` | test output |
| AC-10 | `/admin/labor-profiles/[id]` banner read-only khi `workerId != null`; link `/admin/workers` | `npm run test:unit -- labor-profiles-separation.static` | test output |
| AC-11 | Edit form UI gate: nút ẩn với HR_STAFF; vẫn dùng được với ADMIN/HR_MANAGER | `npm run test:unit -- labor-profile-edit-form` | test output |
| AC-12 | Modal `/admin/workers` KHÔNG render raw `// T0 T1B …` text trong DOM | `npm run test:unit -- workers-modal-no-comment-leak.static` | test output |
| AC-13 | `npm run typecheck` exit 0 | shell | gate output |
| AC-14 | `npm run lint` exit 0 (warning OK) | shell | gate output |
| AC-15 | `npm run test:unit` tổng xanh (existing 4296+ + ≥ 5 file test mới) | shell | gate output |
| AC-16 | `npm run build` exit 0 | shell | gate output |
| AC-17 | `npx prisma validate` exit 0 (schema không đổi) | shell | gate output |
| AC-18 | `node .ai-pipeline/scripts/verify-encoding.mjs` PASS | shell | gate output |
| AC-19 | `git diff --check` exit 0 | shell | gate output |
| AC-20 | Stage đúng allowlist (no .env, no lock, no schema) | `git status --porcelain`; `git diff --cached --name-only` | shell output |

## 7. Risk & Rollback

- **Risk**: PATCH endpoint mới có thể lộ 4xx cho caller legacy (route hiện không có PATCH; không ai call → an toàn).
- **Risk**: `default workerId: null` filter có thể khiến legacy test thiếu coverage fail. Mitigation: existing `labor-profile.read-service.test.ts` chỉ mock tx, không đụng filter integration; static fence mới cover list UI.
- **Risk**: `verify-encoding.mjs` strict mode có thể fail nếu tool nào đó ghi CRLF. Mitigation: tất cả file mới/chỉnh sửa qua first-class `Write`/`Edit` của agent (UTF-8 LF).
- **Rollback**: revert single commit. Schema không đổi → không cần backfill. CAS / conversion flow của PR #107 giữ nguyên vì `linkLaborProfileWorker` không bị động vào.

## 8. Open Questions

- (none — directive đã đủ rõ cho phạm vi Pre-P2 hotfix)

## 9. Revision Log

| Spec | Date | Change | Note |
|------|------|--------|------|
| `v1.0` | 2026-10-06 | Phát hành từ T0 directive | T1 self-review; baseline `bbdbe9486` |
