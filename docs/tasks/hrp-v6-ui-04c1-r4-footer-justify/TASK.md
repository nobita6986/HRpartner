# TASK — `hrp-v6-ui-04c1-r4-footer-justify`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04c1-r4-footer-justify` |
| Work type | `UI` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | `Pure visual spacing + 1 line removal in scope footer component; no business logic; FAST lane mặc định NONE (theo tier1.md audit selection table)` |
| Spec version | `v0.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1 (Delivery Lead — tier1.md mới, workflow 7 bước; outcome đã cho phép implement ngay, không chờ Tier 0 chốt routine choice)` |
| Baseline | `ff63083` (post-push 04c1-r3) |
| In-scope roots | `app/components/GlobalFooter.tsx` |
| Forbidden paths | `app/api/**`, `app/(portal)/**`, `app/admin/**`, `app/api/admin/**`, `prisma/**`, `docs/V7/**` |
| Required gates | `npm run typecheck`, `npm run lint` (sẽ pass cho file này), `npm run build`; local Vercel preview visual review |
| Current execution round | `R4` |
| Current audit round | `0` |
| Next gate | `OWNER_VISUAL_REVIEW` (anh xem preview Vercel sau khi push) |

## 1. Outcome

### 1.1 User-visible outcome

Footer ở https://hrpvietnam.com/ (sau push lên main) hiển thị:

1. **Cột 1 (Công ty)**: bỏ dòng "HRP Co.,Ltd" — chỉ giữ "CÔNG TY TNHH HRP VIỆT NAM" + "HRP VIET NAM COMPANY LIMITED" + "Địa chỉ: ..." + 2 hotline + email + website.
2. **Cột 1 + Cột 2 (Dịch vụ)**: bỏ gap thừa giữa các dòng — chỉ còn line-height tự nhiên; các items **canh đều 2 bên (justify-between)** trong flex column.
3. **Cột 3 (Liên hệ)**: giữ nguyên ContactForm panel.

### 1.2 Non-goals

- KHÔNG đổi cấu trúc 3-cột grid (`grid-cols-[1.1fr_1fr_1.1fr]`).
- KHÔNG đổi ContactForm, FooterRouteLink, FooterDisabledText.
- KHÔNG đổi copyright bottom bar.
- KHÔNG đổi nội dung SERVICES list (chỉ icon + label layout nếu cần flatten).
- KHÔNG đổi icon `Briefcase/Cpu/Users/PackageOpen/Package` (giữ visual identifier).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `app/components/GlobalFooter.tsx` line 63: `<p ...>HRP Co.,Ltd</p>` | Dòng phải bỏ (Owner request 11/09/2026 00:49) |
| `EV-02` | Line 59: `<div className="flex flex-col gap-3">` (cột 1) | `gap-3` = 12px giữa các dòng info — Owner muốn flatten |
| `EV-03` | Line 70: `<div className="mt-3 flex flex-col gap-2">` (contact items block) | `gap-2` = 8px giữa hotline/email/website — Owner muốn flatten |
| `EV-04` | Line 100: `<ul className="...flex flex-col gap-2 ...">` (cột 2 services) | `gap-2` = 8px giữa các services — Owner muốn flatten |
| `EV-05` | Owner message 11/09/2026 00:49 UTC+7: "canh chữ đều 2 bên với các cột Công ty tnhh.. và cột Danh mục dịch vụ" | Yêu cầu `justify-between` cho flex column trong mỗi cột |
| `EV-06` | Baseline commit `ff63083` đã push lên origin/main (turn trước) | Điểm xuất phát cho R4 diff |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Xóa `<p>HRP Co.,Ltd</p>` ở line 63 | `OWNER_DECIDED` |
| `DEC-02` | `gap-3` → `gap-0` cho cột 1 wrapper + `gap-2` → `gap-0` cho contact items block + `gap-2` → `gap-0` cho services list | `OWNER_DECIDED` (flatten strategy) |
| `DEC-03` | Thêm `justify-between` cho cả 3 flex column (cột 1 wrapper, cột 1 contact items, cột 2 services list) — items trên-cùng ở top, items dưới-cùng ở bottom, khoảng trống phân bố đều giữa | `OWNER_DECIDED` (canh đều 2 bên cho column) |
| `DEC-04` | Giữ nguyên ContactForm (cột 3) — không áp dụng justify-between (cần wrap form full height) | `TIER_1_DECIDED` |
| `DEC-05` | Commit + push thẳng lên `main` (anh đã ủy quyền Tier 1 push production trong TIER0_UI04 directive trước đó; round R4 tiếp nối R3 cùng scope footer) | `TIER_1_DECIDED` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Footer KHÔNG còn dòng text "HRP Co.,Ltd" |
| `RQ-02` | Các dòng text trong cột 1 (Công ty) chỉ cách nhau bằng line-height tự nhiên (Tailwind `leading` mặc định), không có gap thừa |
| `RQ-03` | Cột 1 wrapper + contact items block có `justify-between` — items phân bố đều top↔bottom |
| `RQ-04` | Cột 2 services list có `justify-between` — items phân bố đều top↔bottom (5 services) |
| `RQ-05` | 3-cột grid (`md:grid-cols-[1.1fr_1fr_1.1fr]`) giữ nguyên layout desktop |
| `RQ-06` | Mobile (`grid-cols-1`) vẫn stack dọc, justify-between hoạt động đúng cho từng cột |
| `RQ-07` | `npm run typecheck` exit 0 |
| `RQ-08` | `npm run build` exit 0 |
| `RQ-09` | Visual diff: chỉ thay đổi spacing + 1 dòng text xóa; không ảnh hưởng các task khác |

### 4.2 Scope boundaries

- **In:**
  - `app/components/GlobalFooter.tsx` (chỉnh wrapper class + xóa 1 `<p>`)
- **Out:**
  - Tất cả component khác
  - ContactForm internal (giữ nguyên)
  - Bottom copyright bar (giữ nguyên)
  - 3-cột grid template (giữ nguyên)

## 5. Execution Plan

| Step | Target | Intent | Verify | Stop condition |
|---|---|---|---|---|
| `STEP-01` | `app/components/GlobalFooter.tsx` line 63 | Xóa `<p ...>HRP Co.,Ltd</p>` | `grep -c "HRP Co.,Ltd" file` = 0 | — |
| `STEP-02` | Line 59, 70, 100 | Đổi `gap-3` → `gap-0`, `gap-2` → `gap-0`; thêm `justify-between` cho 3 flex column | Visual diff + local build | Nếu break layout, STOP và escalate |
| `STEP-03` | Local | Chạy `npm run typecheck` + `npm run build` | Exit 0 mỗi gate | Nếu fail, sửa hoặc STOP |
| `STEP-04` | Git | Commit + push lên `main` | `git log` + Vercel trigger | Nếu push fail, STOP |
| `STEP-05` | `docs/tasks/hrp-v6-ui-04c1-r4-footer-justify/HANDOFF.md` | Document diff + visual note | Manual review | — |
| `STEP-06` | `docs/PLANNER_HANDOVER.md` ROADMAP_CURSOR | Append note: 04c1-r4 ACCEPTED, close round | YAML valid | — |

## 6. Acceptance

| AC | Pass condition | Verification method |
|---|---|---|
| `AC-01` | Footer DOM không có text node "HRP Co.,Ltd" | `grep` hoặc DOM inspection |
| `AC-02` | Visual: các dòng trong cột 1 + cột 2 sát nhau (line-height only) | Vercel preview screenshot |
| `AC-03` | Visual: cột 1 có items phân bố đều top↔bottom (justify-between) | Vercel preview screenshot |
| `AC-04` | Visual: cột 2 services list (5 items) phân bố đều top↔bottom | Vercel preview screenshot |
| `AC-05` | `npm run typecheck` exit 0 | Shell |
| `AC-06` | `npm run build` exit 0 | Shell |
| `AC-07` | Diff scope chỉ trong `app/components/GlobalFooter.tsx` | `git diff --stat` |
| `AC-08` | Mobile layout (single column) vẫn hiển thị đúng | Vercel preview mobile view |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | `justify-between` trong cột có ít items (vd contact items chỉ 4) có thể trông "trống" nếu column không full-height | Nếu visual lạ, dùng `min-h-[...]` cho column hoặc chuyển sang `justify-start` + manual `mt-auto`; rollback bằng `git revert` |
| `RISK-02` | Footer là component dùng cho toàn site (portal + public) — đổi layout có thể ảnh hưởng các page khác | Diff scope hẹp (1 file), gate `npm run build` cover toàn site build |
| `RISK-03` | Owner chưa xem Vercel preview sẽ không biết có OK hay không | Deploy preview URL ghi trong HANDOFF; Owner review tại đó |

## 8. Open Questions

- Q1: Nếu `justify-between` làm column "trống" giữa items, anh muốn em đổi sang (a) `justify-start` + `mt-auto` cho last item, (b) thêm `min-h-[Npx]` cho column, (c) giữ `justify-between`? **[TIER_0_DECISION nếu xảy ra; dự phòng]**

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| R0 | Owner yêu cầu R4 visual fix (3 y/c: bỏ "HRP Co.,Ltd", flatten gap, justify-between) | Owner message 11/09/2026 00:49 |
| R1 | TIER_1_RESOLVED | Tier 1 (Delivery Lead) implement thẳng theo tier1.md workflow bước 4-7 — không chờ Tier 0 chốt routine choice |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v0.1` | 2026-09-11 | Initial READY_FOR_EXECUTION | R4 tiếp nối R3 (footer text hotfix), chỉnh layout theo Owner yêu cầu |
