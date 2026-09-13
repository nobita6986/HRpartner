# N1 STAGE 4 — Decision Dossier (READ-ONLY)
# Hồ sơ quyết định triển khai Stage 4 lên `hrp-live`

**Date:** 2026-09-13 19:58 (UTC+7)
**Owner:** Tier 1 — Agent
**Target reviewer:** Owner / Tier 0
**Authority:** READ-ONLY investigation. ZERO write commands to `hrp-live`. Stage 4 chưa mở.
**Predecessor:** Stage 3 (rev 2.30 — `AWAITING_TIER0_REAPPLY`). Hồ sơ này chuẩn bị trước khi Tier 0 mở Stage 3.

---

## 0. Tóm tắt điều hành

**Mục tiêu Stage 4:** Apply 2 migration N1 (`20260912140411_n1_placement_case_foundation` + `20260912140412_n1_placement_case_rls`) lên branch `hrp-live` của Neon, bằng transaction có kiểm soát, sau khi Stage 3 PASS trên branch test.

**Trạng thái hiện tại (T1 quan sát 13/09 19:58, đã cập nhật 20:08 sau khi Tier 0 publish evidence):**
- ✅ N1 foundation schema + 2 migrations đã ACCEPTED v1.2 tại `tier1/n1-foundation` HEAD `9fe4da2`; Tier 3 LIGHT audit round 2 PASS.
- ✅ AV4 migration đã được sửa (`d790bcf` 13:54): `created_by_id UUID → TEXT`, bỏ inline `REFERENCES users(id)`.
- ✅ AV4 đã apply trên `hrp-live` (theo Tier 0 commit `d70cb1a` 19:16 — verified lại tracking row + checksum + schema).
- ✅ Re-clone `hrp_mp2_test` đã xong (theo Tier 0 commit `d70cb1a` — backup `pre-n1-stage3-reclone-20260913` archived, test branch reset về parent `hrp-live / br-icy-dew-azbrgthw` tại `2026-09-13T07:04:20Z`).
- ✅ Stage 3 PASS trên `hrp_mp2_test` (theo Tier 0 commit `233fab1` 19:54 — probe 28/28, `stage3_real_pass=true`, exit 0, 6 created/6 deleted, 0 ID fixture còn lại trên 3 bảng, 0 unfinished migration).
- ⏸ Stage 4 (apply 2 migration N1 lên `hrp-live`) **CHƯA MỞ** — current_gate = `N1_STAGE3_PASS_AWAITING_STAGE4_OWNER_DECISION`.
- ⏸ Stage 5 (intake writer) vẫn PENDING — gated bởi Stage 4.
- ⏸ AV6 (HomepageSection CMS) vẫn DEFER.

**T1 không tự ý mở Stage 4.** Hồ sơ này chuẩn bị trình Owner phê duyệt trước khi Tier 0 apply. Tier 0 đã ghi rõ trong `233fab1/README.md`: "T1 tiếp tục HOLD thao tác ghi; Stage 3 PASS không cấp quyền deploy N1 production hoặc mở Stage 5."

---

## 1. Hai migration N1 cần apply lên `hrp-live`

### 1.1 `20260912140411_n1_placement_case_foundation/migration.sql`

Nguồn: `prisma/migrations/20260912140411_n1_placement_case_foundation/migration.sql` (commit `f7f85bb`).

```sql
-- Tạo enum
CREATE TYPE "PlacementCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'READY_TO_PLACE', 'CLOSED');

-- Tạo bảng placement_case
CREATE TABLE "placement_case" (
    "id" TEXT NOT NULL,
    "labor_profile_id" TEXT NOT NULL,
    "status" "PlacementCaseStatus" NOT NULL DEFAULT 'OPEN',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "close_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "placement_case_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "placement_case_labor_profile_id_idx" ON "placement_case"("labor_profile_id");
CREATE INDEX "placement_case_status_opened_at_idx" ON "placement_case"("status", "opened_at");
CREATE UNIQUE INDEX "placement_case_labor_profile_id_active_unique"
    ON "placement_case"("labor_profile_id")
    WHERE "status" IN ('OPEN', 'IN_PROGRESS', 'READY_TO_PLACE');

-- ALTER candidate_submissions (nullable FK)
ALTER TABLE "candidate_submissions" ADD COLUMN "placement_case_id" TEXT;

-- FKs
ALTER TABLE "placement_case"
    ADD CONSTRAINT "placement_case_labor_profile_id_fkey"
    FOREIGN KEY ("labor_profile_id") REFERENCES "labor_profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "candidate_submissions"
    ADD CONSTRAINT "candidate_submissions_placement_case_id_fkey"
    FOREIGN KEY ("placement_case_id") REFERENCES "placement_case"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "candidate_submissions_placement_case_id_idx"
    ON "candidate_submissions"("placement_case_id");
```

### 1.2 `20260912140412_n1_placement_case_rls/migration.sql`

```sql
ALTER TABLE placement_case ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_case FORCE ROW LEVEL SECURITY;

CREATE POLICY hrp_placement_case_scope ON placement_case
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF'))
  WITH CHECK (hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF'));
```

### 1.3 Tổng số DDL operations

| Migration | CREATE | ALTER (ADD COLUMN) | ALTER (ENABLE/FORCE RLS) | CREATE POLICY | CREATE INDEX | CREATE UNIQUE INDEX | FK constraint |
|---|---|---|---|---|---|---|---|
| `_foundation` | 1 (placement_case) + 1 (enum) | 1 (candidate_submissions) | 0 | 0 | 3 (2 thường + 1 partial-unique) | 1 (partial) | 2 (FK + FK) |
| `_rls` | 0 | 0 | 2 (ENABLE + FORCE) | 1 (PERMISSIVE ALL) | 0 | 0 | 0 |

---

## 2. Tác động khoá bảng `candidate_submissions`

### 2.1 Loại khoá

**Migration `_foundation` chạm bảng `candidate_submissions` bằng:**

```sql
ALTER TABLE "candidate_submissions" ADD COLUMN "placement_case_id" TEXT;
```

Theo tài liệu PostgreSQL, `ALTER TABLE ... ADD COLUMN [nullable] [without default]` lấy khoá **`ACCESS EXCLUSIVE`** ngắn hạn trên bảng đó (chỉ bảng `candidate_submissions`, không phải toàn DB). Thời gian khoá = thời gian ghi catalog `pg_attribute` + cập nhật `pg_class`; với bảng ~vài chục nghìn rows thì **dưới 1 giây** trong PG 14+ trên Neon.

### 2.2 Tác động thực tế

| Tác động | Mức độ | Lý do |
|---|---|---|
| INSERT vào `candidate_submissions` | **Tạm dừng dưới 1s** | ACCESS EXCLUSIVE trên bảng `candidate_submissions` |
| SELECT từ `candidate_submissions` | **Tạm dừng dưới 1s** | ACCESS EXCLUSIVE chặn cả đọc |
| UPDATE/DELETE trên `candidate_submissions` | **Tạm dừng dưới 1s** | ACCESS EXCLUSIVE |
| INSERT/UPDATE bảng **khác** | **Không ảnh hưởng** | Khoá chỉ trên 1 bảng |
| INSERT vào `placement_case` (bảng mới) | **Không xung đột** | Bảng mới, không có traffic |
| SELECT từ `placement_case` | **Không ảnh hưởng** | Bảng mới |

### 2.3 Tác động FK cascade tiềm ẩn

FK mới: `candidate_submissions.placement_case_id → placement_case.id` (`ON DELETE RESTRICT`, `ON UPDATE CASCADE`).

- **`ON DELETE RESTRICT`** chỉ kích hoạt khi có lệnh `DELETE FROM placement_case ...` (xóa case). Vì ứng dụng KHÔNG xoá case (close bằng status CLOSED theo DEC-N1-03), rủi ro thực tế = **0**.
- **`ON UPDATE CASCADE`** chỉ kích hoạt khi có lệnh `UPDATE placement_case SET id = ...`. PK `placement_case.id` là `cuid()` (TEXT), không bao giờ update. Rủi ro thực tế = **0**.
- **`ON DELETE RESTRICT`** ở FK `placement_case.labor_profile_id → labor_profiles.id` chỉ kích hoạt khi xoá LaborProfile. Theo V6 Phase 1A design, LaborProfile không bị xoá. Rủi ro thực tế = **0**.

### 2.4 Câu lệnh `ALTER TABLE ... ADD COLUMN` với cột nullable không default

Theo PG 14+ (Neon production hiện chạy PG 18.6):
- `ADD COLUMN TEXT NULL` (không default) → catalog-only, **không quét bảng**, **không ghi lại vào mỗi row**.
- Khoá ACCESS EXCLUSIVE chỉ giữ trong vài millisecond (theo PG docs: "ADD COLUMN ... without default, very fast for catalog-only operation").

→ **Tác động runtime gần như bằng 0** cho `candidate_submissions`. Tier 0 vẫn nên chạy trong **cửa sổ thấp điểm** (sau 22:00 ICT) để tránh trùng traffic spike, nhưng KHÔNG cần maintenance window dài.

### 2.5 RLS migration (bước 2)

```sql
ALTER TABLE placement_case ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_case FORCE ROW LEVEL SECURITY;
```

Tác động: thay đổi cờ `relrowsecurity` / `relforcerowsecurity` trong catalog. Khoá **`ACCESS EXCLUSIVE`** trên `placement_case` (bảng mới, không có traffic). **Không ảnh hưởng runtime**.

### 2.6 CREATE INDEX partial-unique

```sql
CREATE UNIQUE INDEX placement_case_labor_profile_id_active_unique
    ON placement_case(labor_profile_id)
    WHERE status IN ('OPEN', 'IN_PROGRESS', 'READY_TO_PLACE');
```

Tác động: quét `placement_case` (bảng mới, 0 rows) + cập nhật catalog. Khoá **`SHARE`** trên bảng (không phải EXCLUSIVE). **Không ảnh hưởng runtime** vì bảng trống.

### 2.7 Rủi ro tổng hợp

| Rủi ro | Xác suất | Hậu quả | Mitigation |
|---|---|---|---|
| Long-running query chặn `ALTER TABLE` | Thấp | DDL đợi statement đang chạy kết thúc | Tier 0 set `lock_timeout = '5s'` để tránh treo |
| Race INSERT trong lúc ADD COLUMN | Cực thấp | INSERT thất bại với timeout | Tier 0 retry; migration idempotent (Prisma tự bỏ qua nếu cột đã tồn tại) |
| FK RESTRICT chặn DELETE LaborProfile | 0% | Ứng dụng không xoá LaborProfile | Không cần xử lý |
| Partial unique index conflict | 0% | Bảng mới, 0 rows | Không cần xử lý |
| RLS policy chặn session không thuộc ADMIN/HR_MANAGER/HR_STAFF | Cao (theo design) | ĐÚNG kỳ vọng — DEC-N1-06 | Worker/CTV/Public/ANON queries trên `placement_case` = 0 rows. **Đây là behavior mong muốn, không phải bug.** |

---

## 3. Xác minh đích triển khai — `hrp-live` bằng branch identity + endpoint-id

### 3.1 Quy tắc vàng

**KHÔNG dùng cờ `primary` của Neon để quyết định "đây là prod".** Cờ `primary` chỉ là một thuộc tính metadata của branch; nó có thể thay đổi, có thể có nhiều branch "primary" cùng lúc trong plan Neon nâng cao, hoặc có thể bị set sai bởi Operator.

**Tier 0 chỉ coi `hrp-live` là đích triển khai khi:**

1. `branch.name == "hrp-live"` (case-sensitive, chính xác 8 ký tự `hrp-live`).
2. `branch.id` resolved qua Neon API trùng với `branch.id` mà endpoint `hrp-live` đang trỏ tới.
3. `endpoint.host` (sau khi normalize qua `endpointIdOf()`) chứa đúng `endpointId` của `branch hrp-live`.

### 3.2 Cách xác minh (READ-ONLY, dùng Neon API + pg query)

**Bước 1:** Lấy branch info qua Neon API.

```bash
# NEON_API_KEY + NEON_PROJECT_ID đã set
curl -s -H "Authorization: Bearer $NEON_API_KEY" \
     "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches" \
     | jq '.branches[] | select(.name=="hrp-live") | {id, name, primary}'
```

**Bước 2:** Lấy endpoint info cho `hrp-live`.

```bash
curl -s -H "Authorization: Bearer $NEON_API_KEY" \
     "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches/$BRANCH_ID/endpoints" \
     | jq '.endpoints[] | select(.type=="read_write") | {id, host, port}'
```

**Bước 3:** Cross-check với DATABASE_URL.

```bash
# endpointIdOf() helper (đã có trong probe.mjs, trích từ rev 03fecc2):
# split hostname trên '.', strip prefix 'ep-', strip suffix '-pooler'
endpointIdOf() {
  local host="$1"
  echo "$host" | awk -F. '{print $1}' | sed 's/^ep-//' | sed 's/-pooler$//'
}

EXPECTED_ENDPOINT_ID=$(endpointIdOf "$EXPECTED_HOST")
ACTUAL_ENDPOINT_ID=$(endpointIdOf "$DATABASE_URL_HOST")

if [ "$EXPECTED_ENDPOINT_ID" != "$ACTUAL_ENDPOINT_ID" ]; then
  echo "REFUSE: DATABASE_URL endpoint-id does not match hrp-live"
  exit 16
fi
```

**Bước 4:** Xác minh bằng SQL ngay khi kết nối (defense-in-depth).

```sql
SELECT current_database() AS db_name,
       inet_server_addr() AS server_ip,
       (SELECT name FROM pg_class WHERE relname='_prisma_migrations' LIMIT 1) AS has_prisma_migrations,
       version() AS pg_version;
```

So sánh `current_database()` với `neondb` (default DB) **CHỈ** để biết đã kết nối đúng instance; KHÔNG dùng nó để khẳng định "đây là prod" vì `neondb` cũng là DB default của mọi branch clone.

### 3.3 Cấm

| Hành động | Lý do cấm |
|---|---|
| Gọi `neon branches create --primary` để "hợp thức hoá" prod | Tier 0 KHÔNG được tạo branch mới; chỉ dùng branch đã có |
| Dựa vào `branch.primary == true` để chọn branch | Cờ có thể sai; Tier 0 chỉ tin `branch.name == "hrp-live"` |
| Echo `DATABASE_URL` ra log | Lộ credential; Tier 0 KHÔNG echo URL đầy đủ |
| Chạy `psql -d $HRP_LIVE_URL` từ máy dev | Tier 0 phải dùng Neon CLI / API + psql chỉ qua Neon proxy |

### 3.4 Script verify đã có sẵn trong repo

Tier 0 có thể dùng script đã có (đã commit tại `03fecc2`):

- `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/neon_branch_gate.ps1`
- `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/test-neon-branch-gate.ps1`

Pattern:
- `neon_branch_gate.ps1` đã verify endpoint-id matches `hrp_mp2_test` qua Neon API. Tier 0 chỉ cần đổi `EXPECTED_BRANCH_NAME` từ `hrp_mp2_test` thành `hrp-live`.
- Exit codes 10..15 fail-closed (rev 2.19 batch 5 đã sửa bug substring match → exact equality).

---

## 4. Xác nhận "chỉ còn đúng 2 migration N1"

### 4.1 Trên branch test `hrp_mp2_test` (sau re-clone từ hrp-live)

Kỳ vọng theo fingerprint v1.1:

| Nhóm migration | Đếm | Trạng thái kỳ vọng |
|---|---|---|
| NGOÀI N1 (Phase 0, Phase 1A, Phase 1B, AV1, AV4 denorm) | **34 completed** + **5 rolled-back** (theo Tier 0 verify 12:44) | Đã apply trên `hrp-live` trước đó |
| N1 (foundation + RLS) | **0 applied + 2 pending** | Chưa apply; là 2 file `20260912140411_*` + `20260912140412_*` |
| Tổng rows `_prisma_migrations` | 39 (34 + 5) | N1 chưa có row nào trên `hrp_mp2_test` |

### 4.2 Cách xác minh READ-ONLY

```sql
-- Query A: Tổng số migration đã apply (finished) và chưa apply
SELECT
  COUNT(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS completed,
  COUNT(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS unfinished_stuck,
  COUNT(*) FILTER (WHERE rolled_back_at IS NOT NULL) AS rolled_back,
  COUNT(*) FILTER (WHERE migration_name LIKE '2026091214%') AS n1_partial_count
FROM _prisma_migrations;
-- Kỳ vọng: completed=34, unfinished_stuck=0, rolled_back=5, n1_partial_count=0

-- Query B: Liệt kê 2 migration N1 pending (sẽ được apply trong Stage 4)
SELECT migration_name, started_at, finished_at, rolled_back_at
  FROM _prisma_migrations
 WHERE migration_name LIKE '2026091214%';
-- Kỳ vọng: 0 rows trên hrp_mp2_test (chưa apply)

-- Query C: Verify 2 file migration tồn tại trong repo + chưa được Prisma coi là applied
SELECT migration_name, checksum
  FROM _prisma_migrations
 WHERE migration_name IN (
   '20260912140411_n1_placement_case_foundation',
   '20260912140412_n1_placement_case_rls'
 );
-- Kỳ vọng: 0 rows trên hrp_mp2_test
```

### 4.3 Sau khi apply Stage 4 trên `hrp-live`

Sau khi `prisma migrate deploy` chạy xong:

```sql
-- Verify trên hrp-live
SELECT
  COUNT(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS completed,  -- expected 36
  COUNT(*) FILTER (WHERE migration_name LIKE '2026091214%') AS n1_count                        -- expected 2
FROM _prisma_migrations;
-- Kỳ vọng: completed=36 (=34 cũ + 2 N1 mới), n1_count=2

-- Verify partial unique index đã được tạo
SELECT indexname, indexdef
  FROM pg_indexes
 WHERE indexname = 'placement_case_labor_profile_id_active_unique';
-- Kỳ vọng: 1 row, indexdef chứa 'WHERE (status = ANY (...))'

-- Verify FK đã được tạo
SELECT conname, conrelid::regclass, confrelid::regclass, confdeltype, confupdtype
  FROM pg_constraint
 WHERE conname IN (
   'placement_case_labor_profile_id_fkey',
   'candidate_submissions_placement_case_id_fkey'
 );
-- Kỳ vọng:
--   placement_case_labor_profile_id_fkey: conrelid=placement_case, confrelid=labor_profiles, confdeltype=r (RESTRICT), confupdtype=c (CASCADE)
--   candidate_submissions_placement_case_id_fkey: conrelid=candidate_submissions, confrelid=placement_case, confdeltype=r, confupdtype=c

-- Verify RLS
SELECT relname, relrowsecurity, relforcerowsecurity
  FROM pg_class
 WHERE relname = 'placement_case';
-- Kỳ vọng: relrowsecurity=t, relforcerowsecurity=t

SELECT polname, polcmd, polpermissive, polroles::text
  FROM pg_policy
 WHERE polrelid = 'placement_case'::regclass;
-- Kỳ vọng: polname='hrp_placement_case_scope', polcmd='{a}' (ALL), polpermissive=true, 1 row
```

---

## 5. Checklist pre-flight cho Tier 0 (trước khi apply lên `hrp-live`)

### 5.1 Bắt buộc

- [ ] **P-01.** Stage 3 đã PASS trên `hrp_mp2_test` với evidence commit trên `origin/main` hoặc `origin/tier1/n1-foundation`.
  - Probe NDJSON stdout + stderr + summary (28/28, `stage3_real_pass=true`, `cleanup_needed pass=true, n_ids=0`, `exit 0`).
  - Post-check C `verify-pre-reclone-hrp_m2_test.sql` đã PASS (xem §C.4 fingerprint v1.1).
- [ ] **P-02.** AV4 migration `20260912001_av4_media_library` đã apply trên `hrp-live` BẰNG transaction có kiểm soát.
  - `_prisma_migrations` có row mới cho migration này (`started_at` gần đây, `finished_at IS NOT NULL`, `rolled_back_at IS NULL`).
  - `media` table + `MediaStatus` enum tồn tại.
  - Tracking row được ghi (bảng tracking nào, schema cột gì, hash gì — Tier 0 tự quyết định schema tracking, T1 không can thiệp).
- [ ] **P-03.** Re-clone `hrp_mp2_test` từ `hrp-live` đã xong, `hrp_mp2_test` hiện đang là mirror của `hrp-live`.
- [ ] **P-04.** `neon_branch_gate.ps1` chạy với `EXPECTED_BRANCH_NAME=hrp-live`, exit code 0.
  - endpoint-id của DATABASE_URL khớp endpoint-id của branch `hrp-live` (qua Neon API).
  - branch name chính xác là `hrp-live` (case-sensitive).
- [ ] **P-05.** Tier 0 có `DATABASE_URL` cho `hrp-live` (role owner / admin) để chạy migration. URL không echo ra log.

### 5.2 Khuyến nghị

- [ ] **R-01.** Chạy Stage 4 trong cửa sổ thấp điểm (sau 22:00 ICT) để giảm rủi ro trùng traffic spike trên `candidate_submissions`.
- [ ] **R-02.** Đặt `lock_timeout = '5s'` ở đầu session để tránh DDL treo.
- [ ] **R-03.** Wrap migration apply trong 1 transaction: `BEGIN; SET LOCAL lock_timeout='5s'; ...migration...; COMMIT;`. Nếu bất kỳ lệnh nào fail → `ROLLBACK` toàn bộ.
- [ ] **R-04.** Sau khi apply, chạy ngay Query C ở §4.3 để verify `_prisma_migrations` + indexes + FKs + RLS.

### 5.3 Cấm

- [ ] **F-01.** KHÔNG `prisma migrate reset` trên `hrp-live` — sẽ xoá toàn bộ data.
- [ ] **F-02.** KHÔNG `prisma migrate resolve --rolled-back` trên `hrp-live` — Tier 0 không có quyền này với migration N1.
- [ ] **F-03.** KHÔNG `psql -c "DROP TABLE placement_case"` hoặc bất kỳ DROP nào.
- [ ] **F-04.** KHÔNG echo `DATABASE_URL` đầy đủ ra log / stdout.
- [ ] **F-05.** KHÔNG commit credential vào repo.

---

## 6. Rollback (nếu Stage 4 fail)

### 6.1 Rollback Phase 1: RLS migration

Nếu chỉ `_rls` migration fail:

```sql
-- DROP POLICY + DISABLE/FORCE RLS
DROP POLICY IF EXISTS hrp_placement_case_scope ON placement_case;
ALTER TABLE placement_case NO FORCE ROW LEVEL SECURITY;
ALTER TABLE placement_case DISABLE ROW LEVEL SECURITY;
-- Bảng placement_case vẫn tồn tại, không có RLS, queries trả rows (default behavior).
```

### 6.2 Rollback Phase 2: foundation migration

Nếu `_foundation` migration fail (nhưng `_rls` đã pass):

```sql
-- Xoá FK + index + cột + bảng
ALTER TABLE candidate_submissions DROP CONSTRAINT IF EXISTS candidate_submissions_placement_case_id_fkey;
DROP INDEX IF EXISTS candidate_submissions_placement_case_id_idx;
ALTER TABLE candidate_submissions DROP COLUMN IF EXISTS placement_case_id;

ALTER TABLE placement_case DROP CONSTRAINT IF EXISTS placement_case_labor_profile_id_fkey;
DROP INDEX IF EXISTS placement_case_labor_profile_id_active_unique;
DROP INDEX IF EXISTS placement_case_status_opened_at_idx;
DROP INDEX IF EXISTS placement_case_labor_profile_id_idx;
DROP TABLE IF EXISTS placement_case;
DROP TYPE IF EXISTS "PlacementCaseStatus";
```

### 6.3 Rollback `_prisma_migrations` row

Nếu `_prisma_migrations` đã ghi row cho 1 trong 2 migration N1 mà rollback cần chạy:

```sql
UPDATE _prisma_migrations
   SET rolled_back_at = NOW(), logs = 'Stage 4 rollback — Tier 0 directive'
 WHERE migration_name IN (
   '20260912140411_n1_placement_case_foundation',
   '20260912140412_n1_placement_case_rls'
 );
```

### 6.4 Giới hạn rollback

- **Rollback KHÔNG revert data** — nếu đã có submission `placementCaseId` được set (chỉ có thể qua Phase 5 intake writer, hiện CHƯA có code path) thì rollback sẽ mất liên kết đó. Tại thời điểm 13/09 19:58 KHÔNG có code path nào ghi `placementCaseId`, nên rủi ro = 0.
- **Rollback KHÔNG drop constraint do Prisma tự sinh** — Tier 0 nên grep `pg_constraint` để biết constraint nào còn trước khi drop.

---

## 7. Stage 5 / AV6 vẫn chưa mở

Theo `current_gate` rev 2.30 + queue_authority ở §0 PLANNER_HANDOVER.md:

- **Stage 5** (`hrp-v6-n1-intake-writer`): PENDING, gated bởi Stage 3 + Stage 4. **KHÔNG mở.**
- **AV6** (HomepageSection CMS): DEFER, conflict schema/migration với Stage 3/4. **KHÔNG mở.**

Tier 1 chỉ chuẩn bị Stage 4 dossier này. Tier 0/Owner là người quyết định khi nào mở Stage 4.

---

## 8. Phụ lục

### 8.1 Tài liệu tham chiếu

- TASK N1: `docs/tasks/hrp-v6-n1-placement-case-foundation/TASK.md` (commit `9fe4da2`).
- HANDOFF N1: `docs/tasks/hrp-v6-n1-placement-case-foundation/HANDOFF.md` (rev round 2 PASS).
- Fingerprint v1.1: `docs/tasks/hrp-v6-n1-stage3-investigation/evidence/hrp-live-fingerprint.md` (commit `0611b5d`).
- Verify scripts: `docs/tasks/hrp-v6-n1-stage3-investigation/evidence/verify-pre-step2.sql`.
- AV4 fix: commit `d790bcf` (UUID → TEXT, bỏ REFERENCES users(id)).
- Stage 3 self-test: `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/`.
- Cross-check report Stage 3: `docs/investigations/n1-stage3-t1-cross-check-2026-09-13/REPORT.md`.

### 8.2 Cross-check ngày 13/09 19:58

- `git log origin/main` HEAD = `4e49a3a` (rev 2.30 sau khi T1 commit dossier cross-check).
- `git ls-remote origin` chỉ có 2 branch (`main` + `tier1/n1-foundation`), không có tier0 branch.
- T1 không có worktree riêng để chạy psql — Tier 0 là người duy nhất có quyền truy cập `hrp-live` DB.

### 8.3 Trạng thái dossier

- **Status:** READY_FOR_OWNER_REVIEW. Tier 1 đã hoàn thành READ-ONLY chuẩn bị.
- **Owner decision:** Cần Owner phê duyệt để Tier 0 tiến hành Stage 4 (apply 2 migration N1 lên `hrp-live`).
- **Nếu Owner đồng ý:** Tier 0 dùng P-01..P-05 checklist (§5.1) + R-01..R-04 khuyến nghị (§5.2) để apply.
- **Nếu Owner không đồng ý:** Tier 1 tiếp tục giữ HOLD; dossier này vẫn là reference cho đến khi Stage 3 PASS + AV4 apply xong.
