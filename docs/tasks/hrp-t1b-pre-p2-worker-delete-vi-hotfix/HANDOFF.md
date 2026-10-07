# HANDOFF — T1B Pre-P2 Hotfix: Việt hóa xóa Worker + truy vết lỗi 500

**Implementation SHA**: `3d33315a2713d21582cc459f246f9adffeef4aa8`
**Branch**: `codex/t1b-pre-p2-worker-delete-vi-hotfix`
**Baseline**: `origin/main` @ `ace4391720e88479fd08f3de7f29efdfa8b7888d` (T0 merge PR #113)
**Lane**: FAST · **Audit**: NONE · **Protocol**: V2_FAST_FREEZE · **Budget**: 0

## Quyết định & phạm vi

1. **Việt hóa modal xóa Worker** (`worker-delete-button.tsx`): bỏ "LaborProfile link",
   "Ticket, attendance, payroll, history, submission, placement" ở body và placeholder
   audit reason ("cleanup test row, orphan record…"); thay bằng nhãn tiếng Việt nhất
   quán glossary (hồ sơ NLĐ, phân công dự án, yêu cầu hỗ trợ, sự kiện chấm công,
   bảng công, lịch sử quan hệ lao động, đơn ứng tuyển, bố trí việc làm).
2. **Module-owned dictionary** mới `src/domains/workforce/worker-delete-error-labels.ts`:
   map 15 `WorkerDependencyKind` → nhãn tiếng Việt (4 kind reuse `glossary.ts`,
   11 kind owned, `CANDIDATE_SUBMISSION_MERGED` phân biệt `CANDIDATE_SUBMISSION`).
   UI render qua `dependencyLabel`/`dependencyLabelWithHint` — KHÔNG leak raw enum.
3. **Phân loại phản hồi UI**: 409 `WORKER_NOT_DELETABLE` (chặn có chủ đích) → message
   tiếng Việt + danh sách nhãn; 404/403 → message tiếng Việt; **5xx → message cố định
   KHÔNG lộ `e.message`** (chống leak stack/Prisma/PII ra UI).
4. **Catch-all 500 route** (`app/api/workers/[id]/route.ts`): đổi `Failed to delete
   worker` → `"Hệ thống gặp sự cố khi xóa người lao động. Vui lòng thử lại hoặc liên
   hệ quản trị viên."`; `console.error` giữ nguyên cho server-side log.
5. **Bất biến giữ nguyên**: ADMIN-only, 15-table sweep, advisory lock, audit reason,
   không cascade, không đổi schema/auth/RLS, không đụng dữ liệu production.

## Bằng chứng (PASS ngay tại worktree, trước khi push)

| Gate | Lệnh | Kết quả |
|---|---|---|
| Unit (full suite) | `npx vitest run --config vitest.unit.config.ts` | 4914 passed, 9 skipped, 0 fail |
| Targeted (in-scope) | 6 file | 103/103 passed |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Lint (changed files) | `npx eslint <8 files>` | 0 errors |
| Build | `npm run build` | exit 0 (route `/api/workers/[id]` compiled) |
| Encoding | `node .ai-pipeline/scripts/verify-encoding.mjs` | 10/10 UTF-8 no-BOM |
| Diff check | `git diff --check` | clean |
| Working tree | `git status` | clean post-commit |

## Test mới / bổ sung

- `app/admin/workers/[id]/__tests__/worker-delete-button.static.test.ts` (17 test):
  modal copy tiếng Việt (bỏ Thuật ngữ Anh), audit reason placeholder, mapping enum
  → label (render dùng `dependencyLabel`), tooltip `dependencyLabelWithHint`, fence
  5xx không leak `d.message`, 4-layer defense.
- `app/api/workers/[id]/__tests__/route-delete-500.static.test.ts` (4 test): Prisma
  exception → 500 message chung (không leak `P2002`/stack), idempotency layer throw
  → 500 message chung, `console.error` được gọi với marker `[api/workers/[id] DELETE]`.
- `src/domains/workforce/__tests__/worker-delete-error-labels.test.ts` (7 test):
  15 kinds đủ, 3 kind reuse glossary, `CANDIDATE_SUBMISSION_MERGED` ≠ `CANDIDATE_SUBMISSION`,
  fallback an toàn khi kind lạ.
- `src/domains/workforce/__tests__/worker.service.test.ts`: 13 dependency-sweep
  case bổ sung assert message tiếng Việt + `blockingFacts` schema.
- `app/api/workers/__tests__/route-get-patch-delete.test.ts`: bổ sung 1 test
  `non-WorkerServiceError (Prisma) → 500 với message chung tiếng Việt`.
- `app/admin/workers/[id]/__tests__/worker-detail-sections.static.test.ts`:
  cập nhật 1 fence `cleanup test row` → `dọn dẹp bản ghi thử nghiệm` (đồng bộ copy).

## Bằng chứng còn thiếu (blocker cho root cause production 500)

T0 chưa cấp:
- Network response body + status code từ call DELETE Worker thật trên production
  (ảnh gửi kèm chỉ thấy `"Failed to delete worker"` text).
- Server log dòng `console.error('[api/workers/[id] DELETE] error:', e)`: stack +
  Prisma code + message đầy đủ.
- Metadata: Worker nào, có `x-idempotency-key` không, body raw, `ctx.role` lúc đó.

**Từ code, danh sách root cause 500 có thể có (không xác định được nếu không có log)**:
1. Non-`WorkerServiceError` exception từ Prisma transaction (`P2002` unique, deadlock,
   timeout).
2. Idempotency layer throw (DB unique, JSON parse fail).
3. `getAuthContext` throw ngoài `AuthSessionError`.
4. Network/serialization giữa Prisma và Postgres.

**Dừng phần "chỉ sửa root cause"** theo directive T0 (chỉ sửa nếu tái hiện được
an toàn trong scope). Trong scope này:
- Generic 500 hiện không leak `e.message`/stack ra UI (đã fence).
- Server log `console.error` đầy đủ (giữ nguyên — không đổi).
- Nếu T0 cấp evidence (Network + log), mở correction batch 1 với root cause cụ thể.

## Hand-off

- Đã commit 1 commit forward-only (`3d33315a`); working tree clean.
- Cần push branch + mở PR chờ CI 4/4 GREEN, dừng trước merge/deploy.