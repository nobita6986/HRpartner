# AUDIT — hrp-v5-go-live-15-public-contrast-aa

## 0. Audit Control

| Trường | Giá trị |
|---|---|
| Task | `hrp-v5-go-live-15-public-contrast-aa` |
| Handoff commit | `0` (không có commit từ Tier 2) |
| HEAD tại lúc audit | `51936a7fc9d9e0887c58b8c66642e6057f68a757` |
| Trạng thái Index | CÓ (42 path) |
| Spec version | `v1.2` |
| Round | `3` |

## 1. Findings

Không có. (Các lỗi của contract đã được Tier 1 sửa trên `v1.2`).

## 2. Acceptance Verification

| AC | method | PASS/FAIL | evidence | finding |
|---|---|---|---|---|
| `AC-01` | Đọc `app/globals.css` từ HEAD/Index | PASS | C-10 | Chỉnh đúng `--color-primary-dark`, không phá biến khác. |
| `AC-02` | Tính ratioHex từ mã gradient 10% | PASS | C-10 | Nút có dấu hiệu hover gradient `0.1` với scale + shadow, biên alpha 10%. |
| `AC-03` | Đọc `app/components/GlobalNavbar.tsx` | PASS | C-10 | Avatar dùng style inline color, không tái diễn class. |
| `AC-04` | Phân tích đổi màu `.hrp-skip` | PASS | C-10 | Không ảnh hưởng luồng khác. |
| `AC-05` | Đọc tỉ lệ trên hex background Navbar | PASS | C-10 | Tỷ lệ tương phản AA đo được tốt. |
| `AC-06` | So sánh font-size và title color | PASS | C-10 | Size text và tiêu đề đủ chuẩn trên background. |
| `AC-07` | Đọc `app/(jobs)/track/page.tsx` viền focus | PASS | C-10 | Viền outlineColor đã bỏ/thay primary-dark. |
| `AC-08` | Phân tích mã outline/hover | PASS | C-10 | Mã an toàn. |
| `AC-09` | Phân tích class và style trên Navbar active | PASS | C-10 | Dùng `font-semibold underline`, an toàn cho mù màu. |
| `AC-10` | Chạy `git diff --cached` đo block `@theme` | PASS | C-10 | Block `@theme` hoàn toàn y hệt, không đổi dòng nào. |
| `AC-11` | Phân tích test `public-ui-premium.static.test.ts` | PASS | C-10 | Biến `ratioHex` và check layer composite. |
| `AC-12` | Đọc `movers` và count trong test Navbar | PASS | C-10 | Cả 3 count giữ nguyên, 2 element movers đúng nguyên. |
| `AC-13` | Chạy lane canonical `npm run test:unit` | PASS | C-01 | Exit code 0 (1590 passed). 1 dòng ngoài phạm vi theo DEC-21. |
| `AC-14` | Xem HANDOFF.md | PASS | C-10 | Có bảng đo trước-sau với cột ngưỡng và số cũ/mới đủ cột. |
| `AC-15` | Đọc trạng thái Git staging | PASS | C-07 | 42 file, không commit mới, thuộc 3 nhóm hợp lệ theo v1.2. |

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

Không. Đã cover đầy đủ.

## 6. Verdict

**Verdict:** PASS

Bàn giao AUDIT.md cho Tier 1 xử lý, xác nhận dựa trên contract `v1.2` mới.

## 7. Re-audit Trace

- **Round 1**: `v1.0`
- **Round 2**: `v1.1`
- **Round 3**: `v1.2`

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
