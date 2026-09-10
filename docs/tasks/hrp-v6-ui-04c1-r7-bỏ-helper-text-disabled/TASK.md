# TASK — `hrp-v6-ui-04c1-r7-bỏ-helper-text-disabled`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-ui-04c1-r7-bỏ-helper-text-disabled` |
| Work type | `UI` |
| Assurance lane | `FAST` |
| Audit mode | `NONE` |
| Audit reason | `Pure UI copy removal trong scope footer; không business logic; FAST lane mặc định NONE` |
| Spec version | `v0.1` |
| Status | `READY_FOR_EXECUTION` |
| Planner | `Tier 1 (Delivery Lead — tier1.md mới)` |
| Baseline | `fd139d5` (R6 docs push) |
| In-scope roots | `app/components/ContactForm.tsx` |
| Forbidden paths | Tất cả components khác, footer wrapper, cột 1/2/3 |
| Required gates | `npm run typecheck` exit 0, Vercel preview visual review |

## 1. Outcome

### 1.1 User-visible outcome

Sau push lên main, footer cột 3:
- KHÔNG còn helper text `"Vui lòng liên hệ qua hotline hoặc email trong thời gian này."` (kèm icon `info`)
- KHÔNG còn `<span class="material-symbols-outlined">info</span>` 
- Form liên hệ (ContactForm) vẫn disabled nhưng không có giải thích nữa
- Khách nếu gõ submit → form no-op (silent, không thông báo)

### 1.2 Why removed

Owner directive 11/09/2026 01:13 UTC+7: "bỏ dòng này" — áp dụng cho dòng helper text trong `ContactForm.tsx` (icon "info" + nội dung "Vui lòng liên hệ qua hotline hoặc email trong thời gian này.").

### 1.3 Side-effect

- AC-06 trong `docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/ac06-helper-text.txt` trở nên STALE (AC đã PASS cho bản có helper text; giờ helper text bị bỏ).
- TIER1_HANDOVER §5.2 mới: ghi lesson "bỏ helper text = AC cũ stale → cần document vì sao AC obsolete".

## 2. Evidence

| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | Owner message 11/09/2026 01:13 UTC+7: "bỏ dòng này: nfo / Vui lòng liên hệ qua hotline hoặc email trong thời gian này." | Trỏ thẳng vào helper text trong `ContactForm.tsx` line 104-109 |
| `EV-02` | Code base hiện tại `app/components/ContactForm.tsx`: 11 dòng (line 100-110) — `{disabled && (<p>...</p>)}` với icon `info` + text nội dung | Confirmed location |
| `EV-03` | AC-06 evidence file r2 PASS | Stale sau khi bỏ |
| `EV-04` | Mục đích form disabled ban đầu: backend contact chưa implement (A6 task deferred) | Giải thích context — nhưng Owner quyết bỏ helper |

## 3. Decisions

| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Bỏ `<p>` helper text + icon `info` trong `ContactForm.tsx` | `OWNER_DECIDED` |
| `DEC-02` | Bỏ luôn comment `RQ-07` (chỉ reference AC-06 stale của task r2) | `TIER_1_DECIDED` (kỹ thuật; clean code) |
| `DEC-03` | KHÔNG đổi `disabled={true}` prop ở GlobalFooter — vẫn disable form (vì backend chưa impl) | `TIER_1_DECIDED` (giữ runtime behavior, chỉ đổi visible copy) |
| `DEC-04` | KHÔNG update AC-06 evidence file — chỉ ghi note vào TIER1_HANDOVER §5.2 rằng AC-06 đã stale | `TIER_1_DECIDED` (history file không sửa) |
| `DEC-05` | Commit + push thẳng `main` (TIER0_UI04 directive còn hiệu lực) | `TIER_1_DECIDED` |

## 4. Contract

### 4.1 Requirements

| ID | Requirement |
|---|---|
| `RQ-01` | Bỏ `<p>` block chứa helper text + icon `info` trong `ContactForm.tsx` |
| `RQ-02` | Bỏ luôn comment `RQ-07: Helper text when disabled — new copy per Owner #10` |
| `RQ-03` | KHÔNG đổi `disabled={true}` prop (runtime behavior giữ nguyên) |
| `RQ-04` | KHÔNG đổi cấu trúc form / fieldset / inputs / button |
| `RQ-05` | `npm run typecheck` exit 0 |
| `RQ-06` | Diff scope: chỉ `app/components/ContactForm.tsx` (-11 dòng) |

### 4.2 Non-goals

- KHÔNG chuyển form từ `disabled={true}` → `disabled={false}` (backend chưa impl)
- KHÔNG thêm helper text mới thay thế
- KHÔNG sửa footer wrapper / cột 1 / cột 2 / cột 3 bố trí
- KHÔNG sửa `evidence/ac06-helper-text.txt` (history file)

## 5. Execution Plan

| Step | Target | Intent | Verify |
|---|---|---|---|
| `STEP-01` | Line 100-110 ContactForm.tsx | Bỏ `<p>` helper text + comment RQ-07 | grep -c "Vui lòng liên hệ qua hotline hoặc email" = 0 |
| `STEP-02` | Local | `npm run typecheck` | exit 0 |
| `STEP-03` | Git | Commit + push `main` | Vercel trigger |
| `STEP-04` | `docs/tasks/hrp-v6-ui-04c1-r7-bỏ-helper-text-disabled/HANDOFF.md` | Document directive + diff + AC-06 stale note | manual review |
| `STEP-05` | `docs/PLANNER_HANDOVER.md` ROADMAP_CURSOR §0 | Update R6 → R7 status | YAML valid |
| `STEP-06` | `docs/TIER1_HANDOVER.md` §5.2 lesson | Add: "AC cũ có thể stale sau edit — ghi note vào lesson log" | manual review |

## 6. Acceptance

| AC | Pass condition | Verification |
|---|---|---|
| `AC-01` | `ContactForm.tsx` KHÔNG còn text "Vui lòng liên hệ qua hotline hoặc email" | `grep -c` = 0 |
| `AC-02` | `ContactForm.tsx` KHÔNG còn `<span class="material-symbols-outlined">info</span>` | grep = 0 |
| `AC-03` | `npm run typecheck` exit 0 | shell |
| `AC-04` | Diff scope: chỉ `app/components/ContactForm.tsx` (-11 dòng) | `git diff --stat` |
| `AC-05` | Vercel preview: footer cột 3 không có dòng helper text nữa (chỉ còn form + button "GỬI NGAY") | Visual |

## 7. Risk

| ID | Risk | Mitigation / rollback |
|---|---|---|
| `RISK-01` | Khách không hiểu form tại sao disabled, có thể frustrate | Tạm chấp nhận (Owner direct bỏ); nếu feedback sau, Tier 1 propose helper text khác ngắn gọn hơn |
| `RISK-02` | Visual: cột 3 cao hơn cột 2 (form cao ~280px, không có helper text thêm) → grid tự cân | Grid `1.1fr_1fr_1.1fr` chấp nhận chênh lệch |
| `RISK-03` | AC-06 evidence file r2 trở thành stale data | Note ghi rõ trong TIER1_HANDOVER §5.2; không sửa file evidence |

## 8. Open Questions

- (none — directive rõ ràng)

## 9. Planner Resolution

| Round | Decision | Reason |
|---|---|---|
| R0 | Owner ask 11/09/2026 01:13 bỏ helper text | Owner feedback trực tiếp với text match chính xác |
| R1 | TIER_1_RESOLVED | Tier 1 implement removal theo directive; không cần Tier 0 chốt routine choice |

## 10. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v0.1` | 2026-09-11 | Initial READY_FOR_EXECUTION | R7 bỏ helper text disabled trong ContactForm theo Owner directive |
