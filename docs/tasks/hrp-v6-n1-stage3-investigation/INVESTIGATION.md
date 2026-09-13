# hrp-v6-n1-stage3-investigation — điều tra READ-ONLY vì sao test branch lệch baseline

> **Status (13/09/2026 11:45):** READ-ONLY investigation complete; recommendation drafted; **chưa migrate, chưa probe, chưa đụng hrp-live**. Theo Tier 0 directive 13/09/2026 11:26: dừng trước migrate deploy + probe; xác định cách đưa `hrp_mp2_test` về baseline đúng với tác động nhỏ nhất; Tier 0 chốt cách xử lý trước khi Tier 1 chạy lại STEP 1 → 5.

## 1. Bối cảnh

- Tier 0 directive 13/09/2026 11:26 (từ HEAD `b31581a`): tiếp tục N1 Stage 3 từ HEAD mới nhất; credential N1 đã có trong `C:\cre_hrp.txt` (Tier 0 đã đọc qua secure channel, KHÔNG đưa vào chat/log/commit).
- Tier 0 đã chạy gate chỉ đọc và xác nhận:
  - Hai URL cùng branch `hrp_mp2_test` (Neon), KHÔNG phải primary.
  - Hai kết nối cùng DB + cùng máy chủ.
  - `_prisma_migrations` không có row lỗi/kẹt (`finished_at IS NULL AND rolled_back_at IS NULL` = 0).
  - `prisma migrate status` báo **9 migration pending**, gồm **2 N1** + **7 ngoài N1**.

## 2. Phạm vi điều tra (READ-ONLY, không ghi DB)

| ID | Câu hỏi | Method | Result |
|---|---|---|---|
| Q-01 | 7 migration ngoài N1 là gì, thuộc task nào, đã có trong HEAD `b31581a` chưa? | `ls prisma/migrations/`, `git log --all` từng migration | xem §3 |
| Q-02 | Mỗi migration ngoài N1 đã apply trên `hrp_mp2_test` hay chưa (theo evidence PLANNER + HANDOFF)? | grep PLANNER + HANDOFF + AUDIT + log 2.15..2.21 | xem §4 |
| Q-03 | Mỗi migration ngoài N1 có phụ thuộc N1 schema/RLS/policy không? | đọc từng `migration.sql`; xem schema.prisma | xem §5 |
| Q-04 | Mỗi migration ngoài N1 có ghi/thay thế dữ liệu hay chỉ DDL? | đọc `migration.sql` tìm `INSERT/UPDATE/DELETE/UPSERT/TRUNCATE` | xem §5 |
| Q-05 | Baseline N1 dự kiến trên `hrp_mp2_test` (theo Tier 0 expectation trước STEP 3) là gì? | runbook STEP 2 decision matrix + PLANNER stage tracker | xem §6 |
| Q-06 | Lệch baseline là do: (a) branch được clone từ snapshot pre-Phase-1; (b) Neon clone bỏ sót migration; (c) cutover AV1/AV4 chưa chạy; (d) data drift? | đối chiếu evidence PLANNER về từng task Phase 1 + AV1 + AV4 | xem §7 |

## 3. Danh sách 9 migration pending

Theo Tier 0 report (đã verify bằng `ls prisma/migrations/`):

| # | Migration | Owner task | Commit gốc | Tier 1 đã đẩy lên main? |
|---|---|---|---|---|
| 1 | `20260831160000_public_rpc_residual_grant_revoke` | go-live-11 (`hrp-v5-go-live-11`) | `fb993a7` | ✅ (commit `fb993a7` đã trên origin/main) |
| 2 | `20260908001_job_opening_posting_split` | `hrp-v6-p1-job-opening-posting-split` | `dfcbdfb` (gốc) + fix `44ce5e2`/`5562719` | ✅ ACCEPTED R4 (`3a96b9c`) |
| 3 | `20260908150000_v6_phase1a_labor_profile_schema` | `hrp-v6-p1-labor-profile-schema` | `3a33212` | ✅ LIVE APPLIED hrp-live 08/09 (`f8bd761`) |
| 4 | `20260908150001_v6_phase1a_labor_profile_rls` | `hrp-v6-p1-labor-profile-schema` (RLS part) | `3a33212` | ✅ LIVE APPLIED hrp-live 08/09 (`f8bd761`) |
| 5 | `20260911001_project_company_name_denorm` | UI04g (`hrp-v6-ui-04g-...`) | `f45f324` | ✅ (commit trên origin/main) |
| 6 | `20260911002_av1_homepage_settings` | `hrp-v6-admin-v6-av1-settings-editor` | `0f1cb99` (+ fix `9596d8c`) | ✅ ACCEPTED v1.1 |
| 7 | `20260912001_av4_media_library` | `hrp-v6-admin-v4-media-library` | `a5de2c4` | ✅ ACCEPTED v1.0 |
| 8 | `20260912140411_n1_placement_case_foundation` | `hrp-v6-n1-placement-case-foundation` | `f7f85bb` | ✅ ACCEPTED v1.2 |
| 9 | `20260912140412_n1_placement_case_rls` | `hrp-v6-n1-placement-case-foundation` (RLS part) | `f7f85bb` | ✅ ACCEPTED v1.2 |

Tất cả 9 migration đều đã có trên `origin/main` (`b31581a`). Repo-side không thiếu.

## 4. Phân loại trạng thái apply trên `hrp_mp2_test`

Dựa trên PLANNER §n1_stage_tracker + log 2.15 (12/09/2026 16:35, self-test driver đã observe qua `migrate deploy`) + log 2.20 (12/09/2026 23:35, batch 6 audit fix):

| # | Migration | Trạng thái trên `hrp_mp2_test` | Nguồn evidence |
|---|---|---|---|
| 1 | `20260831160000_public_rpc_residual_grant_revoke` | ✅ **ĐÃ apply** qua Neon SQL Editor (DEC-07), không qua `prisma migrate deploy` | PLANNER log 2.15: "applied on hrp_mp2_test via Neon SQL Editor per DEC-07". **Vì vậy xuất hiện pending trong `prisma migrate status`** — Prisma tracking table chưa thấy row này (apply raw SQL ngoài Prisma). |
| 2 | `20260908001_job_opening_posting_split` | ❓ **CHƯA có evidence xác nhận**. PLANNER không ghi cutover `hrp_mp2_test`. Tier 1 chưa chạy Stage 3 thật trên `hrp_mp2_test` (BLOCKED-on-env). | Ngụ ý từ log 2.15: driver skip-list đã gồm 3 migration (public_rpc, av1, av4) → ngầm hiểu các migration khác (gồm job_opening_posting_split) **ĐÃ được apply thật** qua `prisma migrate deploy` trước đó. Cần Tier 0 verify bằng cách hỏi `_prisma_migrations` xem có row `20260908001_*` không. |
| 3 | `20260908150000_v6_phase1a_labor_profile_schema` | ❓ **CẦN XÁC MINH** trên `hrp_mp2_test`. Migration gốc đã LIVE APPLIED trên `hrp-live` 08/09. Clone Neon từ `hrp-live` có thể đã bao gồm (Neon copy-on-write + `pg_dump`/`neon clone` defaults). | N/A — chưa có evidence trực tiếp trên `hrp_mp2_test`; chỉ suy luận từ self-test driver skip-list ở log 2.15. |
| 4 | `20260908150001_v6_phase1a_labor_profile_rls` | ❓ **CẦN XÁC MINH** tương tự #3. | N/A — tương tự #3. |
| 5 | `20260911001_project_company_name_denorm` | ❓ **CẦN XÁC MINH**. UI04g production đã ACCEPTED + hotfix `f45f324` đã trên origin/main. Production data đã có `client_company_name` denorm. `hrp_mp2_test` có thể chưa apply (UI04g chỉ chạy production smoke + AV1 migration sang Neon tại thời điểm khác). | Cần Tier 0 verify qua `_prisma_migrations`. |
| 6 | `20260911002_av1_homepage_settings` | ❌ **CHƯA apply** trên `hrp_mp2_test`. | PLANNER log 2.15: "SKIPS `20260911002_av1_homepage_settings` (out of N1 scope; AV1/AV4 have their own cutovers)". Self-test driver SKIP = chưa apply trên test branch khi đó. |
| 7 | `20260912001_av4_media_library` | ❌ **CHƯA apply** trên `hrp_mp2_test`. | Tương tự #6. |
| 8 | `20260912140411_n1_placement_case_foundation` | ❌ **CHƯA apply** trên `hrp_mp2_test`. | Tier 0 directive 13/09/2026 11:26 ("Tier 1 chỉ commit file migration; KHÔNG apply lên hrp-live trong task này", DEC-N1-06). Đây là mục tiêu Stage 3. |
| 9 | `20260912140412_n1_placement_case_rls` | ❌ **CHƯA apply** trên `hrp_mp2_test`. | Tương tự #8. |

## 5. Phân tích dependency + ghi/thay thế dữ liệu của từng migration ngoài N1

| # | Migration | Phụ thuộc N1? | Có ghi/thay thế dữ liệu? | Ghi chú |
|---|---|---|---|---|
| 1 | `public_rpc_residual_grant_revoke` | ❌ Độc lập (chỉ GRANT/REVOKE role) | ❌ Không | Đã apply thật qua raw SQL; vấn đề là Prisma tracking table thiếu row. |
| 2 | `job_opening_posting_split` | ❌ Độc lập (CREATE TABLE + FK) | ❌ Không | ADD-only. Cần apply để `prisma migrate deploy` không lỗi FK nếu N1 migration touch schema cũ. |
| 3 | `v6_phase1a_labor_profile_schema` | ❌ Độc lập (CREATE TABLE + ADD COLUMN nullable) | ❌ Không | ADD-only. Cột nullable `labor_profile_id` không ảnh hưởng rows hiện tại. |
| 4 | `v6_phase1a_labor_profile_rls` | ❌ Độc lập (ENABLE RLS + CREATE POLICY trên 3 bảng Phase 1A) | ❌ Không | RLS forward-only. |
| 5 | `project_company_name_denorm` | ❌ Độc lập (ADD COLUMN + UPDATE backfill) | ⚠️ **CÓ UPDATE backfill**: `UPDATE outsourcing_projects SET client_company_name = cc.name FROM client_companies cc WHERE p.client_company_id = cc.id AND p.client_company_name IS NULL;` | Backfill idempotent (chỉ set khi NULL). Nếu chạy 2 lần không sao. Nếu test branch đã có dữ liệu `outsourcing_projects` với `client_company_id` trỏ tới `client_companies` (chưa denorm) → sẽ điền `client_company_name` lần đầu. |
| 6 | `av1_homepage_settings` | ❌ Độc lập (CREATE TABLE singleton) | ⚠️ **CÓ INSERT seed** (xem file): `INSERT INTO homepage_settings (id, ...) VALUES ('default', ...)` nếu chưa có row | ADD-only. Có seed row `id='default'`. |
| 7 | `av4_media_library` | ❌ Độc lập (CREATE TYPE enum + CREATE TABLE media + FK + indexes) | ❌ Không có UPDATE/INSERT (chỉ DDL) | ADD-only. |
| 8 | N1 foundation | (đang áp) | (đang áp) | Mục tiêu Stage 3. |
| 9 | N1 RLS | (đang áp) | (đang áp) | Mục tiêu Stage 3. |

**Kết luận dependency:** N1 KHÔNG phụ thuộc bất kỳ migration ngoài N1 nào. Cả 7 migration ngoài N1 đều là **ADD-only** DDL (ngoại trừ #5 `project_company_name_denorm` có UPDATE idempotent + #6 `av1_homepage_settings` có INSERT seed idempotent).

## 6. Baseline N1 dự kiến trên `hrp_mp2_test`

Theo runbook STEP 2 decision matrix:

> | Combined output | Action |
> |---|---|
> | Both N1 migrations already applied; no other pending; no `finished_at IS NULL AND rolled_back_at IS NULL` rows | Go to STEP 4 (run probe directly) |
> | **Only** `20260912140411_n1_placement_case_foundation` and `20260912140412_n1_placement_case_rls` are pending AND no row is stuck/failed | Go to STEP 3 (apply these two) |
> | **Any other migration is also pending (e.g. …_m14_rls_matrix_repair, …_marketplace_search_tracking_profile) | STOP. Tier 1 was told N1 is ADD-only against the current state. If other migrations show as pending, the cutover state on hrp_mp2_test does NOT match what Tier 1 designed for. Escalate to Tier 0 — do NOT deploy.** |

**Vậy baseline N1 dự kiến:** TẤT CẢ migration ≤ `20260912001_av4_media_library` đã apply; CHỈ 2 N1 migrations pending.

**Trạng thái thực tế (per Tier 0 gate):** 7 migration ngoài N1 pending → **lệch baseline**. Theo runbook quyết định: **STOP, escalate Tier 0**.

## 7. Nguyên nhân lệch baseline

Có 3 nguyên nhân khả dĩ (xếp theo khả năng):

### 7.1. Branch `hrp_mp2_test` được tạo từ Neon snapshot **trước** một số cutover (khả năng cao nhất)

- `hrp_mp2_test` được tạo ban đầu (per PLANNER §n1_stage_tracker stage_2 ngày 12/09/2026 15:35) từ `hrp-live` tại thời điểm ~08/09 (sau khi Phase 1A labor-profile-schema applied).
- Từ 08/09 → 12/09, đã có các commit/cutover mới trên `hrp-live`:
  - `fb993a7` (31/08) `public_rpc_residual_grant_revoke` — apply raw SQL qua Neon SQL Editor.
  - `20260908001_*` job_opening_posting_split (08/09) — **chưa rõ** có apply live không (ACCEPTED R4 nhưng chưa thấy ghi "LIVE APPLIED").
  - `20260911001_*` project_company_name_denorm (11/09 UI04g) — đã trên production (UI04d D.A ACCEPTED).
  - `20260911002_*` av1_homepage_settings (11/09 AV1) — v1.1 ACCEPTED.
  - `20260912001_*` av4_media_library (12/09 AV4) — ACCEPTED v1.0.
- Nhưng `hrp_mp2_test` được tạo snapshot **trước** các cutover này → thiếu migration tracking rows cho cả những migration đã apply trên live.

### 7.2. Một số migration apply **ngoài Prisma** (qua raw SQL Editor Neon)

- `public_rpc_residual_grant_revoke`: apply qua Neon SQL Editor (theo PLANNER log 2.15) → không có row trong `_prisma_migrations` → Prisma thấy pending.
- Có thể các migration khác (#5 denorm, #6 AV1, #7 AV4) cũng apply ngoài Prisma mà PLANNER chưa ghi. Cần Tier 0 verify.

### 7.3. Tier 1 chưa từng chạy `prisma migrate deploy` đầy đủ trên `hrp_mp2_test`

- Stage 3 chỉ mới PASS self-test trên embedded PG (28/28 PASS). Real `hrp_mp2_test` run BLOCKED-on-env → chưa từng apply N1 hoặc các migration khác qua Prisma trên test branch.
- Vì vậy `_prisma_migrations` trên `hrp_mp2_test` chỉ có row cho các migration đã được apply raw SQL (qua Neon SQL Editor).

## 8. Phương án đề xuất (tác động nhỏ nhất)

### 8.1. Bốn lựa chọn (tăng dần tác động)

| Phương án | Mô tả | Tác động | Rủi ro | Ghi/thay thế dữ liệu? |
|---|---|---|---|---|
| **A. Re-clone branch `hrp_mp2_test` từ Neon** | Xóa branch `hrp_mp2_test`, tạo lại từ `hrp-live` tại HEAD hiện tại (qua Neon API hoặc Neon Console). Sau đó apply đúng 2 N1 migration. | **Trung bình**: branch mới, mất mọi test data trên branch cũ (nếu có). Neon console/API thao tác ngoài repo. | Migration tracking tương ứng với snapshot hiện tại của `hrp-live`. Cần verify `hrp-live` đã đủ cả 7 migration NGOÀI N1. | Không ghi DB production; `hrp_mp2_test` được reset về baseline đúng. |
| **B. `prisma migrate resolve --applied` cho 7 migration ngoài N1 + apply 2 N1** | Với mỗi migration NGOÀI N1 đã có DDL/seed thật trên `hrp_mp2_test`, dùng `prisma migrate resolve --applied <name>` để thêm row tracking vào `_prisma_migrations`. Sau đó `prisma migrate deploy` 2 N1. | **Nhỏ**: 7 lệnh `prisma migrate resolve`, 0 ghi DDL (chỉ insert vào tracking table). Nhưng **yêu cầu xác minh schema khớp 100%** trước mỗi `--applied`. | Nếu schema thật trên branch khác schema trong migration → DDL sẽ chạy lần nữa ở deploy sau (vì `--applied` đã đánh dấu); nếu khác ở seed row thì có thể duplicate key. **Rủi ro cao** nếu không verify kỹ. | Chỉ insert row tracking + apply 2 N1 migrations. KHÔNG chạy lại DDL của 7 migration NGOÀI N1. |
| **C. `prisma migrate deploy` cho cả 9 migration** | Đơn giản nhất — để Prisma tự apply tuần tự cả 9 migration. **Nhưng**: (i) nếu 1 trong 7 migration NGOÀI N1 đã apply thật qua raw SQL thì sẽ fail (DDL duplicate / constraint conflict); (ii) vi phạm DEC-N1-06 (DEC chính: "Tier 1 chỉ commit file migration; KHÔNG apply lên hrp-live trong task này"; tương tự với `hrp_mp2_test` ở đây). | **Lớn**: chạm ngoài scope N1 — Tier 0 directive rõ "N1 KHÔNG tự chạy migration ngoài N1"; `hrp_mp2_test` có thể ở trạng thái không mong muốn. | Vi phạm DEC-N1-06 (ADD-only scope); chạy DDL của các task khác trong runbook N1 — không đúng phạm vi. | **CÓ**: chạy toàn bộ 7 migration NGOÀI N1 DDL; risk duplicate constraint/seed. |
| **D. **ESCALATE** cho từng task owner** | Với mỗi migration NGOÀI N1 ở #2, #5, #6, #7 → bàn giao cho owner của task đó (job_opening, UI04g, AV1, AV4) để họ tự chạy cutover test branch trước. Sau khi cả 7 đã có tracking row trong `_prisma_migrations` → Tier 1 chạy STEP 3 cho N1. | **Phụ thuộc người khác**: chậm nhất, cần coordination với nhiều owner. | Owner khác không quen test branch workflow; có thể kéo dài thời gian unblock. | Tùy owner; về nguyên tắc mỗi migration ADD-only nên idempotent. |

### 8.2. Khuyến nghị của Tier 1

**Phương án B** (`resolve --applied`) là **tác động nhỏ nhất** với điều kiện Tier 0 xác minh schema đã khớp 100% trước. Nếu không xác minh được, **Phương án A** (re-clone branch) là phương án an toàn nhất (tuy tốn Neon console thao tác).

### 8.3. Lệnh READ-ONLY để Tier 0 xác minh (TRƯỚC khi chốt phương án)

> **Credential hygiene**: KHÔNG echo URL/user; dùng biến env `TEST_DATABASE_URL_ADMIN`/`TEST_DATABASE_URL_WRITER` đã có.

#### 8.3.1. Liệt kê tracking rows hiện tại trên `hrp_mp2_test`

```sql
-- Kết nối qua TEST_DATABASE_URL_ADMIN (neondb_owner)
SELECT migration_name
     , finished_at IS NOT NULL AS completed
     , rolled_back_at IS NOT NULL AS rolled_back
     , substring(coalesce(logs,'') from 1 for 80) AS log_head
  FROM _prisma_migrations
 ORDER BY started_at NULLS FIRST, migration_name;
```

**Mục tiêu**: xác định row nào đã có, row nào không. So với 9 migration pending ở §3 để biết:
- Migration nào **chưa có row tracking** (chỉ DDL tồn tại) → ứng viên cho `--applied`.
- Migration nào **đã có row tracking** nhưng vẫn pending trong `migrate status` (vì status report khác).

#### 8.3.2. So schema thật với schema từ migration SQL (để verify DDL đã chạy)

```sql
-- Bảng job_openings có tồn tại không? (job_opening_posting_split #2)
SELECT to_regclass('public.job_openings') AS job_openings
     , to_regclass('public.job_postings') AS job_postings;

-- Bảng labor_profiles + RLS có bật? (labor-profile-schema + rls #3, #4)
SELECT to_regclass('public.labor_profiles') AS labor_profiles
     , (SELECT relrowsecurity FROM pg_class WHERE relname='labor_profiles') AS labor_profiles_rls
     , (SELECT relrowsecurity FROM pg_class WHERE relname='labor_profile_intakes') AS lpi_rls
     , (SELECT relrowsecurity FROM pg_class WHERE relname='labor_profile_episodes') AS lpe_rls;

-- Cột client_company_name có trên outsourcing_projects? (denorm #5)
SELECT column_name FROM information_schema.columns
 WHERE table_name='outsourcing_projects' AND column_name='client_company_name';

-- Bảng homepage_settings có tồn tại? (av1 #6)
SELECT to_regclass('public.homepage_settings') AS av1
     , (SELECT count(*) FROM homepage_settings) AS av1_rows;

-- Bảng media + enum MediaStatus (av4 #7)
SELECT to_regclass('public.media') AS media
     , (SELECT 1 FROM pg_type WHERE typname='MediaStatus') AS media_enum;
```

#### 8.3.3. Kiểm tra các policy/grant cần thiết cho N1 (forward-compatibility)

```sql
-- app_user_writer có SELECT/INSERT/UPDATE trên placement_case chưa?
SELECT has_table_privilege('app_user_writer', 'placement_case', 'SELECT') AS sel
     , has_table_privilege('app_user_writer', 'placement_case', 'INSERT') AS ins
     , has_table_privilege('app_user_writer', 'placement_case', 'UPDATE') AS upd;
```

N1 migration sẽ GRANT các quyền này — nếu đã có sẵn thì `--applied` an toàn.

#### 8.3.4. Diff _prisma_migrations trên `hrp_mp2_test` vs `hrp-live` (nếu có)

```sql
-- Trên hrp-live (sang tab khác)
SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name;
```

So 2 list để biết branch test thiếu tracking rows cho migration nào.

### 8.4. Quyết định theo evidence

| Nếu kết quả verify §8.3 | Phương án |
|---|---|
| (i) Tất cả 7 migration NGOÀI N1 đều có DDL/seed thật trên branch **và** (ii) `_prisma_migrations` không có row tương ứng (chỉ vì apply raw SQL) | **B**. Dùng `prisma migrate resolve --applied` cho 7 migration. Sau đó `prisma migrate deploy` 2 N1. |
| (i)-(ii) cho một phần: một số migration đã có tracking row (chỉ pending do Prisma report lỗi); một số chưa | **B với điều kiện**: chỉ `--applied` cho migration đã có DDL thật (verify qua §8.3.2). Với migration đã có tracking row → chỉ cần `prisma migrate deploy`. |
| (i) Một số migration NGOÀI N1 KHÔNG có DDL thật (vd: chưa từng apply) → nếu `--applied` sẽ **bỏ sót DDL quan trọng** | **A**. Re-clone branch `hrp_mp2_test` từ `hrp-live` tại HEAD mới nhất. Sau đó apply 2 N1. |
| Bất kỳ case nào khác (vd: schema phân kỳ giữa `hrp_mp2_test` và migration SQL, conflict FK, etc.) | **ESCALATE Tier 0**. KHÔNG tự quyết. |

### 8.5. Sau khi Tier 0 chốt phương án

| Phương án chốt | Bước tiếp theo |
|---|---|
| A (re-clone) | Tier 0 re-clone branch (Neon Console) → Tier 1 chạy STEP 1 → 5 từ runbook, bỏ qua STEP 2 decision matrix (vì branch mới = baseline đúng). |
| B (resolve --applied) | Tier 0 xác minh schema đã đúng (qua §8.3.2); Tier 1 chạy 7 lệnh `prisma migrate resolve --applied` (NEPStep RUNBOOK sẽ chỉ rõ thứ tự); sau đó STEP 3 → STEP 4 → STEP 5. |
| C (deploy all 9) | **KHÔNG khuyến nghị** — vi phạm DEC-N1-06. Chỉ chọn nếu Tier 0 đặc biệt authorize. |
| D (escalate owners) | Tier 0 liên lạc các owner task #2/#5/#6/#7; mỗi owner tự chạy cutover `hrp_mp2_test`; Tier 1 đợi 7 migration có tracking row → STEP 3. |

### 8.6. Kiểm chứng trước/sau

**Trước khi chạy bất kỳ thao tác nào:**

- Snapshot `_prisma_migrations` hiện tại: `pg_dump -t _prisma_migrations --no-owner > evidence-pre-migrations.sql` hoặc `SELECT * FROM _prisma_migrations ORDER BY migration_name` ra file `evidence-pre-migrations.txt`.
- Snapshot `pg_class` (bảng) + `pg_type` (enum) + `pg_policy` (RLS): `pg_dump --schema-only --no-owner > evidence-pre-schema.sql`.
- Lưu cả 2 file vào `docs/tasks/hrp-v6-n1-stage3-investigation/evidence/`.

**Sau khi chạy thao tác (A hoặc B):**

- Chạy lại §8.3.1 + §8.3.2: phải thấy `_prisma_migrations` có rows tương ứng (với B) hoặc schema đầy đủ (với A), `migrate status` chỉ pending 2 N1.
- Lưu output §8.3.1 + §8.3.2 mới vào `evidence/`.

## 9. Câu hỏi cần Tier 0 chốt (blocker cho STEP 3)

1. **Tier 0 đã verify chưa**: `_prisma_migrations` trên `hrp_mp2_test` hiện chứa những row nào? Có row cho `20260831160000_public_rpc_residual_grant_revoke` không? Có row cho `20260908001_job_opening_posting_split` không? (Tier 1 không có quyền query `_prisma_migrations` mà không expose URL.)
2. **Tier 0 chọn phương án nào** trong §8.1? Khuyến nghị B nếu xác minh được, A nếu không.
3. Nếu chọn B: Tier 0 có cho phép Tier 1 chạy `prisma migrate resolve --applied` (chỉ insert row tracking, không DDL)?
4. Sau khi baseline đúng, **Tier 0 xác nhận** Tier 1 chạy STEP 3 → 5 trên `hrp_mp2_test`? (Yêu cầu: 2 N1 migration ADD-only + 28/28 probe PASS + `stage3_real_pass=true`.)

## 10. KHÔNG chạm (theo Tier 0 directive)

- ❌ `hrp-live` (DEC-N1-06).
- ❌ Chạy `prisma migrate deploy` trên bất kỳ DB nào cho đến khi Tier 0 chốt §9.
- ❌ Chạy `prisma migrate resolve` trên bất kỳ DB nào cho đến khi Tier 0 chốt §9.
- ❌ Chạy probe.mjs trên `hrp_mp2_test` cho đến khi baseline đúng + STEP 1.5 PASS + Tier 0 chốt.
- ❌ Reset/xóa branch `hrp_mp2_test` (nếu chọn A, Tier 0 mới thực hiện qua Neon Console).
- ❌ Mở AV6 (vẫn defer).

## 11. Revision log

| Version | Ngày | Thay đổi |
|---|---|---|
| 1.0 | 13/09/2026 11:45 | READ-ONLY investigation DRAFT — 4 phương án; khuyến nghị B (resolve --applied) có điều kiện xác minh; A (re-clone) là fallback an toàn. Chờ Tier 0 chốt §9 trước khi Tier 1 chạy bất kỳ thao tác ghi. |