# Tier 0 brief — hrp_mp2_test baseline lệch: 4 phương án + 4 câu hỏi chốt

> **Bối cảnh**: Tier 0 directive 13/09/2026 11:26 yêu cầu Tier 1 dừng trước migrate deploy + probe, điều tra READ-ONLY vì sao test branch lệch baseline. Điều tra xong; dưới đây là 4 phương án + 4 câu hỏi cần Tier 0 chốt.

## 1. Phát hiện chính (READ-ONLY)

| Item | Giá trị |
|---|---|
| HEAD repo | `b31581a` (`main`) |
| HEAD có 28 migration trong `prisma/migrations/` | ✓ |
| 9 migration pending trên `hrp_mp2_test` (per Tier 0 gate) | 2 N1 + 7 ngoài N1 |
| `_prisma_migrations` không có row stuck/failed | ✓ (per Tier 0 gate) |
| Repo-side thiếu migration nào | ❌ Không; cả 9 đều đã ở HEAD |

**7 migration NGOÀI N1** (theo Tier 0 list):
1. `20260831160000_public_rpc_residual_grant_revoke` — **đã apply raw SQL** qua Neon SQL Editor (per PLANNER log 2.15, "applied on hrp_mp2_test via Neon SQL Editor per DEC-07"). Vì vậy `_prisma_migrations` không có row → Prisma report pending.
2. `20260908001_job_opening_posting_split` — chưa có evidence xác nhận trên `hrp_mp2_test`.
3. `20260908150000_v6_phase1a_labor_profile_schema` (Phase 1A) — LIVE APPLIED trên `hrp-live` 08/09; cần verify trên `hrp_mp2_test`.
4. `20260908150001_v6_phase1a_labor_profile_rls` (Phase 1A RLS) — tương tự #3.
5. `20260911001_project_company_name_denorm` (UI04g Y10.4) — chưa có evidence trên `hrp_mp2_test`; migration có **UPDATE backfill idempotent** (SET … IS NULL).
6. `20260911002_av1_homepage_settings` (AV1) — CHƯA apply trên `hrp_mp2_test` (per log 2.15).
7. `20260912001_av4_media_library` (AV4) — CHƯA apply trên `hrp_mp2_test` (per log 2.15).

**Nguyên nhân lệch (khả năng cao nhất):** branch `hrp_mp2_test` được clone từ `hrp-live` tại ~08/09 (sau Phase 1A) trước khi các cutover mới (#2/#5/#6/#7) được apply trên live; kết hợp #1 apply raw SQL bên ngoài Prisma → `_prisma_migrations` thiếu rows cho các migration đó.

## 2. 4 phương án (tăng dần tác động)

| Phương án | Tác động | Ghi/thay thế dữ liệu | Rủi ro |
|---|---|---|---|
| **A. Re-clone `hrp_mp2_test` từ Neon** | Trung bình: mất test data cũ (nếu có) | `hrp_mp2_test` reset về baseline đúng | Cần verify `hrp-live` đủ 7 migration NGOÀI N1 trước |
| **B. `prisma migrate resolve --applied` cho 7 migration NGOÀI N1 + apply 2 N1** | Nhỏ: chỉ insert row tracking + 2 N1 migration | Chỉ insert rows vào `_prisma_migrations` + 2 N1 migrations | Cao nếu schema thật ≠ schema trong migration SQL |
| **C. `prisma migrate deploy` cho cả 9** | Lớn: chạy DDL 7 migration NGOÀI N1 | **CÓ**: chạy DDL + UPDATE denorm + INSERT AV1 seed | Vi phạm DEC-N1-06 (chỉ commit, không apply lên test branch trong task N1); risk duplicate key |
| **D. ESCALATE cho từng task owner** | Chậm: phụ thuộc coordination | Tùy owner | Owner khác không quen test branch workflow |

## 3. Khuyến nghị

**B** (`resolve --applied`) nếu Tier 0 xác minh được schema đã đúng qua script `evidence/verify-pre-step2.sql`.
**A** (re-clone) là fallback an toàn nhất.
**C, D** không khuyến nghị trừ khi Tier 0 đặc biệt authorize.

## 4. Câu hỏi cần Tier 0 chốt (blocker cho STEP 3)

| # | Câu hỏi | Phương án ánh hướng |
|---|---|---|
| Q-01 | `_prisma_migrations` trên `hrp_mp2_test` hiện chứa rows cho những migration nào? Có row cho `20260831160000_public_rpc_residual_grant_revoke` không? Có row cho `20260908001_job_opening_posting_split` không? | Tier 0 chạy `verify-pre-step2.sql` (file đính kèm) qua `TEST_DATABASE_URL_ADMIN` và dán output. |
| Q-02 | Tier 0 chọn phương án nào trong §2? | Khuyến nghị B; A là fallback. |
| Q-03 | Nếu chọn B: Tier 0 có authorize Tier 1 chạy `prisma migrate resolve --applied` (chỉ insert row tracking, không DDL) không? | Y/N |
| Q-04 | Sau khi baseline đúng, Tier 0 xác nhận Tier 1 chạy STEP 3 → 5 trên `hrp_mp2_test`? | Y/N |

## 5. File đính kèm (Git-tracked, READ-ONLY)

- `INVESTIGATION.md` — báo cáo đầy đủ §1..§11.
- `evidence/verify-pre-step2.sql` — script READ-ONLY để Tier 0 chạy xác minh.

## 6. Tuân thủ chỉ thị Tier 0

- ✅ Dừng trước migrate deploy + probe.
- ✅ Không chạy migration ngoài N1.
- ✅ Không reset/xóa branch.
- ✅ Không chạy probe.
- ✅ Không đụng `hrp-live`.
- ✅ Không mở AV6.
- ✅ Không in giá trị credential trong bất kỳ file/log nào.

Tier 1 sẵn sàng chạy STEP 1 → 5 trên `hrp_mp2_test` ngay khi Tier 0 chốt Q-01..Q-04.
