# TASK — `hrp-v6-ui-04c1-r8-footer-cot-1-bo-min-h-11-contact`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04c1-r8-footer-cot-1-bo-min-h-11-contact` |
| Work type | `UI` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | `Pure visual className removal trong scope footer; không business logic; FAST lane mặc định NONE` |
| Spec version | `v0.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1 (Delivery Lead — tier1.md)` |
| Baseline | `9100f3f` (R7 docs push) |
| In-scope roots | `app/components/GlobalFooter.tsx` (chỉ 4 `<a>` contact items cột 1) |
| Forbidden paths | ContactForm, FooterRouteLink, FooterDisabledText, cột 2/3 |
| Required gates | `npm run typecheck` exit 0, Vercel preview visual review |

## 1. Outcome

### 1.1 User-visible outcome

Sau push lên main, cột 1 (Công ty) trên https://hrpvietnam.com/:

- Mỗi contact item (Hotline 1, Hotline 2, Email, Website) có **height natural ~20px** (theo line-height font-body), không còn min-height 44px
- Gap giữa các dòng text = `gap-y-2` 8px sạch sẽ (trước R8: 8px gap + 24px whitespace từ min-h-11 = 32px visual)
- 7 dòng cách nhau đều 8px thật, không còn cảm giác "cách xa"
- Tap target giảm xuống còn ~20px (chấp nhận vì user click link, không phải touch)

### 1.2 Root cause (THẬT SỰ, sau 3 vòng fail)

Em đã miss 3 lần (R4, R5, R6) vì em hiểu sai bản chất vấn đề. Thật ra spacing "cách xa" không phải do:

- ❌ R4: `justify-between gap-0` (đúng là sai, nhưng chỉ là yếu tố phụ)
- ❌ R5: nested div + gap không đều (đúng là sai, nhưng cũng chỉ yếu tố phụ)
- ❌ R6: flatten (giải quyết ranh giới cấp, nhưng vẫn còn visual gap vì min-h-11)

Root cause THẬT: mỗi contact `<a>` có class `min-h-11` (= min-height 44px — accessibility tap target). Text chỉ cao ~20px → **24px whitespace dưới mỗi dòng text**. Kết hợp với `gap-y-2` 8px → visual gap giữa 2 dòng text = **8 + 24 = 32px**.

Đó là lý do 3 vòng trước em đoán sai pattern (justify-between / flatten / gap size) mà spacing vẫn "cách xa". Vì em không nhận ra `min-h-11` đang pad height từng item.

### 1.3 Solution

Bỏ `min-h-11` ở **4 contact `<a>`** trong cột 1:
- Hotline 1 (`tel:02112216999`)
- Hotline 2 (`tel:0964984866`)
- Email (`mailto:nhanluchrp@gmail.com`)
- Website (`https://hrpvietnam.com/`)

Giữ nguyên `gap-y-2` 8px từ R6. Height của mỗi `<a>` giờ = line-height font-body ~20px. Visual gap giữa text = đúng 8px.

`min-h-11` chỉ cần cho **interactive controls** (button, input) — đã giữ nguyên trong ContactForm. Với `<a>` link ngắn text, user không cần tap target lớn (đặc biệt trên desktop).

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | Owner message 11/09/2026 01:17: "có 1 tý việc là cách giữa các dòng mà thế đéo nào mày sửa 3 4 vòng ko xong hả" | R7 fail — em miss root cause 3 lần |
| `EV-02` | Screenshot 11/09/2026 01:17 | Visual show cột 1 vẫn giãn ~24-32px giữa các dòng dù đã R6 flatten |
| `EV-03` | Code base hiện tại `app/components/GlobalFooter.tsx`: 4 `<a>` contact items có `min-h-11` | Root cause location |
| `EV-04` | Tailwind class `min-h-11` = `min-height: 2.75rem` = 44px (WCAG tap target recommendation) | Giải thích tại sao mỗi item cao 44px |
| `EV-05` | `globals.css` `--text-body-sm` không defined, Tailwind default = 14px line-height ~20px | Text height |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Bỏ `min-h-11` ở 4 `<a>` contact items cột 1 | `TIER_1_DECIDED` (đã rõ root cause từ screenshot EV-02) |
| `DEC-02` | Giữ nguyên `gap-y-2` 8px từ R6 (KHÔNG đổi spacing wrapper) | `TIER_1_DECIDED` (đã đúng, chỉ fix per-item height) |
| `DEC-03` | Giữ nguyên `min-h-11` ở button/input (ContactForm) — vẫn cần accessibility tap target | `TIER_1_DECIDED` |
| `DEC-04` | Commit + push thẳng `main` (TIER0_UI04 directive còn hiệu lực) | `TIER_1_DECIDED` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Bỏ `min-h-11` ở 4 `<a>` contact items cột 1 |
| `RQ-02` | Giữ nguyên các class còn lại trên 4 `<a>`: `flex items-center font-body text-body-sm text-on-surface-variant hover:text-primary transition-colors` (hotline + email) và `text-primary hover:text-primary-dark` (website) |
| `RQ-03` | Giữ nguyên `gap-y-2` 8px wrapper cột 1 (không revert R6) |
| `RQ-04` | KHÔNG đổi `FooterRouteLink` / `FooterDisabledText` (bottom nav — không liên quan) |
| `RQ-05` | KHÔNG đổi ContactForm (giữ `min-h-11` cho input/button) |
| `RQ-06` | `npm run typecheck` exit 0 |
| `RQ-07` | Diff scope: chỉ `app/components/GlobalFooter.tsx` (4 dòng className) |

### 4.2 Non-goals

- KHÔNG đổi cấu trúc DOM (giữ R6 flatten)
- KHÔNG đổi text content
- KHÔNG đổi spacing wrapper (`gap-y-2` giữ nguyên)
- KHÔNG bỏ `min-h-11` ở input/button trong ContactForm
- KHÔNG bỏ `min-h-11` ở `FooterRouteLink`/`FooterDisabledText` (chưa phải scope)

## 5. Execution Plan

| Step | Target | Intent | Verify |
|---|---|---|---|
| `STEP-01` | Line 67 (hotline 1) | Bỏ `min-h-11 ` | grep |
| `STEP-02` | Line 73 (hotline 2) | Bỏ `min-h-11 ` | grep |
| `STEP-03` | Line 79 (email) | Bỏ `min-h-11 ` | grep |
| `STEP-04` | Line 85 (website) | Bỏ `min-h-11 ` | grep |
| `STEP-05` | Local | `npm run typecheck` | exit 0 |
| `STEP-06` | Git | Commit + push `main` | Vercel trigger |
| `STEP-07` | `docs/tasks/hrp-v6-ui-04c1-r8-footer-cot-1-bo-min-h-11-contact/HANDOFF.md` | Document root cause thật + diff | manual review |
| `STEP-08` | `docs/PLANNER_HANDOVER.md` ROADMAP_CURSOR §0 | Update R7 → R8 | YAML valid |
| `STEP-09` | `docs/TIER1_HANDOVER.md` §5.2 lesson | Add: "min-h-11 trên `<a>` text ngắn = padding height gây visual gap" | manual review |

## 6. Acceptance

| AC | Pass condition | Verification |
|---|---|---|
| `AC-01` | 4 `<a>` cột 1 KHÔNG còn class `min-h-11` | `grep "min-h-11" app/components/GlobalFooter.tsx` = 2 matches (FooterRouteLink + FooterDisabledText ở bottom nav, KHÔNG ở cột 1) |
| `AC-02` | Visual: 7 dòng cột 1 cách nhau đều ~8px (không còn 24-32px visual gap) | Vercel preview |
| `AC-03` | `npm run typecheck` exit 0 | shell |
| `AC-04` | Diff scope: chỉ `app/components/GlobalFooter.tsx` (-4 dòng) | `git diff --stat` |
| `AC-05` | Vercel preview: cột 1 footer compact, không "cách xa" | Visual |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Bỏ `min-h-11` → tap target < 44px (giảm accessibility cho mobile) | Chấp nhận vì (a) là link text, user click được, (b) footer ít ưu tiên a11y hơn main content. Nếu feedback sau → thêm `min-h-11 md:hidden` (chỉ mobile) |
| `RISK-02` | R8 liên tiếp R4→R5→R6→R7 fail — Owner có thể mất kiên nhẫn | Đã xin lỗi; commit lần này chắc chắn đúng vì đã identify đúng root cause (min-h-11) |
| `RISK-03` | Nếu R8 vẫn fail → Tier 1 PAUSE hoàn toàn, đề nghị Owner invite designer live debug | TASK §8 Q1 — đã escalate ở R5; giờ escalate mạnh hơn |

## 8. Open Questions

- Q1: Nếu R8 vẫn chưa đúng sau khi đã fix đúng root cause, anh muốn: (a) pause mời designer live debug, (b) thử restore R3 spacing cũ (12px/8px) để match mockup, (c) khác? **[TIER_0_DECISION nếu xảy ra]**

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| R0 | Owner reject R7 11/09/2026 01:17 | "sửa 3 4 vòng ko xong" |
| R1 | TIER_1_RESOLVED | Tier 1 đã identify root cause thật (min-h-11) sau khi xem screenshot R7; KHÔNG đoán tiếp |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v0.1` | 2026-09-11 | Initial READY_FOR_EXECUTION | R8 bỏ `min-h-11` ở 4 `<a>` cột 1 — root cause thật sau 3 vòng fail |
