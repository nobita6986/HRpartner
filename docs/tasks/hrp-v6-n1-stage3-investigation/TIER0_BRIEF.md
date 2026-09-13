# Tier 0 brief — hrp_mp2_test baseline lệch: 4 phương án + 4 câu hỏi chốt

> **Status (13/09/2026 12:30):** Q-01..Q-04 đã chốt 13/09/2026 12:28. Tier 1 phụ thuộc Tier 0 re-clone branch `hrp_mp2_test` từ `hrp-live` (Q-02 phương án A) + post-check §C của `hrp-live-fingerprint.md` PASS. Authorization HOLD cho đến khi re-clone + post-check hoàn tất.

## 1. Phát hiện chính (Tier 0 đã verify 13/09/2026 12:28)

| Item | Giá trị |
|---|---|
| HEAD repo | `b31581a` (`main`) |
| HEAD có 28 migration trong `prisma/migrations/` | ✓ |
| `_prisma_migrations` trên `hrp_mp2_test` | **29 rows: 28 completed, 0 unfinished/stuck, 1 rolled-back** |
| Migration pending | **9** (2 N1 + 7 NGOÀI N1), **không có tracking row** |
| DDL NGOÀI N1 đã tồn tại trên `hrp_mp2_test`? | **KHÔNG** — `job_openings`, `job_postings`, `labor_profiles`, `homepage_settings`, `media` đều NULL; cột `client_company_name` cũng chưa có |

**Hệ quả:** giả thuyết cũ (PLANNER log 2.15 "applied on hrp_mp2_test via Neon SQL Editor per DEC-07") **không còn đứng**. Self-test driver skip-list là artifact của embedded PG; không phải evidence trên `hrp_mp2_test` thật.

**Nguyên nhân lệch (xác nhận):** branch `hrp_mp2_test` được tạo từ `hrp-live` tại thời điểm **rất sớm** (trước Phase 1A; có thể qua `WITH DATA = false` hoặc clone không thành công → branch rỗng về cơ bản).

## 2. Phương án đã chốt

**Q-02 chốt: A** — re-clone `hrp_mp2_test` từ `hrp-live`. Lý do: B không an toàn vì DDL NGOÀI N1 chưa tồn tại.

**Điều kiện tiên quyết**: trước khi reset, **Owner xác minh `hrp-live` đã có đủ 7 DDL NGOÀI N1**; nếu không → chuyển D.

## 3. Điều kiện Tier 0 chốt Q-04 để Tier 1 chạy STEP 1 → 5

| Điều kiện | Verify |
|---|---|
| Chỉ 2 migration N1 pending | `prisma migrate status` sau re-clone |
| Không row unfinished/stuck | `_prisma_migrations` |
| STEP 1.5 xác nhận đúng branch `hrp_mp2_test` | `neon_branch_gate.ps1` exit 0 |

## 4. Hỗ trợ Tier 1 cho Tier 0 verify `hrp-live` (READ-ONLY, Tier 1 không kết nối DB)

Xem **`evidence/hrp-live-fingerprint.md`** với:
- §A — DDL fingerprint cho 7 migration NGOÀI N1 (Tier 1 đọc từ HEAD `b31581a`).
- **§B — `verify-pre-reclone.sql`** để Tier 0 chạy trên `hrp-live` đối chiếu 7 DDL NGOÀI N1.
- **§C — `verify-pre-reclone-hrp_mp2_test.sql`** để Tier 0 chạy trên `hrp_mp2_test` SAU re-clone (kỳ vọng: đủ 7 DDL NGOÀI N1 + 28 migration completed + 2 N1 pending + `placement_case` NULL).
- §D — sau khi §C PASS → Tier 1 chạy STEP 1 → 5 theo runbook.
- §E — điều kiện Stage 3 PASS.
- §F — KHÔNG chạm `hrp-live`/reset/chạy STEP.

## 5. Stage 3 PASS conditions (theo Tier 0 chốt Q-04)

- ✅ Probe thực 28/28 PASS.
- ✅ cleanup-needed n_ids=0.
- ✅ `stage3_real_pass=true`.
- ✅ Exit 0.
- ✅ STEP 3 chỉ deploy 2 N1 migrations (ADD-only).

## 6. Tuân thủ chỉ thị Tier 0 (sau re-clone)

- ✅ Dừng trước migrate deploy + probe cho đến khi post-check §C PASS.
- ✅ Không chạy migration ngoài N1.
- ✅ Không reset/xóa branch (Tier 0 thực hiện).
- ✅ Không chạy probe cho đến khi baseline đúng + STEP 1.5 PASS + Tier 0 authorize.
- ✅ Không đụng `hrp-live`.
- ✅ Không mở AV6.
- ✅ Không in giá trị credential trong bất kỳ file/log nào (verified: Select-String credential-pattern = 0 hits).

Tier 1 sẵn sàng chạy STEP 1 → 5 ngay khi Tier 0 (i) re-clone xong, (ii) post-check §C PASS, (iii) authorize Stage 3.
