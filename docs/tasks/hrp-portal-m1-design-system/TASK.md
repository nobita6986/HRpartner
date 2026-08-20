# TASK: hrp-portal-m1-design-system

## 0. Control

| Field | Value |
|---|---|
| Task slug | hrp-portal-m1-design-system |
| Work type | CODE |
| Audit mode (Tier 3 đọc) | CODE_AUDIT |
| Spec version | 1.1 |
| Status | READY_FOR_AUDIT |
| Planner | Tier 1 (Antigravity) |
| Executor | Tier 2 (Figma Owner / Frontend Engineer) |
| Auditor | Tier 3 (Auditor) |
| Baseline | HEAD of main |
| Modules | M1-Portal |
| ADR references | None |
| Current execution round | 2 |
| Current audit round | 1 |
| Next gate | /audit hrp-portal-m1-design-system |
| Updated | 2026-08-19 16:20 +07:00 |

## 1. Outcome

### User-visible outcome

- Áp dụng Design System warm_professionalism (F01) vào toàn cục (mã màu, font chữ, UI components).
- Người dùng khách khi truy cập (portal) sẽ thấy thanh điều hướng Global Navbar và Footer hoàn chỉnh theo bộ mockup S05_JobBoard_Public_1440.html.
- Các bài Test (Vitest) cho tính năng xác thực phải PASS 100% (cập nhật Cookie name).

### Non-goals

- Không xây dựng nội dung bên trong của Landing Page (Hero section, search jobs), phần này thuộc M2.
- Không đụng chạm vào Dashboard của Admin/Worker/Vendor.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| EV-01 | F01_Tokens.html | Màu chủ đạo là #f26522, Font là Be Vietnam Pro. | Cần setup CSS variables cho Tailwind v4. |
| EV-02 | S05_JobBoard_Public_1440.html | Chứa thiết kế của Header và Footer dùng chung. | Layout của (portal) sẽ tái sử dụng cấu trúc này. |
| EV-03 | Tier 3 Audit Report | src/shared/auth/user.test.ts lỗi do cookie chưa khớp hrp_session. | Phải thêm task update unit test. |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| DEC-01 | CHOSEN | Dùng thư mục stitch/warm_professionalism làm token CSS gốc vì nó sinh ra từ F01. | Planner | Valid |
| DEC-02 | CHOSEN | Sửa luôn test lỗi trong cùng round này để giữ green build. | Tier 3 | Valid |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| RQ-01 | Config globals.css với các biến màu Tailwind v4 từ F01. | Must | EV-01 | Sai màu nhận diện. |
| RQ-02 | Xây dựng Layout component pp/(portal)/layout.tsx kèm Global Navbar/Footer. | Must | EV-02 | Mất header ở trang công khai. |
| RQ-03 | Fix 2 test thất bại trong src/shared/auth/user.test.ts (đổi tên cookie thành hrp_session). | Must | EV-03 | Build CI thất bại. |
| RQ-04 | Cập nhật HANDOFF.md với trạng thái đúng là READY_FOR_AUDIT. | Must | Tier 3 | Pipeline từ chối nghiệm thu. |

### 4.2 Scope boundaries

**In scope:**
- pp/globals.css
- pp/(portal)/layout.tsx, pp/components/GlobalNavbar.tsx, pp/components/GlobalFooter.tsx
- src/shared/auth/user.test.ts
- HANDOFF.md

**Out of scope:**
- Chỉnh sửa logic của Auth.
- Xây dựng phần nội dung của trang chủ (Landing Page).

### 4.3 Data, State, Permission và Interface Rules

- **Interface:** Layout (portal) chỉ tác động đến các route /, /home, /ctv (nếu nằm trong route group (portal)).
- **Failure:** Test unit của user.test.ts phải PASS. Nếu FAIL, không được chuyển trạng thái sang READY_FOR_AUDIT.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01` | `app/globals.css` | Thêm Tailwind v4 `@theme` tokens từ F01 (warm_professionalism). | N/A | Code review (AC-01) | Thiếu token primary |
| `STEP-02` | `RQ-02` | `app/(portal)/layout.tsx`, `app/components/GlobalNavbar.tsx`, `app/components/GlobalFooter.tsx` | Tạo route group (portal) layout với Header/Footer theo S05 mockup. | `STEP-01` | `npm run build` exit 0 | Build fail |
| `STEP-03` | `RQ-03` | `src/shared/auth/user.test.ts` | Sửa mock cookie name trong test từ `hrp_token` thành `hrp_session` để khớp `AUTH_COOKIE_NAME`. | N/A | `npx vitest run src/shared/auth/user.test.ts` exit 0 | Nếu test đỏ, phải sửa đến khi xanh |
| `STEP-04` | `RQ-04` | `docs/tasks/hrp-portal-m1-design-system/HANDOFF.md` | Cập nhật status → `READY_FOR_AUDIT`. | `STEP-01..03` | Review markdown | Status không đúng |
## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | `app/globals.css` có `--color-primary: #f26522` và các token warm_professionalism đầy đủ. | Đọc code. | Trích xuất file thay đổi. | Yes |
| `AC-02` | `RQ-02` | `app/(portal)/layout.tsx` chứa `<GlobalNavbar />` + `<GlobalFooter />`. | Đọc code. | Trích xuất file thay đổi. | Yes |
| `AC-03` | `RQ-03` | Tất cả test đều PASS (Exit 0). | `npx vitest run` | Output màn hình (PASS). | Yes |
| `AC-04` | `RQ-04` | `HANDOFF.md` có status = `READY_FOR_AUDIT`. | Đọc file. | Grep `READY_FOR_AUDIT` trong HANDOFF. | Yes |
### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| RQ-01 | STEP-01 (Design System tokens in globals.css) | AC-01 |
| RQ-02 | STEP-02 (Public Layout with GlobalNavbar/Footer) | AC-02 |
| RQ-03 | STEP-03 (Fix user.test.ts cookie name) | AC-03 |
| RQ-04 | STEP-04 (Update HANDOFF.md to READY_FOR_AUDIT) | AC-04 |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| RISK-01 | Sửa unit test sai làm logic Auth bị ảnh hưởng. | Test báo lỗi syntax. | Chỉ sửa đúng string hrp_session. | Git revert file test. |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| Q-01 | None | N/A | N/A | No |

## 9. Planner Resolution

| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| 1 | AUD-001 | ACCEPT_FIX | Thiếu định dạng pipeline 10 sections. | Cập nhật toàn bộ TASK.md theo template v1.1. | Tier 1 |
| 1 | AUD-002 | ACCEPT_FIX | Handoff sai trạng thái. | Bổ sung RQ-04 ép Tier 2 viết chuẩn. | Tier 1 |
| 1 | AUD-003 | ACCEPT_FIX | Regression cookie auth name. | Bổ sung RQ-03 và STEP-01. | Tier 1 |

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| 1.0 | 2026-08-19 | Khởi tạo hợp đồng (sai format). | Init Milestone 1 |
| 1.1 | 2026-08-19 | Re-write toàn bộ theo AI Pipeline chuẩn. Thêm task fix test. | Fix AUD-001, AUD-003 |
