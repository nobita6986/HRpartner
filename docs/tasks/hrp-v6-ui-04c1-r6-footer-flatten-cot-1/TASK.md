# TASK — `hrp-v6-ui-04c1-r6-footer-flatten-cot-1`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04c1-r6-footer-flatten-cot-1` |
| Work type | `UI` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | `Pure visual flatten trong scope footer; không business logic; FAST lane mặc định NONE` |
| Spec version | `v0.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1 (Delivery Lead — tier1.md mới)` |
| Baseline | `15f6b27` (R5 push) |
| In-scope roots | `app/components/GlobalFooter.tsx` (chỉ cột 1: Công ty) |
| Forbidden paths | Tất cả components khác, ContactForm, footer bottom, cột 2/3 |
| Required gates | `npm run typecheck` exit 0, Vercel preview visual review |

## 1. Outcome

### 1.1 User-visible outcome

Sau push lên main, https://hrpvietnam.com/ footer:
- **Cột Công ty**: 7 dòng flat list (title VN + title EN + địa chỉ wrap 3 dòng + 2 hotline + email + website) cách nhau đều **8px** — visual đồng đều, không còn cảm giác "cách xa" giữa các nhóm
- **Cột Dịch vụ**: giữ nguyên R5 (5 services items gap-y-3 12px)
- **Cột Liên hệ**: giữ nguyên (ContactForm panel)

### 1.2 Root cause của R5 fail (analyzer)

Cột 1 có cấu trúc 2 cấp:
- Cấp 1 (wrapper flex col gap-y-3): title, subtitle, address, **`<div>` con (contact items)**
- Cấp 2 (inner div gap-y-2): 4 contact items

→ gap 12px giữa wrapper children + gap 8px giữa inner contact items → tổng visual gap giữa `address` ↔ `hotline 1` ≈ 12px, nhưng giữa `hotline 1` ↔ `hotline 2` chỉ 8px. Không đều → tạo cảm giác "cách xa".

### 1.3 Solution (refactor)

Flatten toàn bộ 7 dòng cột 1 ngang cấp trong 1 flex column duy nhất với `gap-y-2` (8px) đều cho mọi dòng. Bỏ nested div cho contact items.

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | Owner message 11/09/2026 01:10: "sao tao thấy mày ngu thế nhỉ, nhìn bên cột Công ty mà xem, các dòng nó cách nhau xa thế ? so với cột Danh mục ấy" | R5 reject — gap không đều giữa các nhóm do cấu trúc 2 cấp |
| `EV-02` | Screenshot 11/09/2026 01:10 (Owner cung cấp) | Visual show R5 spacing không đều so với cột Dịch vụ |
| `EV-03` | Commit `15f6b27` (R5) | Baseline cho R6 refactor |
| `EV-04` | Owner pick AskQuestion option `refactor-struct` 11/09/2026 01:10 | Tier 1 có directive đúng hướng refactor, không đoán pixel |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Flatten cột 1: bỏ nested div cho contact items, đưa 4 contact items lên cùng cấp với title/subtitle/address | `OWNER_DECIDED` (Q1 refactor-struct) |
| `DEC-02` | Wrapper class cột 1: `flex flex-col gap-y-2` (8px đều cho mọi dòng) | `TIER_1_DECIDED` (kỹ thuật) |
| `DEC-03` | Giữ nguyên cột 2 (Dịch vụ) + cột 3 (Liên hệ) — không sửa | `TIER_1_DECIDED` (R5 spacing cột 2 OK theo R3 baseline) |
| `DEC-04` | Commit + push thẳng `main` (TIER0_UI04 directive còn hiệu lực) | `TIER_1_DECIDED` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Cột 1 wrapper: `flex flex-col gap-y-2` |
| `RQ-02` | 7 children flat: `<h3>` (title VN) + `<p>` (title EN) + `<p>` (address) + 4 `<a>` (hotline 1, hotline 2, email, website) |
| `RQ-03` | Bỏ nested `<div>` cho contact items (không còn DOM node trung gian) |
| `RQ-04` | Tất cả 7 children ngang cấp DOM, gap đều 8px giữa chúng |
| `RQ-05` | KHÔNG sửa cột 2, cột 3, ContactForm, footer bottom |
| `RQ-06` | `npm run typecheck` exit 0 |
| `RQ-07` | Diff scope: chỉ `app/components/GlobalFooter.tsx` |

### 4.2 Non-goals

- KHÔNG đổi text content
- KHÔNG đổi semantic HTML tag
- KHÔNG đổi styled classes trên từng item (giữ min-h-11 flex items-center ...)
- KHÔNG đổi spacing cột 2, services list, ContactForm

## 5. Execution Plan

| Step | Target | Intent | Verify |
|---|---|---|---|
| `STEP-01` | Line ~59 (cột 1 wrapper) | Comment + className: `gap-y-3` → `gap-y-2` | grep |
| `STEP-02` | Line ~67-103 (nested `<div>` contact items + 4 `<a>` inside) | Bỏ `<div className="flex flex-col gap-y-2">` wrapper; indent 4 `<a>` lên cùng cấp | grep |
| `STEP-03` | Local | Chạy `npm run typecheck` | exit 0 |
| `STEP-04` | Git | Commit + push `main` | Vercel trigger |
| `STEP-05` | `docs/tasks/hrp-v6-ui-04c1-r6-footer-flatten-cot-1/HANDOFF.md` | Document diff + root cause + flatten rationale | manual review |
| `STEP-06` | `docs/PLANNER_HANDOVER.md` ROADMAP_CURSOR §0 | Update R5 → R6 status | YAML valid |
| `STEP-07` | `docs/TIER1_HANDOVER.md` §5.2 lesson learned | Thêm vào: "khi flatten items trong cùng column, đưa hết lên cùng cấp DOM, không nest thêm div" | manual review |

## 6. Acceptance

| AC | Pass condition | Method |
|---|---|---|
| `AC-01` | Cột 1 có 7 children flat ngang cấp DOM | DOM inspection / DevTools |
| `AC-02` | Visual: 7 dòng cách nhau đều 8px, không có "khoảng trống lớn" giữa address ↔ hotline 1 | Vercel preview |
| `AC-03` | Cột 1 spacing đồng đều với cột 2 (cùng cảm giác thoáng) | visual compare |
| `AC-04` | `npm run typecheck` exit 0 | Shell |
| `AC-05` | Diff scope: chỉ `app/components/GlobalFooter.tsx` (-13/+13 net 0) | `git diff --stat` |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Flatten làm cột 1 wrap address cao hơn, hotline items gần địa chỉ quá (~8px) | Nếu xảy ra, có thể gộp title VN + title EN trong 1 line (`<p>` thay `<h3>`) hoặc dùng `leading-tight` |
| `RISK-02` | DOM depth giảm có thể ảnh hưởng screen reader landmarks | aria-label header không có; nếu cần thì thêm `<h3>` (đã có) |
| `RISK-03` | Nếu R6 vẫn chưa OK, Tier 1 PAUSE hỏi Owner px reference | TASK §8 Q1 — đã thực hiện ở R5 |

## 8. Open Questions

- (none — Q1 từ R5 đã được Owner quyết bằng option `refactor-struct`)

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| R0 | Owner ask 11/09/2026 01:10 flatten column 1 | Owner feedback trực tiếp |
| R1 | TIER_1_RESOLVED | Tier 1 implement refactor theo directive; không cần Tier 0 chốt routine choice |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v0.1` | 2026-09-11 | Initial READY_FOR_EXECUTION | R6 flatten cột 1 = 7 children ngang cấp với `gap-y-2` |
