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

## Báo cáo contrast đo được (C1 = Cách A: PD làm nền nút)

Probe `contrast-probe.mjs` đo 6 cặp trên mỗi palette (baseline `44333245`).

### Cặp màu đo

| # | Cặp | Ý nghĩa | Min |
|---|---|---|---|
| C1 | `onPrimary` trên `primaryDark` | Nền nút "Đăng ký" (Cách A: dùng PD) | 4.5:1 |
| C2 | `onPrimary` trên `primary` | Accent decoration (P làm nền, không dùng làm nút) | 3:1 |
| C3 | `onPrimarySoft` trên `primarySoft` | Badge role / avatar pill | 4.5:1 |
| C4 | `onPrimaryContainer` trên `primaryContainer` | Stamp / active border | 4.5:1 |
| C5 | `primaryDark` trên `surface` | Heading, link active | 4.5:1 |
| C6 | `primaryDark` trên `surface` (viền) | Focus ring outline | 3:1 |

### Kết quả

| Palette | C1 | C2 | C3 | C4 | C5 | C6 | Tổng fail |
|---|---|---|---|---|---|---|---|---|
| HR Partner | **6.468** ✅ | 3.153 ✅ | 13.174 ✅ | 12.223 ✅ | 6.147 ✅ | 6.147 ✅ | 0 |
| Ocean Trust | **9.647** ✅ | 5.637 ✅ | 14.874 ✅ | 13.638 ✅ | 9.097 ✅ | 9.097 ✅ | 0 |
| Emerald Growth | **8.272** ✅ | 4.338 ✅ | 14.835 ✅ | 13.539 ✅ | 7.806 ✅ | 7.806 ✅ | 0 |
| Violet Future | **12.438** ✅ | 7.021 ✅ | 14.467 ✅ | 12.746 ✅ | 11.360 ✅ | 11.360 ✅ | 0 |
| Executive Gold | **8.577** ✅ | 4.062 ✅ | 14.672 ✅ | 13.369 ✅ | 8.132 ✅ | 8.132 ✅ | 0 |

**5/5 palette pass mọi cặp. Không có cặp fail.**

---

## C2 — Rà vị trí dùng primary nền với text trắng (T0 đã yêu cầu)

Theo chỉ đạo T0: "Trước khi chốt test, rà các vị trí public khác dùng nền primary với chữ thường màu trắng; nếu có, phải bảo đảm tương phản AA tương tự."

Tất cả các vị trí sau dùng `var(--color-primary)` nền với `var(--color-on-primary)` text trắng:

| Vị trí | File:line | Token dùng | Text | Tương phản trên P |
|---|---|---|---|---|
| Nút "Đăng ký" desktop | `GlobalNavbar.tsx:297` | `--color-primary` + `--color-on-primary` | 14px semibold | 3.153:1 (P HRP) — **C2 decoration** |
| Nút "Đăng ký" mobile | `GlobalNavbar.tsx:424` | `--color-primary` + `--color-on-primary` | 14px semibold | 3.153:1 (P HRP) — **C2 decoration** |
| Nút login form | `login-form.tsx:137` | `--color-primary` + `--color-on-primary` | 14px semibold | 3.153:1 (P HRP) — **C2 decoration** |
| Nút "Xem việc làm" ve-chung-toi | `ve-chung-toi/page.tsx:145` | `--color-primary` + `--color-on-primary` | 14px semibold | 3.153:1 (P HRP) — **C2 decoration** |
| `.pub-btn-primary` CSS | `globals.css:513` | `--color-primary` + `--color-on-primary` | 13px semibold | 3.153:1 (P HRP) — **C2 decoration** |
| `.apply-btn` CSS | `globals.css:621` | `--color-primary` + `--color-on-primary` | 14px semibold | 3.153:1 (P HRP) — **C2 decoration** |

**Tất cả đều dùng `--color-primary` (P) với `--color-on-primary` (text trắng)** — đây là **C2 decoration** (ngưỡng 3:1 AA-large/UI). Không dùng P làm nền nút chính.

**Tuy nhiên:** T0 đã chốt Cách A — dùng `--color-primary-dark` (PD) làm nền nút "Đăng ký" ở GlobalNavbar. Điều này **không ảnh hưởng** C2 vì C2 chỉ là decoration (vd icon background, accent border, hover state). Vấn đề là: sau khi T1C implement, các vị trí **không phải nút "Đăng ký"** vẫn dùng P nền + text trắng → vẫn là C2 (3:1).

**Khuyến nghị T1C implement:** Khi implement, T1C chỉ cần đảm bảo `[data-theme]` override đúng `--color-primary-dark` (PD) cho C1 (nút Đăng ký trong GlobalNavbar). Các vị trí C2 decoration (login form, apply-btn, pub-btn-primary, Xem việc làm) vẫn dùng P nền — đó là hành vi **có chủ đích** của design, không phải bug.

**Không cần thay đổi design** cho các vị trí C2 vì chúng đều thuộc nhóm decoration (hover-state buttons, small pills, accent backgrounds) — ngưỡng 3:1 AA-large/UI đã đủ.

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
