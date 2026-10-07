# T1B — PRE-P2 HOTFIX: VIỆT HÓA MODAL XÓA WORKER + TRUY VẾT 500

## Outcome

Modal xóa Worker tại `/admin/workers/[id]` dùng toàn bộ copy tiếng Việt cho danh sách
loại phụ thuộc, audit reason, lỗi UI. Hiển thị 409 WORKER_NOT_DELETABLE chuyển enum
identifier (`LABOR_PROFILE` ...) sang nhãn phụ thuộc tiếng Việt thân thiện. Tách bạch
giữa phản hồi nghiệp vụ (409 chặn xóa có chủ đích) và lỗi nội bộ thật (500), đảm
bảo message 500 không lộ chi tiết kỹ thuật ra UI và chỉ log phía server với PII/secret
đã được che.

## Baseline

- Branch: `codex/t1b-pre-p2-worker-delete-vi-hotfix` (worktree mới từ `origin/main`).
- Baseline: `origin/main` @ `ace4391720e88479fd08f3de7f29efdfa8b7888d` (T0 merge PR #113).
- Forward-only: không rebase, không amend, không force-push.

## Owner decision (Tier 0 lock trước khi code)

| Mục | Giá trị | Lý do |
|---|---|---|
| Lane | `FAST` | Modal copy + lỗi mapping; UI tweak, blast radius hẹp trong 1 component + 1 route. |
| Audit | `NONE` | Tier 1 tự review; copy + i18n map + test fence; không public contract; không schema/auth. |
| `BUILD_VS_ADOPT` | `N/A` | Không tạo capability kỹ thuật mới; chỉ dùng pattern dictionary có sẵn (`glossary.ts` + 1 map mới). |
| `BUILD_VS_AUTOMATE` | `N/A` | Không connector / scheduler / workflow. |
| Correction budget | `0` | V2_FAST_FREEZE; một lượt; nếu phát hiện scope mới thì chuyển T0. |

## File Ownership

In-scope (đụng):

- `app/admin/workers/[id]/worker-delete-button.tsx` — modal copy tiếng Việt; map enum→label cho blocking facts; hiển thị thông báo lỗi phân loại.
- `app/api/workers/[id]/route.ts` — `errorResponse` cho DELETE: 500 không leak nguyên nhân nội bộ ra UI; chỉ log `console.error` ở server. Không đổi các handler khác.
- `src/domains/workforce/worker-delete-error-labels.ts` (mới) — module-owned dictionary map `WorkerDependencyKind` → label tiếng Việt + label `*_with_hint` cho tooltip. Reuse cross-module terms từ `glossary.ts` cho các key đã có; thêm các term chưa có (Ticket, Attendance, Timesheet, ...).
- `app/admin/workers/[id]/__tests__/worker-delete-button.static.test.ts` (mới) — fence copy: Việt hóa 100% cho người dùng; map blocking facts qua label; không leak raw enum; 4-layer defense.
- `app/api/workers/[id]/__tests__/route-delete-500.static.test.ts` (mới) — fence: 500 từ catch-all không lộ `e.message` hay stack; chỉ message generic tiếng Việt; `console.error` được gọi với thông tin server-side.
- `src/domains/workforce/__tests__/worker.service.test.ts` — bổ sung test cho `WORKER_NOT_DELETABLE` error: message tiếng Việt + `blockingFacts` đúng schema.
- `app/api/workers/[id]/__tests__/route-get-patch-delete.test.ts` — bổ sung test cho DELETE catch-all 500 (không leak); test hiện có đã có 409/404/403.

Out-of-scope (không đụng, kể cả khi thấy liên quan):

- Schema / migration / Prisma.
- Auth / RLS / role matrix.
- `linkLaborProfileWorker`, conversion flow, `LaborProfile.workerId` ownership.
- Các route khác ngoài `app/api/workers/[id]/route.ts`; chỉ đụng nhánh DELETE catch-all.
- Việt hóa các modal khác (status, edit) — không nằm trong scope này.
- Production data investigation / cleanup — T0 cấm.

## Investigation results (từ code, không có network log)

Tổng kết đọc code `route.ts:220-272` + `worker.service.ts:658-734` + `worker-delete-button.tsx:1-144`:

1. **409 WORKER_NOT_DELETABLE** (`worker.service.ts:687-689`): typed error, throw chủ ý khi còn ≥1 dependency. Route map sang 409 (line 56). Message tiếng Việt: "Người lao động đã phát sinh nghiệp vụ (...). Không thể xóa vĩnh viễn." `details.blockingFacts` là enum `WorkerDependencyKind` (SCREAMING_SNAKE_CASE).
2. **404 NOT_FOUND** (`worker.service.ts:669, 682`): snapshot/recheck trả null. Route map sang 404.
3. **403 PERMISSION_DENIED** (`worker.service.ts:140-146`): non-ADMIN. Route có guard riêng (line 233) trả 403 trước.
4. **500 catch-all** (`route.ts:268-272`): `console.error('[api/workers/[id] DELETE] error:', e); return NextResponse.json({ error: 'INTERNAL', message: 'Failed to delete worker' }, { status: 500 });`. **Đây là response 500 generic** mà ảnh T0 gửi. Root cause có thể là: (a) exception không phải `WorkerServiceError`/`AuthScopeError` rò rỉ từ tx/Prisma; (b) idempotency layer throw; (c) auth context throw không phải `AuthSessionError`. Cần production Network response + server log để xác định chính xác — **T0 chưa cấp; KHÔNG tự tạo/xóa dữ liệu production**.
5. **UI hiển thị blocking facts raw**: `worker-delete-button.tsx:107-111` render `d` thẳng (enum key thô) vào `<li>`. Đây là lý do danh sách phụ thuộc hiện tiếng Anh-trong-giao-diện-tiếng-Việt.

## Plan thực thi (single batch)

1. Tạo `src/domains/workforce/worker-delete-error-labels.ts`:
   - `WORKER_DEPENDENCY_LABELS: Record<WorkerDependencyKind, { label: string; labelWithHint: string }>` map 15 dependency kinds → Việt hóa nhất quán glossary (Ticket, Attendance, Timesheet, WorkerDeduction, ...).
   - Helper `dependencyLabel(kind)` / `dependencyLabelWithHint(kind)`.
   - Reuse `glossaryLabel('placement')` / `glossaryLabel('project_assignment')` / `glossaryLabel('labor_profile_short')` / `glossaryLabel('candidate_submission')` cho 4 kind đã có trong glossary.
2. Sửa `worker-delete-button.tsx`:
   - Modal body copy 100% tiếng Việt (audit reason placeholder, danh sách loại phụ thuộc mô tả dạng Việt từ dependency labels).
   - Hiển thị blocking facts: import `dependencyLabelWithHint`; render `<li>{dependencyLabelWithHint(kind)}</li>` thay vì raw enum.
   - Error hiển thị 500: text "Hệ thống gặp sự cố khi xóa. Vui lòng thử lại hoặc liên hệ quản trị viên." (không leak `e.message`).
3. Sửa `app/api/workers/[id]/route.ts`:
   - Trong nhánh DELETE catch-all (`route.ts:268-272`): đổi `message: 'Failed to delete worker'` thành `'Hệ thống gặp sự cố khi xóa người lao động. Vui lòng thử lại hoặc liên hệ quản trị viên.'`; giữ nguyên `console.error` (server log đã có, không lộ PII vì Prisma error không chứa CCCD/phone).
4. Bổ sung test:
   - `worker-delete-button.static.test.ts`: fence copy tiếng Việt, fence 100% không có enum key trong markup render động, fence blocking facts dùng label.
   - `route-delete-500.static.test.ts`: fence 500 catch-all trả message chung (không lộ `e.message` từ exception thật); fence `console.error` được gọi.
   - `worker.service.test.ts`: assert message tiếng Việt + `blockingFacts` schema cho `WORKER_NOT_DELETABLE` (bổ sung assertion vào test cases đã có).
   - `route-get-patch-delete.test.ts`: thêm 1 test 500 catch-all (mock service throw non-`WorkerServiceError`).

## Evidence gate trước khi code

- [x] Baseline `origin/main` @ `ace43917` (T0 merge PR #113).
- [x] Đọc `worker.service.ts` 760 dòng, `worker.types.ts` 260 dòng, `route.ts` 280 dòng, `worker-delete-button.tsx` 144 dòng, `worker.service.test.ts` 487 dòng, `route-get-patch-delete.test.ts` 373 dòng.
- [x] Glossary + form-dictionary có sẵn — pattern reuse.
- [x] Network response / server log production cho lỗi 500 — **CHƯA CÓ** (T0 chưa cấp). Ghi rõ trong HANDOFF.

## Bằng chứng còn thiếu (blocker cho root cause)

- Network response body + status code từ call DELETE Worker thật trên production.
- Server log dòng `console.error('[api/workers/[id] DELETE] error:', e)` (stack + Prisma code + message).
- Câu hỏi T0 cần trả lời: Worker nào đang thử xóa? Có `x-idempotency-key` không? Body raw? `ctx.role` lúc đó?

Nếu T0 cấp evidence, có thể mở correction batch 1 với root cause cụ thể. Nếu không, ghi "không tái hiện được" và dừng phần này (theo directive 4: "Chỉ sửa root cause nếu tái hiện được an toàn và nằm trong phạm vi").

## Gates (PASS yêu cầu)

- Targeted: `worker.service.test.ts` (deleteWorker), `route-get-patch-delete.test.ts` (DELETE), 2 test mới.
- Full unit: green.
- typecheck: 0 errors.
- lint: 0 errors.
- next build: green.
- verify-encoding: 0 changed-file BOM/UTF-8 fail.
- git diff --check: pass.
- CI trên branch: Quality + Integration + Vercel 4/4 GREEN.
