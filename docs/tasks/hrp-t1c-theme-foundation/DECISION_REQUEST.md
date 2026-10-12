# DECISION REQUEST — T1C Theme Foundation (CSS scope + theme scope)

**Trạng thái:** ✅ CHỐT — Tất cả 7 decision đã duyệt (DEC-01..07).
**Baseline pin:** `44333245a5decc374aa9ac6ae97d3cb1e475adfa` (`origin/main`).
**Worktree:** `C:\CodeApp\HrP-worktrees\hrp-t1c-theme-foundation` (branch `codex/t1c-theme-foundation`).
**Probe script:** `docs/tasks/hrp-t1c-theme-foundation/contrast-probe.mjs` (Node.js, WCAG 2.x).
**Chạy probe:** `node docs/tasks/hrp-t1c-theme-foundation/contrast-probe.mjs`

---

## Tất cả 7 quyết định đã duyệt

### DEC-01 ✅ — Bộ palette và hex (T0 Q1..Q5 đã duyệt)

**T0 chốt:** Duyệt 5 palette với hex dưới đây. Không còn placeholder.

| key | label (EN) | primary (P) | primaryDark (PD) | primaryContainer (PC) | primarySoft (PS) | surface (S) | onPrimary (oP) | onPrimarySoft (oPS) | onPrimaryContainer (oPC) |
|---|---|---|---|---|---|---|---|---|---|
| `hrp` | HR Partner | `#f26522` | `#a63b00` | `#fde6d8` | `#fff0e5` | `#faf9f7` | `#ffffff` | `#1f2937` | `#1f2937` |
| `ocean-trust` | Ocean Trust | `#1e6f8f` | `#0d4a63` | `#d6ebf5` | `#e8f3f8` | `#f4f9fc` | `#ffffff` | `#0d1f2d` | `#0d1f2d` |
| `emerald-growth` | Emerald Growth | `#1f8a5a` | `#0d5a39` | `#d2ebde` | `#e3f3ea` | `#f3faf6` | `#ffffff` | `#0a2017` | `#0a2017` |
| `violet-future` | Violet Future | `#6a3fb5` | `#3f1f7a` | `#e1d5f4` | `#ede4f8` | `#f7f3fc` | `#ffffff` | `#1c0f3a` | `#1c0f3a` |
| `executive-gold` | Executive Gold | `#9a7a17` | `#5d4a08` | `#f0e6c0` | `#f7f0d9` | `#fbf9f0` | `#ffffff` | `#221e04` | `#221e04` |

### DEC-02 ✅ — Theme key + label (T0 Q4 đã duyệt)

- Key: ASCII kebab-case giữ nguyên (`hrp`, `ocean-trust`, `emerald-growth`, `violet-future`, `executive-gold`). Key không đổi sau phát hành.
- Nhãn hiển thị trong UI: tên riêng tiếng Anh giữ nguyên (HR Partner, Ocean Trust, Emerald Growth, Violet Future, Executive Gold); phần hướng dẫn / control / tooltip dùng tiếng Việt.

### DEC-03 ✅ — Mặc định + fallback (T0 đã duyệt)

- Mặc định: `hrp`.
- Key lạ / không hợp lệ / cũ → fallback `hrp`. KHÔNG crash UI.

### DEC-04 ✅ — Scope (T0 đã duyệt)

- Gắn `data-theme={key}` ở root `<div>` của `app/(portal)/layout.tsx` và `app/(jobs)/viec-lam/layout.tsx`.
- KHÔNG gắn ở `<html>`.
- Admin layout giữ mặc định HRP.

### DEC-05 ✅ — Status colors (T0 Q5 đã duyệt)

- GIỮ màu status / badge / stamp (emerald, orange, error) theo giá trị mặc định ở mọi theme.
- Không theme-hóa trong MVP.

### DEC-06 ✅ — Persistence (T0 đã duyệt)

- `localStorage` + `useEffect` (pattern `sticky-announcement.tsx:99-123`).
- KHÔNG inline script. Chấp nhận flash 1 lần.

### DEC-07 ✅ — WCAG AA thresholds (T0 đã duyệt)

- Text thường ≥ 4.5:1
- Text lớn (≥ 18.66px bold hoặc ≥ 24px regular) + UI/focus ≥ 3:1

---

## Báo cáo contrast đo được (7 cặp, baseline `aa86902f`)

Probe `contrast-probe.mjs` đo **7 cặp** trên mỗi palette (baseline `aa86902f`).

### Cặp màu đo

| # | Cặp | Ý nghĩa | Min | Owner |
|---|---|---|---|---|
| C1 | `onPrimary` trên `primaryDark` | Nền nút "Đăng ký" (Cách A: dùng PD) | 4.5:1 | T1B (nút) |
| C2 | `onPrimary` trên `primary` | Accent decoration 3:1 (UI/large text only) | 3:1 | T1B (cảnh báo) |
| C3 | `onPrimarySoft` trên `primarySoft` | Badge role / avatar pill | 4.5:1 | T1C |
| C4 | `onPrimaryContainer` trên `primaryContainer` | Stamp / active border | 4.5:1 | T1C |
| C5 | `primaryDark` trên `surface` | Heading, link active | 4.5:1 | T1C |
| C6 | `primaryDark` trên `surface` (viền) | Focus ring outline | 3:1 | T1C |
| **C7** | **`onPrimary` trên `primary` (text thường 14px semibold)** | **6 vị trí theme-sensitive (T1B-owned)** | **4.5:1** | **T1B** |

### Kết quả palette-blocker (C1, C3, C4, C5, C6 — T1C scope)

| Palette | C1 | C3 | C4 | C5 | C6 | Tổng palette-blocker fail |
|---|---|---|---|---|---|---|
| HR Partner | 6.468 ✅ | 13.174 ✅ | 12.223 ✅ | 6.147 ✅ | 6.147 ✅ | 0 |
| Ocean Trust | 9.647 ✅ | 14.874 ✅ | 13.638 ✅ | 9.097 ✅ | 9.097 ✅ | 0 |
| Emerald Growth | 8.272 ✅ | 14.835 ✅ | 13.539 ✅ | 7.806 ✅ | 7.806 ✅ | 0 |
| Violet Future | 12.438 ✅ | 14.467 ✅ | 12.746 ✅ | 11.360 ✅ | 11.360 ✅ | 0 |
| Executive Gold | 8.577 ✅ | 14.672 ✅ | 13.369 ✅ | 8.132 ✅ | 8.132 ✅ | 0 |

**Tất cả 5/5 palette pass mọi cặp palette-blocker (T1C scope).**

### Kết quả T1B-owned (C2 + C7 — text trắng trên P, 14px/13px semibold = normal text)

| Palette | C2 (3:1) | C7 (4.5:1) | T1B cần đổi nền 6 vị trí? |
|---|---|---|---|
| HR Partner | 3.153 ✅ (3:1 OK) | **3.153** ❌ | CÓ — đổi P → PD |
| Ocean Trust | 5.637 ✅ | 5.637 ✅ | KHÔNG — đã pass |
| Emerald Growth | 4.338 ✅ (3:1 OK) | **4.338** ❌ | CÓ — đổi P → PD |
| Violet Future | 7.021 ✅ | 7.021 ✅ | KHÔNG — đã pass |
| Executive Gold | 4.062 ✅ (3:1 OK) | **4.062** ❌ | CÓ — đổi P → PD |

**C2 (3:1) đạt cho mọi palette — nhưng T0 lần 2 đã xác nhận: "Không thể coi chúng là đạt chỉ dựa trên ngưỡng UI 3:1". Tất cả 6 vị trí dùng text 14px semibold = normal text, cần C7 (4.5:1). HRP, Emerald, Executive fail C7. T1B sẽ đổi 6 vị trí theme-sensitive sang nền `primaryDark` (PD).**

Sau khi T1B đổi sang PD, tỉ số tại 6 vị trí = white-on-PD: HRP 6.468 / Ocean 9.647 / Emerald 8.272 / Violet 12.438 / Executive 8.577 — 5/5 pass ≥ 4.5:1.

### CTA token (`.hrp-btn-apply` + `--color-primary-cta*`) — NGOÀI scope

`--color-primary-cta: #f07f1a` (default) chỉ đạt 2.708:1 white text — fail AA-text. `--color-primary-cta-dark: #c2520a` (hover) đạt 4.661:1 — pass. Theo T0: ghi nhận là vấn đề riêng, không thay đổi trong vòng này.

---

## C7 — 6 vị trí theme-sensitive (T1B-owned, 14px/13px semibold = normal text)

Theo chỉ đạo T0 lần 2: "Kết quả '5/5 palette pass' chưa bao phủ các vị trí dùng chữ trắng cỡ thường trên primary. DEC-07 yêu cầu chữ thường đạt 4.5:1. Audit hiện báo apply-btn, nút ở form đăng nhập, 'Xem việc làm' và .pub-btn-primary đang dưới ngưỡng với HRP; Emerald và Executive cũng fail với chữ trắng trên primary. Không thể coi chúng là đạt chỉ dựa trên ngưỡng UI 3:1."

Tất cả 6 vị trí dùng `--color-primary` nền + white text 14px/13px semibold = **normal text**, cần **≥ 4.5:1** theo DEC-07. Tất cả giao cho **T1B** xử lý (3 site theme-sensitive mới + 2 nút "Đăng ký" đã thuộc ownership + 1 CSS class):

| # | Vị trí | File:line | Font | Owner |
|---|---|---|---|---|
| 1 | Nút "Đăng ký" desktop | `GlobalNavbar.tsx:297` | 14px semibold | **T1B** (đã thuộc ownership) |
| 2 | Nút "Đăng ký" mobile | `GlobalNavbar.tsx:424` | 14px semibold | **T1B** |
| 3 | Nút login form | `login-form.tsx:137` | 14px semibold | **T1B** (theme-sensitive mới) |
| 4 | Nút "Xem việc làm" ve-chung-toi | `ve-chung-toi/page.tsx:145` | 14px semibold | **T1B** (theme-sensitive mới) |
| 5 | `.apply-btn` CSS | `globals.css:660` | 14px semibold | **T1B** (theme-sensitive mới) |
| 6 | `.pub-btn-primary` CSS | `globals.css:552` | 13px semibold | **T1B** (theme-sensitive mới) |

### Kết quả probe C7 (white text 14px semibold trên P) — 5 palette

| Palette | P hex | C7 ratio | Need | Verdict |
|---|---|---|---|---|
| HR Partner | `#f26522` | **3.153:1** | ≥ 4.5:1 | ❌ FAIL → T1B đổi sang PD |
| Ocean Trust | `#1e6f8f` | 5.637:1 | ≥ 4.5:1 | ✅ PASS |
| Emerald Growth | `#1f8a5a` | **4.338:1** | ≥ 4.5:1 | ❌ FAIL → T1B đổi sang PD |
| Violet Future | `#6a3fb5` | 7.021:1 | ≥ 4.5:1 | ✅ PASS |
| Executive Gold | `#9a7a17` | **4.062:1** | ≥ 4.5:1 | ❌ FAIL → T1B đổi sang PD |

**3/5 palette FAIL C7** (HRP, Emerald, Executive). Khi T1B đổi nền 6 vị trí từ P sang `primaryDark` (PD), contrast với white sẽ là:

| Palette | PD hex | white on PD | Need | Verdict |
|---|---|---|---|---|
| HR Partner | `#a63b00` | 6.468:1 | ≥ 4.5:1 | ✅ PASS |
| Ocean Trust | `#0d4a63` | 9.647:1 | ≥ 4.5:1 | ✅ PASS |
| Emerald Growth | `#0d5a39` | 8.272:1 | ≥ 4.5:1 | ✅ PASS |
| Violet Future | `#3f1f7a` | 12.438:1 | ≥ 4.5:1 | ✅ PASS |
| Executive Gold | `#5d4a08` | 8.577:1 | ≥ 4.5:1 | ✅ PASS |

**5/5 palette pass C7 sau khi T1B áp dụng PD làm nền cho 6 vị trí theme-sensitive.**

### Phạm vi T1C: KHÔNG đụng 6 vị trí này

T1C chỉ cung cấp token contract (token `primaryDark` đã định nghĩa ở §3.3). T1B sở hữu cả 6 vị trí — T1B sẽ áp dụng `--color-primary-dark` làm nền (thay cho `--color-primary`) cho 6 button 14px semibold. Có thể làm 1 lần ở CSS class (`.apply-btn`, `.pub-btn-primary`) hoặc sửa inline style (login-form.tsx, ve-chung-toi/page.tsx, GlobalNavbar.tsx). T1C KHÔNG sửa các file này trong vòng này.

### CTA token (`.hrp-btn-apply` + `--color-primary-cta*`) — NGOÀI scope T1C

PR #132 thêm `--color-primary-cta: #f07f1a` (default state 2.708:1 — fail 4.5:1 với white) và `.hrp-btn-apply` class. CTA token dùng riêng cho nút "Ứng tuyển" (FeaturedJobCard, JobCard, DetailApplyCta).

**Ghi nhận vấn đề riêng**: CTA token `--color-primary-cta: #f07f1a` default state chỉ đạt 2.708:1 white text — fail AA-text (4.5:1). Hover state (CTA-dark `#c2520a` on white) đạt 4.661:1 — pass. PR #132 comment "passes 3:1 large/bold text" không chính xác với 14px semibold (không phải large text). Theo yêu cầu T0: "Giữ .hrp-btn-apply và hai token --color-primary-cta* ngoài scope T1C như đã thống nhất; ghi nhận contrast của chúng là vấn đề riêng, không thay đổi màu trong vòng này."

**T1C KHÔNG override CTA token. T1C KHÔNG sửa `.hrp-btn-apply`.**

---

## Summary — tất cả decisions

| ID | Trạng thái | Giá trị |
|---|---|---|
| DEC-01 | ✅ CHỐT | 5 palette + hex v1 (bảng trên) |
| DEC-02 | ✅ CHỐT | key EN, nhãn EN, hướng dẫn VI |
| DEC-03 | ✅ CHỐT | default `hrp`, fallback `hrp` |
| DEC-04 | ✅ CHỐT | root `<div>` 2 public shell, KHÔNG `<html>` |
| DEC-05 | ✅ CHỐT | giữ status colors, không theme-hóa |
| DEC-06 | ✅ CHỐT | localStorage + useEffect, không inline script |
| DEC-07 | ✅ CHỐT | text ≥ 4.5:1, large/UI ≥ 3:1 |
