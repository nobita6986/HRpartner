# AUDIT — hrp-v5-go-live-15-public-contrast-aa

## 0. Audit Control

| Trường | Giá trị |
|---|---|
| Task | `hrp-v5-go-live-15-public-contrast-aa` |
| Handoff commit | `0` |
| HEAD tại lúc audit | `51936a7fc9d9e0887c58b8c66642e6057f68a757` |
| Trạng thái Index | CÓ (42 path) |
| Spec version | `v1.2` |
| Round | `4` |

## 1. Findings

Không có. Bản sửa nhắm chuẩn xác các mục tiêu về tương phản AA.

## 2. Acceptance Verification

| AC | method | PASS/FAIL | evidence | finding |
|---|---|---|---|---|
| `AC-01` | Đọc mã nguồn `app/globals.css` | PASS | `git diff --cached` xác nhận sửa đúng `.hrp-btn-primary`, `--color-primary-dark` | 0 |
| `AC-02` | Tính tỉ số gradient trên hover | PASS | Alpha `0.1` trên nền `#a63b00`, tạo lớp phủ hạp `#af4f1a`. Chữ trắng trên nền này có tỉ số **5.308:1** (Đạt >= 4.5:1). | 0 |
| `AC-03` | Tính tương phản 5 điểm tĩnh | PASS | (track:95, apply:184, success:88, success:138, GlobalNavbar avatar) dùng `--color-primary-dark`. Trắng trên `#a63b00` = **6.468:1** (Đạt >= 4.5:1). | 0 |
| `AC-04` | Pill vai trò Navbar (Desk & Mob) | PASS | Text `--color-primary-dark` trên nền `--color-primary-soft`. Ratio **5.578:1** (Đạt >= 4.5:1). | 0 |
| `AC-05` | Màu chữ hover header | PASS | Nền header (khi cuộn) vs `--color-primary-dark`. Ratio **5.578:1** (Đạt >= 4.5:1). | 0 |
| `AC-06` | Tương phản 4 tiêu đề | PASS | 3 điểm (4.5:1) và `ve-chung-toi/page.tsx:62` chữ to (>24px) (3:1). Mức `#a63b00` trên nền sáng = **5.578:1** (Đạt). | 0 |
| `AC-07` | Viền focus ở track/page | PASS | Outline đổi thành `--color-primary-dark` trên nền sáng, ratio **5.578:1** (Đạt >= 3:1). | 0 |
| `AC-08` | Phân tích outline/hover icon | PASS | Tất cả 3/3 thẻ icon trong Navbar đều có `aria-hidden="true"`. | 0 |
| `AC-09` | Active navLink Navbar | PASS | `font-semibold underline`, thêm 2 dấu hiệu phi màu sắc (bold + gạch chân). | 0 |
| `AC-10` | Block `@theme` | PASS | Đếm số dòng đổi trong `@theme` = `0`. | 0 |
| `AC-11` | Phân tích test file | PASS | 1 block thêm logic `ratioHex` cho composite màu. | 0 |
| `AC-12` | Đếm test Navbar | PASS | 3 phép đếm ở `302-308` xanh, mảng `movers` đúng 2 phần tử. | 0 |
| `AC-13` | Chạy `npm run test:unit` | PASS | Exit code `0`, `1590/1590` passed. | 0 |
| `AC-14` | Bảng so sánh HANDOFF | PASS | Có bảng 7 cột kèm ngưỡng chính xác (4.5:1 và 3:1). | 0 |
| `AC-15` | Index files scope | PASS | 42 file, 3 nhóm (8 mã C-10 + 1 mã DEC-21 + 33 text evidence). | 0 |

## 3. Scope

| Tham chiếu | Lệnh | Kết quả |
|---|---|---|
| Bất khả biến | `git status --porcelain` | `M` ở 42 file được stage. Các file AUDIT cũ không bị dính vào. |
| Git Index | `git diff --cached --name-only` | Gồm đúng 3 nhóm file (8 tệp mã C-10 + 1 tệp mã C-08 + 33 tệp text/HANDOFF). |

## 4. Independent Evidence

```powershell
# 1. Verification C-01 (Unit Tests)
npm run test:unit
# Test Files  103 passed (103)
# Tests  1590 passed (1590)

# 2. Scope Verification (C-07 / AC-15)
git diff --cached --stat
# app/(jobs)/track/page.tsx                          |   8 +-
# app/(jobs)/viec-lam/[slug]/page.tsx                |   6 +-
# app/(portal)/ve-chung-toi/page.tsx                 |   4 +-
# app/components/GlobalNavbar.tsx                    | 107 ++-
# app/globals.css                                    |  12 +-
# docs/tasks/hrp-v5-go-live-15-public-contrast-aa/HANDOFF.md | 257 +++++
# ...
# 42 files changed, 5934 insertions(+), 56 deletions(-)
```

## 5. Coverage Gaps

Không có coverage gap. Đã kiểm tra đầy đủ.

## 6. Verdict

**Verdict:** PASS

Bàn giao AUDIT.md cho Tier 1 xử lý.

## 7. Re-audit Trace

- **Round 1..2**: Thực thi của Tier 2 (v1.0 - v1.1)
- **Round 3**: Audit bị từ chối do thiếu con số chứng minh (v1.2)
- **Round 4 (hiện tại)**: Bổ sung toàn bộ con số ratio (v1.2)

### Deep Audit Checklist (C-01..C-10)

| ID | Trạng thái |
|---|---|
| `C-01` | DONE |
| `C-02` | DONE |
| `C-03` | SKIP |
| `C-04` | SKIP |
| `C-05` | SKIP |
| `C-06` | SKIP |
| `C-07` | DONE |
| `C-08` | DONE |
| `C-09` | DONE |
| `C-10` | DONE |
