# T0 → T1B — PRE-P2 HOTFIX: TÁCH HỒ SƠ TIẾP NHẬN / NGƯỜI LAO ĐỘNG (+ v1.1 PR #110 CORRECTION 1/1)

## Tóm tắt

Tách rõ hai mặt của workforce ingestion trong admin portal: LaborProfile (intake) vs Worker (official). Implement + harden 4 lớp defense in depth.

**v1.0 outcomes (đã giao PR #110, CI 4/4 GREEN):**
- `/admin/labor-profiles` mặc định chỉ liệt kê **Hồ sơ tiếp nhận** (`LaborProfile.workerId = null`).
- `/admin/workers` chỉ liệt kê **Người lao động**.
- `PATCH /api/admin/labor-profiles/[id]` với role matrix `ADMIN` / `HR_MANAGER` writer, `HR_STAFF` reader.
- Auto `normalizePhone` + recompute `completeness` server-side.
- 409 fail-closed khi `workerId` đã set; `workerId` không bao giờ nhận từ client.
- 4 filter chips canonical; bỏ cột "Liên kết nhân viên"; banner read-only + link `/admin/workers` khi đã linked; fix modal `<h2>` raw comment leak.

**v1.1 — PR #110 CORRECTION 1/1 (forward-only, đẩy thêm 1 commit):**
1. **Bỏ function prop `onSaved`**: form tự `useRouter().refresh()` (kiến trúc Server → Client Component đúng).
2. **CAS `updateMany` race protection với PR #107 conversion flow**: `tx.laborProfile.updateMany({ where: { id, workerId: null } })`. Khi `count === 0` re-read phân biệt 404 vs 409 (`LaborProfileAlreadyLinkedError`). Đây cùng pattern với `linkLaborProfileWorker` PR #107 — race window đóng hoàn toàn.
3. **Chống submit masked data** (4 lớp defense):
   - **Form dirty tracking**: chỉ gửi field user thực sự sửa (so với initial values từ DB). Không có cách vô tình ghi đè giá trị thật bằng masked value.
   - **UI permission gate**: nếu `canSeeSensitive === false` (HR_MANAGER mặc định không có `CAN_VIEW_WORKER_SENSITIVE`) → banner "Không có quyền sửa", disable inputs, disable nút Lưu.
   - **API permission gate**: route PATCH enforce `CAN_VIEW_WORKER_SENSITIVE` ngoài role check.
   - **Service entry guard**: `MASK_INPUT_RE = /\*/` test trên `phone` + `cccdNumber`; nếu chứa `*` → 400 INVALID_INPUT.
4. **Copy sweep**: breadcrumb `Hồ sơ tiếp nhận` (không "Hồ sơ người lao động"); button `Chuyển thành người lao động` (không "Chuyển đổi thành nhân viên").

## Baseline

`origin/main @ bbdbe94862dc58c9ec97c3f1627a43d9c0e8ab0b` — PR #107 đã merge.

v1.1 correction baseline: v1.0 implementation SHA `2eb74f2d4` (PR #110 CI 4/4 GREEN).

## Spec & handoff

- TASK: `docs/tasks/hrp-t1b-pre-p2-intake-worker-separation/TASK.md` (v1.1)
- HANDOFF: `docs/tasks/hrp-t1b-pre-p2-intake-worker-separation/HANDOFF.md` (v1.1)

## Quality gates (sau khi apply v1.1, local)

- `npx tsc --noEmit`: exit 0
- `npx eslint .`: exit 0 (969 pre-existing warnings, 0 errors, 0 new)
- `npx vitest run --config vitest.unit.config.ts`: **4670 / 4670 PASS, 9 skipped, 0 failed** (+18 vs v1.0)
- `npx next build`: exit 0; `/admin/labor-profiles/[id]` route compiled 5.14 kB
- `npx prisma validate` (với env placeholders): exit 0 (schema không đổi)
- `node .ai-pipeline/scripts/verify-encoding.mjs`: PASS (10 changed text files, strict UTF-8 without BOM)
- `git diff --check`: exit 0

## Test delta (v1.0 → v1.1)

| File | v1.0 | v1.1 | delta |
|------|------|------|-------|
| `src/domains/talent/labor-profile.update-service.test.ts` | 13 | 19 | +6 (CAS-lost 404/409, masked rejection 3 cases, plain happy path) |
| `app/api/admin/labor-profiles/__tests__/route-patch.test.ts` | 21 | 26 | +5 (sensitive permission gate, masked rejection, race edit-vs-convert, dirty partial) |
| `app/admin/labor-profiles/__tests__/labor-profiles-separation.static.test.ts` | 20 | 27 | +7 (canSeeSensitive fence, copy sweep, dirty body, MASK_RE guard) |

## Files changed (15)

```
M  app/admin/labor-profiles/page.tsx                                       (v1.0)
M  app/admin/labor-profiles/[id]/page.tsx                                  (v1.0 + v1.1: copy sweep, canSeeSensitive prop)
A  app/admin/labor-profiles/[id]/labor-profile-edit-form.tsx               (v1.0 + v1.1: drop onSaved, dirty tracking, MASK_RE)
M  app/admin/workers/page.tsx                                              (v1.0)
M  app/api/admin/labor-profiles/[id]/route.ts                              (v1.0 + v1.1: canSeeSensitive gate, MASK rejection)
M  src/domains/talent/labor-profile.read-service.ts                        (v1.0)
M  src/domains/talent/labor-profile.read-service.test.ts                   (v1.0)
M  src/domains/talent/labor-profile.service.ts                             (v1.0 + v1.1: CAS updateMany, re-read 404/409, MASK reject)
M  src/domains/talent/labor-profile.types.ts                               (v1.0)
A  src/domains/talent/labor-profile.update-service.test.ts                 (v1.0)
A  app/api/admin/labor-profiles/__tests__/route-patch.test.ts              (v1.0)
A  app/admin/labor-profiles/__tests__/labor-profiles-separation.static.test.ts (v1.0)
A  app/admin/workers/__tests__/workers-modal-no-comment-leak.static.test.ts (v1.0)
A  docs/tasks/hrp-t1b-pre-p2-intake-worker-separation/TASK.md              (v1.0 → v1.1)
A  docs/tasks/hrp-t1b-pre-p2-intake-worker-separation/HANDOFF.md           (v1.0 → v1.1)
```

## Không động đến (theo directive)

- Schema / migration (`prisma/schema.prisma`, `prisma/migrations/**`)
- PR #107 conversion flow (`src/domains/applications/conversion.service.ts`) — v1.1 PATCH dùng cùng CAS pattern với nó, race-safe
- RLS / auth scope (`src/shared/auth/with-db-context.ts`, etc.)
- T1A StaffingOrder tasks (PR #105)
- `package.json`, lock files, CI config
- Production data
- `src/shared/i18n/glossary.ts` (copy sweep scope directive: chỉ "trên trang LaborProfile")

## Tier 3 / AUDIT.md

Directive cả v1.0 và v1.1 đều: "Không Tier 3/AUDIT" → chỉ Tier 1 self-review (xem HANDOFF v1.1 §3 — 4 risks analyzed).

## Checklist trước merge

- [x] Worktree + branch mới từ baseline `bbdbe9486`
- [x] TASK v1.0 + HANDOFF v1.0
- [x] v1.0 triển khai + tự review
- [x] v1.0 gates xanh local + CI 4/4 GREEN
- [x] v1.0 commit forward-only + push PR #110
- [x] v1.1 TASK + HANDOFF update (4 fix)
- [x] v1.1 triển khai + tự review
- [x] v1.1 gates xanh local (typecheck, lint, test:unit 4670 PASS, build, encoding)
- [x] v1.1 forward-only commit
- [ ] Push v1.1 + chờ CI 4/4 GREEN
- [ ] Dừng trước merge
