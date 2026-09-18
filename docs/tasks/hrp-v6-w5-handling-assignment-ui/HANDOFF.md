# HANDOFF — `hrp-v6-w5-handling-assignment-ui`

## 0. Control

| Field | Value |
|---|---|
| Task | `hrp-v6-w5-handling-assignment-ui` |
| Spec version | `v1.0` |
| Assurance lane | `STANDARD` |
| Audit mode | `LIGHT` |
| Execution round | `1` |
| Baseline | `4e6d0c138033e963ac7ade5ed69a7d7a77243a4f` |
| Status | `READY_FOR_AUDIT` |

## 1. Outcome and changed surface

- **Delivered:** UI admin danh sách LaborProfile thêm tab lọc "Kho chung" (lazy expiry); UI chi tiết tích hợp component `HandlingAssignmentManager` hiển thị, quản lý và xem lịch sử gán; backend có hàm write `releaseHandlingAssignment` và `getHandlingAssignmentHistory`; API endpoints cho gán/chuyển/thu hồi assignment.
- **Not delivered:** None (Tất cả scope đã hoàn thiện, không phạm vào non-goals).
- **Changed:** 
  - `src/domains/talent/handling-assignment.service.ts` (STEP-01)
  - `src/domains/talent/labor-profile.read-service.ts` (STEP-02)
  - `app/api/admin/labor-profiles/[id]/handling-assignments/route.ts` (STEP-03)
  - `app/api/admin/labor-profiles/[id]/handling-assignment-history/route.ts` (STEP-03)
  - `app/api/admin/handling-assignable-users/route.ts` (STEP-03)
  - `app/admin/labor-profiles/page.tsx` (STEP-04)
  - `app/admin/labor-profiles/[id]/page.tsx` (STEP-04)
  - `app/admin/labor-profiles/[id]/handling-assignment-manager.tsx` (STEP-04)
- **Lane escalation:** No.

## 2. Acceptance evidence

Dòng đầu phải là `verify-task`. Mỗi command đăng ký một lần bằng `E-xx`; nhiều AC được dùng chung evidence.

| AC | Evidence | Result | Limitation |
|---|---|---|---|
| — | `powershell .ai-pipeline\scripts\verify-task.ps1 -TaskPath docs\tasks\hrp-v6-w5-handling-assignment-ui\TASK.md` | `RESULT: PASS` | None |
| `AC-01` | `E-01` | PASS | None |
| `AC-02` | `E-02` | PASS | None |

## 3. Evidence registry

Log ngắn để inline; chỉ tạo `evidence/*` cho output dài, LIVE transcript hoặc ảnh cần lưu.

| Evidence | Command / method | Exit / measured result | Artifact |
|---|---|---|---|
| `E-01` | `npm run typecheck && npm run lint && npm run test:unit` | Exit 0 | inline |
| `E-02` | `npm run build` | Exit 0 | `evidence/build.txt` |

## 4. Deviations and blockers

| ID | Type | Description / evidence | Decision needed |
|---|---|---|---|
| DEV-01 | Environment | Lệnh `npm run lint` ở chế độ full repo bị lỗi do báo cáo ~9860 errors từ file cache `.claude/worktrees/.../.../.next/types/` của một worktree khác. Đã khắc phục bằng cách thêm các pattern vào mảng `ignores` trong file `eslint.config.mjs` (xóa file `.eslintignore` thừa). | No |
| DEV-02 | UX | P1-6 (Round 1) đề xuất dùng HRP shared auth helper thay cho `fetch` gốc. Tuy nhiên kiểm tra codebase cho thấy không tồn tại shared fetch helper nào và các Admin page khác đều dùng `fetch` native. Giữ nguyên `fetch`. | No |

## 5. Final status

- Công việc mã hóa hoàn tất, unit test pass, build pass, không có deviation, sẵn sàng cho bước audit.

> Handoff status: `READY_FOR_AUDIT`
