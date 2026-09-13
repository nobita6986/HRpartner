# N1 STAGE 4 -- Decision Dossier (READ-ONLY)
# Ho so quyet dinh trien khai Stage 4 len `hrp-live`

**Date:** 2026-09-13 21:00 (UTC+7)
**Owner:** Tier 1 -- Agent
**Target reviewer:** Owner / Tier 0
**Authority:** READ-ONLY investigation. ZERO write commands to `hrp-live`. Stage 4 chua mo.
**Predecessor:** Stage 3 PASS (rev 2.31 -- Tier 0 publish evidence `233fab1`). Ho so nay chuan bi truoc khi Tier 0 apply Stage 4 len `hrp-live`.

---

## 0. Tom tat dieu hanh

**Muc tieu Stage 4:** Apply 2 migration N1 (`20260912140411_n1_placement_case_foundation` + `20260912140412_n1_placement_case_rls`) len branch `hrp-live` cua Neon bang `prisma migrate deploy`, sau khi Stage 3 PASS tren branch test.

**Su that & so ky vong (doi chieu evidence `233fab1` + `d70cb1a`):**

| Branch | Trang thai | `_prisma_migrations.completed` | `_prisma_migrations.rolled-back` | `_prisma_migrations.unfinished` | N1 tracking rows | placement_case table | Tong rows |
|---|---|---|---|---|---|---|---|
| `hrp_mp2_test` (test branch) | **Da apply N1** (Stage 3 PASS 13/09 19:17) | **37** | **5** | **0** | 2 | ton tai | **42** |
| `hrp-live` (production, do 13/09 12:19:48Z = 19:19 ICT) | **Da ap AV4, chua co N1** | **35** | **5** | **0** | 0 | NULL | **40** |
| `hrp-live` (sau Stage 4 apply PASS) | Ky vong sau apply | **37** | **5** | **0** | 2 | ton tai | **42** |

**Luu y quan trong:**
- Test branch `hrp_mp2_test` duoc re-clone tu `hrp-live` **truoc** Stage 3 (parent timestamp `2026-09-13T07:04:20Z`). Sau Stage 3, test branch **da apply N1** va **khong con la mirror** cua `hrp-live`. Neu can test lai, Tier 0 phai reset + re-clone (backup `pre-n1-stage3-reclone-20260913 / br-old-lab-azk2j9xd` archived, co the dung quy trinh da co).
- Production `hrp-live` tai lan do 13/09 19:19: 35 completed + 5 rolled-back + 0 unfinished = **40 rows**, **chua co** row nao cho N1, bang `placement_case` chua ton tai.
- Sau khi Stage 4 apply thanh cong: `hrp-live` se dat **37 completed + 5 rolled-back + 0 unfinished = 42 rows**, giong cau truc test branch hien tai.
- Stage 5 (intake writer) + AV6 (HomepageSection CMS) van **CHUA MO**.

**T1 khong tu y mo Stage 4.** Ho so nay chuan bi trinh Owner phe duyet truoc khi Tier 0 apply. Tier 0 da ghi ro trong `233fab1/README.md`: "T1 tiep tuc HOLD thao tac ghi; Stage 3 PASS khong cap quyen deploy N1 production hoac mo Stage 5."

**Gate production da duoc Tier 1 viet + kiem thu:** xem §4.4 -- `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/neon_branch_gate_prod.ps1` + test harness `test-neon-branch-gate-prod.ps1` + summary `gate-prod-test-summary.json` (3/3 PASS).

---

## 1. Hai migration N1 can apply len `hrp-live`

### 1.1 `20260912140411_n1_placement_case_foundation/migration.sql`

Nguon: `prisma/migrations/20260912140411_n1_placement_case_foundation/migration.sql` (commit `f7f85bb`).

```sql
-- Tao enum
CREATE TYPE "PlacementCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'READY_TO_PLACE', 'CLOSED');

-- Tao bang placement_case (moi)
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

-- Indexes tren bang MOI placement_case (KHONG dung candidate_submissions)
CREATE INDEX "placement_case_labor_profile_id_idx" ON "placement_case"("labor_profile_id");
CREATE INDEX "placement_case_status_opened_at_idx" ON "placement_case"("status", "opened_at");
CREATE UNIQUE INDEX "placement_case_labor_profile_id_active_unique"
    ON "placement_case"("labor_profile_id")
    WHERE "status" IN ('OPEN', 'IN_PROGRESS', 'READY_TO_PLACE');

-- (1) ADD COLUMN nullable (khong default) -> catalog-only
ALTER TABLE "candidate_submissions" ADD COLUMN "placement_case_id" TEXT;

-- (2) FK placement_case -> labor_profiles (dat tren bang moi)
ALTER TABLE "placement_case"
    ADD CONSTRAINT "placement_case_labor_profile_id_fkey"
    FOREIGN KEY ("labor_profile_id") REFERENCES "labor_profiles"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- (3) FK candidate_submissions -> placement_case (dat tren bang dang ton tai)
ALTER TABLE "candidate_submissions"
    ADD CONSTRAINT "candidate_submissions_placement_case_id_fkey"
    FOREIGN KEY ("placement_case_id") REFERENCES "placement_case"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- (4) CREATE INDEX (khong unique) tren cot vua ADD o candidate_submissions
--     Day la INDEX THUONG; xem §2.4 de biet tac dong.
CREATE INDEX "candidate_submissions_placement_case_id_idx"
    ON "candidate_submissions"("placement_case_id");
```

### 1.2 `20260912140412_n1_placement_case_rls/migration.sql`

```sql
-- RLS tren bang moi placement_case
ALTER TABLE placement_case ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_case FORCE ROW LEVEL SECURITY;

CREATE POLICY hrp_placement_case_scope ON placement_case
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF'))
  WITH CHECK (hrp_session_role() IN ('ADMIN', 'HR_MANAGER', 'HR_STAFF'));
```

### 1.3 Tong so DDL operations, theo bang

| Bang bi anh huong | Migration | Thao tac |
|---|---|---|
| `placement_case` (moi) | `_foundation` | CREATE TABLE, CREATE INDEX (x2), CREATE UNIQUE INDEX (partial), FK tu `labor_profiles` |
| `placement_case` (moi) | `_rls` | ENABLE + FORCE RLS, CREATE POLICY |
| `candidate_submissions` (da ton tai) | `_foundation` | ALTER TABLE ADD COLUMN, ALTER TABLE ADD CONSTRAINT FK, CREATE INDEX (khong unique) |
| `labor_profiles` (da ton tai) | `_foundation` | Chi lam dich FK; PG van lay lock tren `labor_profiles` ngan han khi add FK (xem §2.2) |

---

## 2. Danh gia lai tac dong migration (khong cam ket con so khi chua do)

### 2.1 Canh bao truoc tien

Em **khong** dua ra cam ket "duoi 1 giay" hay "rui ro 0" cho bat ky thao tac nao tren `candidate_submissions`. Ly do:

- Em (Tier 1) khong co quyen do truc tiep bang `candidate_submissions` tren `hrp-live` (so rows, kich thuoc, traffic pattern).
- Bang `candidate_submissions` la bang production **ghi nang** (cong intake + tracking + projection) -- da ghi nhan traffic tu portal cong khai + admin staff. Bat ky lock nao tren bang nay can duoc Tier 0 do thuc te tren `hrp-live` truoc khi chay.
- Du doan "duoi 1 giay" dua tren catalog-only operation chi dung khi (a) bang nho, (b) khong co long-running query khac, (c) PG co du cache. Tier 0 phai do thuc te.

### 2.2 Loai lock theo tai lieu PostgreSQL

Theo PostgreSQL docs (https://www.postgresql.org/docs/current/explicit-locking.html va ALTER TABLE / CREATE INDEX / LOCK references):

| Thao tac | Loai lock tren bang bi cham | Loai lock tren bang tham chieu / bang lien quan |
|---|---|---|
| `ALTER TABLE ... ADD COLUMN` (nullable, khong default) | **ACCESS EXCLUSIVE** tren bang do | -- |
| `ALTER TABLE ... ADD CONSTRAINT FOREIGN KEY` (NOT VALID) | **SHARE ROW EXCLUSIVE** tren bang do | **SHARE ROW EXCLUSIVE** tren bang duoc tham chieu |
| `ALTER TABLE ... ADD CONSTRAINT FOREIGN KEY` (VALIDATE -- mac dinh Prisma) | **SHARE ROW EXCLUSIVE** (giu nguyen, scan validate xay ra ngay trong cau lenh) | **SHARE ROW EXCLUSIVE** tren bang duoc tham chieu |
| `CREATE INDEX` (khong unique, khong CONCURRENTLY) | **SHARE** tren bang do | -- |
| `CREATE UNIQUE INDEX` (khong CONCURRENTLY) | **SHARE** tren bang do | -- |
| `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` | **ACCESS EXCLUSIVE** tren bang do | -- |
| `ALTER TABLE ... FORCE ROW LEVEL SECURITY` | catalog-only (khong lock rieng) | -- |
| `CREATE POLICY` | catalog-only | -- |

**Ghi chu quan trong ve FK (sua theo chi thi Owner):**

Theo PostgreSQL ALTER TABLE reference, `ADD CONSTRAINT FOREIGN KEY` lay **SHARE ROW EXCLUSIVE** tren **CA HAI** bang: bang chua FK (referencing) va bang duoc tham chieu (referenced). Khong phai SHARE o bang dich nhu dossier truoc ghi -- day la sai sot.

Ap dung cho migration N1:
- `ADD CONSTRAINT candidate_submissions_placement_case_id_fkey` -> **SHARE ROW EXCLUSIVE** tren `candidate_submissions` VA **SHARE ROW EXCLUSIVE** tren `placement_case`.
- `ADD CONSTRAINT placement_case_labor_profile_id_fkey` -> **SHARE ROW EXCLUSIVE** tren `placement_case` VA **SHARE ROW EXCLUSIVE** tren `labor_profiles`.

Ca 2 deu scan toan bo rows bang chua FK de validate (vi khong co `NOT VALID`).

### 2.3 Luu y ve Prisma

- Prisma mac dinh `ALTER TABLE ... ADD CONSTRAINT FOREIGN KEY` **KHONG** them `NOT VALID`. Cau lenh thuong trong nhu `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ...` (PostgreSQL validate toan bo -- scan existing rows de check FK). Tier 0 nen verify trong migration SQL that tai commit `f7f85bb` xem co `NOT VALID` khong (T1 doc lai: file `20260912140411_*` KHONG chua `NOT VALID` -> mac dinh PG se validate ngay, scan toan bo `candidate_submissions`).
- Tier 0 KHONG chinh sua file migration da commit de them `NOT VALID` (Prisma dung checksum; sua file se lam `migrate deploy` fail o lan sau). Neu muon forward-only fix thi viet migration moi (xem §6).

### 2.4 Tier 0 phai do truoc khi apply (READ ONLY)

```sql
-- 1. So rows hien tai (tham khao scan time FK validation + index build)
SELECT reltuples::bigint AS approx_rows
  FROM pg_class
 WHERE relname IN ('candidate_submissions', 'placement_case', 'labor_profiles');

-- 2. Long-running query dang chay (neu co thi DDL se doi)
SELECT pid, state, query_start, wait_event_type, wait_event, left(query, 80) AS q_head
  FROM pg_stat_activity
 WHERE datname = current_database()
   AND state <> 'idle'
   AND pid <> pg_backend_pid();

-- 3. Lock hien co tren cac bang lien quan
SELECT c.relname, l.mode, l.granted, count(*) AS n
  FROM pg_locks l
  JOIN pg_class c ON c.oid = l.relation
 WHERE c.relname IN ('candidate_submissions', 'placement_case', 'labor_profiles')
 GROUP BY c.relname, l.mode, l.granted;

-- 4. PG version (mot so hoat dong catalog-only chi co tren PG 11+)
SHOW server_version;
```

### 2.5 Tac dong theo tung cau lenh tren `candidate_submissions`

| Lenh (theo thu tu trong `_foundation`) | Loai lock | Thoi gian that | Tier 0 can do |
|---|---|---|---|
| (1) `ADD COLUMN placement_case_id TEXT` (nullable, khong default) | ACCESS EXCLUSIVE tren `candidate_submissions` | **CHUA DO**. Catalog-only tren PG 11+ (Neon production chay PG 14+ hoac moi hon; Tier 0 confirm version bang `SHOW server_version`); thoi gian lock thuc te phu thuoc vao contention. Tier 0 do bang cach xem `pg_locks` snapshot khi chay, `pg_stat_activity` de xac nhan khong co query khac dang giu lock. **Luu y**: ACCESS EXCLUSIVE xung dot voi moi lock khac (SELECT, INSERT, UPDATE, DELETE, DDL) -- chan toan bo traffic ghi/doc trong toan bo thoi gian giu lock. Tier 0 do de biet gia tri that. | `pg_locks` + `pg_stat_activity` snapshot. |
| (3) `ADD CONSTRAINT candidate_submissions_placement_case_id_fkey` | SHARE ROW EXCLUSIVE tren `candidate_submissions` + SHARE ROW EXCLUSIVE tren `placement_case` | **CHUA DO**. PG scan toan bo rows `candidate_submissions` de validate FK (vi khong co `NOT VALID`). Scan time ty le voi so rows; lookup o `placement_case.id` (PK) nhanh. Tier 0 uoc luong dua tren `reltuples`. **Luu y**: SHARE ROW EXCLUSIVE xung dot voi ROW EXCLUSIVE (lock cua INSERT/UPDATE/DELETE -- PG conflict table), nen lock nay CHAN toan bo INSERT/UPDATE/DELETE tren `candidate_submissions` trong toan bo thoi gian scan validate (Tier 0 phai do de biet gia tri that). | Snapshot pg_stat_activity khi chay; do scan time; do `pg_locks` tren ca 2 bang. |
| (4) `CREATE INDEX candidate_submissions_placement_case_id_idx` | SHARE tren `candidate_submissions` | **CHUA DO**. Theo PG docs CREATE INDEX (non-CONCURRENTLY): **SHARE lock chan INSERT/UPDATE/DELETE** tren bang do trong toan bo thoi gian xay dung index. Voi bang vai nghin rows co the <1 giay; voi bang lon hon co the vai giay den vai chuc giay. Tier 0 phai do hoac uoc luong dua tren reltuples. | Snapshot pg_stat_activity; do thoi gian. Can nhac `CREATE INDEX CONCURRENTLY` neu downtime > nguong chap nhan (se phai viet migration tach). |

### 2.6 Tac dong tren `placement_case` (bang moi)

**SUA THEO CHI THI OWNER**: dossier KHONG cam ket con so "<1ms" hay "<1 giay tren moi PG version" cho cac lenh tren `placement_case`. Tier 0 phai do bang EXPLAIN ANALYZE hoac test branch clone.

| Lenh | Lock | Tac dong (Tier 0 can do) |
|---|---|---|
| CREATE TABLE | catalog-only | Tier 0 do: thoi gian catalog write |
| CREATE INDEX (2 thuong) | SHARE tren `placement_case` | Tier 0 do: build time; SHARE chan INSERT/UPDATE/DELETE nhung bang moi 0 rows nen build time rat ngan -- Tier 0 van phai do de biet gia tri that, KHONG cam ket con so |
| CREATE UNIQUE INDEX (partial) | SHARE tren `placement_case` | Tier 0 do: build time; tuong tu tren |
| ENABLE/FORCE RLS | ACCESS EXCLUSIVE tren `placement_case` | Tier 0 do: catalog-only nhung Tier 0 phai do thuc te; ACCESS EXCLUSIVE chan toan bo truy cap nen khong the test tren prod bang cach INSERT vai rows neu prod dang co traffic |
| CREATE POLICY | catalog-only | Tier 0 do: thoi gian catalog write |

-> **Bang moi**: Tier 0 van nen do de biet gia tri that, nhung so voi `candidate_submissions` thi rui ro thap hon vi bang trong (Tier 0 co the dump placement_case row count o buoc 2.4 query 1 de xac nhan).

### 2.7 Tac dong tren `labor_profiles` (chi chiu anh huong tu FK)

| Lenh | Lock | Tac dong |
|---|---|---|
| `ADD CONSTRAINT placement_case_labor_profile_id_fkey` (FK duoc them tren `placement_case`) | SHARE ROW EXCLUSIVE tren `placement_case` + SHARE ROW EXCLUSIVE tren `labor_profiles` | **SUA THEO CHI THI OWNER**: SHARE ROW EXCLUSIVE **XUNG DOT** voi ROW EXCLUSIVE (lock mac dinh cua INSERT/UPDATE/DELETE tren PG -- xem PG conflict table tai https://www.postgresql.org/docs/current/explicit-locking.html). Vay SHARE ROW EXCLUSIVE tren `labor_profiles` **CHAN** INSERT/UPDATE/DELETE tren `labor_profiles` trong toan bo thoi gian cau lenh chay. Scan validate chay tren `placement_case` (bang moi, 0 rows) nen thoi gian thuc te tren `labor_profiles` chi bang thoi gian add constraint (catalog + scan 0 rows), TIER 0 PHAI DO bang EXPLAIN/EXPLAIN ANALYZE hoac chay thu tren test branch clone de biet gia tri that -- dossier KHONG cam ket "<1ms". |

### 2.8 Rui ro tong hop (T1 quan sat; Tier 0 quyet dinh mitigation)

| Rui ro | Xac suat (T1 uoc luong) | Hau qua | Mitigation Tier 0 de xuat |
|---|---|---|---|
| `ADD COLUMN` cho long-running query | Trung binh | DDL doi statement ket thuc; downtime tang | Tier 0 do `pg_stat_activity`; cancel query dai truoc khi apply |
| FK validation scan toan bang `candidate_submissions` | Cao (neu bang lon) | SHARE ROW EXCLUSIVE giu trong thoi gian scan; chan DDL dong thoi | Tier 0 do `pg_class.reltuples`; neu >100k rows can nhac `NOT VALID` + validate sau (qua migration tach) |
| `CREATE INDEX` (non-CONCURRENTLY) chan INSERT/UPDATE/DELETE | Cao (neu bang lon) | SHARE lock giu trong thoi gian build; traffic ghi bi tu choi | Tier 0 do scan time; neu > nguong (vi du 5s) dung `CREATE INDEX CONCURRENTLY` (migration tach) |
| FK RESTRICT chan DELETE LaborProfile/PlacementCase | Thap (thiet ke) | App khong xoa -> rui ro thap | Tier 0 grep code base de xac nhan khong co DELETE path |
| RLS policy chan session khong thuoc ADMIN/HR_MANAGER/HR_STAFF | Cao (theo design) | DUNG ky vong -- DEC-N1-06 | Worker/CTV/Public/ANON queries tren `placement_case` = 0 rows. Behavior mong muon. |

---

## 3. Quy trinh ap dung nhat quan

### 3.1 Phuong phap apply

**Dung `prisma migrate deploy`** (da Tier 0 chung minh exit 0 trong `233fab1/step3-deploy-20260913.json` tren test branch).

Luu y:
- `prisma migrate deploy` ap dung **tat ca migration dang pending** theo thu tu trong `prisma/migrations/`. Tier 0 **PHAI kiem tra allowlist ngay truoc khi chay**.
- Quy trinh kiem tra allowlist: Tier 0 chay `prisma migrate status` (READ ONLY), doi chieu voi allowlist = `["20260912140411_n1_placement_case_foundation", "20260912140412_n1_placement_case_rls"]`. Neu pending != 2 N1 -> STOP.

### 3.2 Timeout cho DDL -- KHONG de xuat cach chua chung minh

Dossier truoc da dua ra 3 cach dat timeout (`default_transaction_lock_timeout`, bien Prisma, `PGOPTIONS`). Em da **BO** menu nay vi:

- `default_transaction_lock_timeout` (PostgreSQL: khuyen nghi kiem tra `ALTER ROLE ... SET default_transaction_lock_timeout` hoac `ALTER DATABASE ... SET`) -- Tier 1 khong khang dinh Prisma ton trong co nay khi chua chay thu tren duong ket noi that.
- Bien Prisma env `LOCK_TIMEOUT` -- Prisma chua expose chinh thuc.
- `PGOPTIONS="-c lock_timeout=5000"` -- Tier 1 khong khang dinh Prisma chuyen `PGOPTIONS` xuong libpq khi chua kiem thu.

**Quy tac moi**: neu can timeout, Tier 1 de xuat **mot cach da kiem thu tren test branch** truoc khi dua vao runbook. Hien chua co cach nao duoc Tier 1 verify. Tier 0 quyet dinh: (a) chay khong timeout (mac dinh PG cho lock den khi co); hoac (b) tu Tier 0 kiem thu 1 cach tren test branch, push evidence, roi ap dung.

### 3.3 Quy trinh Tier 0 phai lam theo thu tu

**Buoc 1 -- Pre-flight (READ ONLY, khong lock):**
- Do `pg_class.reltuples` cho `candidate_submissions`, `placement_case`, `labor_profiles` tren `hrp-live`.
- Do `pg_stat_activity` de xac nhan khong co long-running query.
- Do `pg_locks` de xac nhan khong co lock conflict.
- Chay `prisma migrate status` (chi doc) de xac nhan pending list = 2 N1.

**Luu y ve Prisma URL routing cho migration (sua theo chi thi Owner 21:44):**
- `prisma/schema.prisma` khai bao `directUrl = env("DATABASE_URL_ADMIN")` va `url = env("DATABASE_URL")`.
- Theo Prisma docs (https://www.prisma.io/docs/orm/overview/databases/postgresql), `directUrl` la URL ket noi truc tiep (non-pooled) ma Prisma CLI su dung cho migration/introspection -- ly do: pooled connection qua PgBouncer khong ho tro mot so operation nhu `CREATE INDEX CONCURRENTLY`, advisory locks, hay long-lived transactions can thiet cho migration DDL. Runtime query thi di qua pooled `url` de su dung connection pooler.
- Vi vay, **Prisma `migrate deploy` se ket noi qua `DATABASE_URL_ADMIN` (directUrl)**, KHONG phai qua `DATABASE_URL` (pooled).
- Gate prod cua Tier 1 check CA HAI: `DATABASE_URL_ADMIN` (URL ma Prisma migrate deploy that su dung) + `DATABASE_URL` (URL runtime, de phong hop Tier 0 sua schema de bo directUrl). Ca hai phai map ve cung endpoint-id. Neu Tier 0 sua `prisma/schema.prisma` de chi con `url` (bo `directUrl`), Tier 1 se can cap nhat gate -- nguoc lai, neu gate check chi `DATABASE_URL_ADMIN` thi Tier 0 bo `directUrl` co the khong bi gate bat.
- Tier 0 KHONG sua `prisma/schema.prisma` trong Stage 4 (task N1 chi them migration, khong sua schema).

**Buoc 2 -- Xac minh dich trien khai `hrp-live` (xem §4):**
- Chay `neon_branch_gate_prod.ps1` (KHONG co tham so `-TestMode`, KHONG co `NEON_API_BASE`); env vars `DATABASE_URL_ADMIN` + `DATABASE_URL` (dat cung gia tri ma Tier 0 viet `prisma migrate deploy` se doc) phai da set san.
- Verify branch name + endpoint-id + same_branch PASS.

**Buoc 3 -- Apply:**
- `prisma migrate deploy` -- capture exit code + stdout + stderr (artifact `step3-deploy-20260913-hrp-live.json`).
- Tier 0 commit artifact len repo truoc khi chay buoc tiep.

**Buoc 4 -- Verify (READ ONLY):**
- Chay cac query o **§5.3** (Verify sau khi apply Stage 4 tren `hrp-live`) de verify `_prisma_migrations` (37+5+0=42 rows; n1_count=2).
- Verify `placement_case` table + indexes + FKs + RLS + policy.
- Verify `candidate_submissions.placement_case_id` column + index + FK.

**Luu y quan trong**: §5.2 la preflight query (do truoc khi apply, de xac nhan N1 chua apply va placement_case chua ton tai). **§5.3 la post-deploy verify query** (sau khi apply PASS, de xac nhan N1 da apply va dung schema). Tier 0 phai dung dung query theo giai doan. **§5.2 KHONG co gia tri de verify post-deploy** (no chi ra "chua co N1" -- sau khi apply N1 thi §5.2 se tra ve n1_count=0 hoac 2 tuy trang thai, nhung khong phai la verify PASS).

Tier 0 cung nen **GIAM SAT live traffic** trong 5-10 phut sau apply (chay query dem row/s giay cho `candidate_submissions`, kiem tra error rate trong application log) de xac nhan FK validation + index build khong gay side effect len traffic ghi. Day la buoc thu cong (Tier 1 khong co quyen truy cap live log).

**Buoc 5 -- Push evidence:**
- Commit evidence len `origin/main`.

---

## 4. Xac minh dich trien khai -- `hrp-live` (gate rieng da kiem thu)

### 4.1 Quy tac vang

**KHONG dung co `primary` cua Neon de quyet dinh "day la prod".** Co `primary` chi la metadata; Tier 0 chi tin `branch.name == "hrp-live"` exact equality.

Quan trong: Tier 0 **KHONG** dung co `primary` de xac nhan test branch. Gate test (cu) **tu choi primary** (exit 14) -- day la prod guard dac thu cho test gate, khong phai quy tac chung.

### 4.2 Tier 0 chi coi `hrp-live` la dich trien khai khi

1. `branch.name == "hrp-live"` (case-sensitive, chinh xac 8 ky tu).
2. `branch.id` resolved qua Neon API trung voi `branch.id` cua branch co ten `hrp-live`.
3. `endpoint.host` (sau khi normalize qua `EndpointIdOf()`) chua dung `endpointId` cua branch `hrp-live`.
4. Ca admin va writer endpoint-ids map ve cung branch.
5. `branch_name_matches == true` VA `same_branch == true` (theo output contract cua `neon_branch_gate_prod.ps1`).

### 4.3 Gate `neon_branch_gate.ps1` hien tai -- khong phu hop cho `hrp-live`

Gate test (`docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/neon_branch_gate.ps1`, commit `03fecc2`) dung:
- Bien `NEON_EXPECTED_BRANCH_NAME` (default `hrp_mp2_test`).
- Logic **tu choi primary** cho test branch: khi `branch_is_primary=true` -> exit **`14`** (sua theo chi thi Owner: truoc dossier ghi `13` -- sai; theo script that exit `14` = "branch is the project's primary branch (prod guard)").

Voi `hrp-live`, gate can khac (sua theo chi thi Owner 21:44):
- `NEON_EXPECTED_BRANCH_NAME` KHONG con override duoc -- gate prod **hardcode** branch name thanh `hrp-live`. Production deploy LUON LUON target `hrp-live`; override se vo hieu hoa muc dich cua production gate.
- **BO logic reject primary**: `hrp-live` CO THE la primary branch trong plan Neon hien tai -- Tier 0 xac nhan qua Neon API.
- Case-sensitive exact match `branch.name == "hrp-live"` (test gate dung `.ToLower()` so sanh -- gate prod dung `-ceq` de phan biet chinh xac `hrp-live` khoi `HRP-LIVE`, `hrp_Live`, `hrp-live `, `hrp-live-`).
- **Doc env vars khop prisma/schema.prisma (sua theo chi thi Owner 21:44)**: gate prod doc `DATABASE_URL` (runtime/CLI default) + `DATABASE_URL_ADMIN` (directUrl -- **Prisma CLI/migration su dung de mo ket noi truc tiep non-pooled de apply DDL**, vi pooled connection qua PgBouncer khong ho tro mot so operation nhu advisory lock va long-lived transaction can thiet cho migration DDL; theo Prisma docs https://www.prisma.io/docs/orm/overview/databases/postgresql). Tier 1 KHONG dung `HRP_LIVE_URL_*` va KHONG co tham so `-Url1/-Url2` -- ca hai deu cho phep operator bypass env mismatch (Tier 0 viet `prisma migrate deploy` se doc `DATABASE_URL_ADMIN` qua `directUrl`; neu gate doc `HRP_LIVE_URL_ADMIN` ma Prisma doc `DATABASE_URL_ADMIN`, hai co the tro toi hai branch khac nhau ma gate van PASS).
- **Mock Neon API bi khoa chat (sua theo chi thi Owner 21:44)**: `NEON_API_BASE` chi duoc chap nhan khi `-TestMode` switch duoc pass **va trong test mode gate KHONG BAO GIO phat exit 0 + verdict `gate=PASS`** -- thay bang exit 19 + verdict `gate=TEST_PASS`. Muc dich: chan mot operator (bat can hoac co y xau) chay `pwsh gate.ps1 -TestMode` roi feed exit 0 vao deploy script de mo production deploy. Production deploy KHONG co `-TestMode`, nen bat ky attempt nao de override Neon API thanh fake server se bi gate exit 17 truoc khi goi API. `NEON_ALLOW_MOCK_API=1` (env var) cu~ KHONG con duoc chap nhan -- chi co `-TestMode` switch moi mo mock; env var co the bi set tu session truoc va quen xoa.
- **Tach tin hieu PASS khoi test logic (sua theo chi thi Owner 21:44)**: 
  - Production preflight (khong `-TestMode`, khong `NEON_API_BASE`): PASS -> exit 0 + `gate=PASS`.
  - Test mode (co `-TestMode`): PASS logic nhung emit `gate=TEST_PASS` + exit 19. Deploy script PHAI phan biet: exit 0 = deploy-ready, exit 19 = chi la test PASS (deploy script KHONG duoc di tiep).

### 4.4 Gate production da viet + kiem thu

Tier 1 da viet gate production:

- **Script:** `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/neon_branch_gate_prod.ps1`
- **Fake Neon API stub (offline):** `evidence/stage4-preflight/fake_neon_api.js` (Node.js HTTP server, 4 scenarios).
- **Test harness:** `evidence/stage4-preflight/test-neon-branch-gate-prod.ps1` (chay 6 case qua fake API, capture exit code + summary JSON).
- **Summary:** `evidence/stage4-preflight/gate-prod-test-summary.json`.

**Exit codes cua gate prod:**

| Code | Y nghia |
|---|---|
| 0 | **PRODUCTION PREFLIGHT PASS**. Real Neon API duoc query, ca `DATABASE_URL_ADMIN` va `DATABASE_URL` map ve cung endpoint-id, endpoint do nam trong branch co ten dung `hrp-live` (case-sensitive). Deploy script co the di tiep sang `prisma migrate deploy`. Exit 0 CHI duoc emit khi KHONG co `-TestMode` switch. |
| 10 | credentials missing (NEON_API_KEY / NEON_PROJECT_ID, hoac `DATABASE_URL_ADMIN` / `DATABASE_URL` khong set). Gate khong doc `HRP_LIVE_URL_*` fallback. |
| 11 | HTTP error tu Neon API |
| 12 | endpoint-id khong co trong bat ky branch nao cua project |
| 13 | `DATABASE_URL_ADMIN` va `DATABASE_URL` map ve 2 endpoint-id khac nhau (URL khong dong nhat -> Prisma migrate deploy se ghi vao 1 trong 2 branch nhung gate khong biet branch nao la dich that su). Refuse TRUOC khi hit API. |
| 16 | branch name != "hrp-live" (case-sensitive exact equality fail; hoac `NEON_EXPECTED_BRANCH_NAME` bi set override -> ignored) |
| 17 | `NEON_API_BASE` duoc set nhung KHONG co `-TestMode` switch (gate tu choi dung fake API o production) |
| 19 | **TEST PASS** (test mode only). Logic PASS, nhung KHONG PHAI production preflight. Deploy script phai KHONG di tiep khi gap exit 19. |

**Luu y quan trong ve exit codes:**
- Gate prod **khong co exit code 14** (primary reject) vi `hrp-live` co the la primary -- day la diem khac biet cot loi so voi gate test.
- Gate prod **khong co exit code 15** (test gate dung cho branch name mismatch case-insensitive); thay bang exit `16` (case-sensitive).
- Gate prod **khong doc `NEON_EXPECTED_BRANCH_NAME`** -- branch name hardcode trong script.
- Gate prod **khong doc `NEON_ALLOW_MOCK_API`** -- chi `-TestMode` switch mo mock (env var khong du tin cay).
- Gate prod **khong co `-Url1`/`-Url2` parameters** -- chi doc env vars (khong the bypass env mismatch qua command line).
- Gate prod **khong co fallback `HRP_LIVE_URL_*`** -- chi doc `DATABASE_URL`/`DATABASE_URL_ADMIN` (khop Prisma).
- Gate prod **tach test PASS (`exit 19`) khoi production PASS (`exit 0`)** -- deploy script KHONG duoc interpret `exit 19` nhu deploy-ready.

**Test results (6/6 PASS, timestamp 2026-09-13T21:42:xx+07:00):**

| Scenario | Mo ta | Input (Url1 = DATABASE_URL_ADMIN, Url2 = DATABASE_URL) | TestMode | Expected exit | Actual exit |
|---|---|---|---|---|---|
| `test-pass-hrp-live` | Ca 2 URL map ve `hrp-live` (primary) -- TEST_MODE phat TEST_PASS thay vi PASS | Ca 2 ep-shy-tree-az32as2c | co | 19 | 19 |
| `test-refuse-name` | Ca 2 URL map ve `hrp_mp2_test` (test branch) -- gate hardcode hrp-live nen tu choi theo ten | Ca 2 ep-empty-forest-azlhfyo9 | co | 16 | 16 |
| `test-refuse-empty` | URL tro ve endpoint-id khong ton tai | Ca 2 ep-nope-nope-nope | co | 12 | 12 |
| `test-wrong-branch` | `DATABASE_URL_ADMIN` -> hrp-live; `DATABASE_URL` -> hrp_mp2_test (moi URL tro ve branch khac nhau) | Url1 ep-shy-tree-az32as2c, Url2 ep-empty-forest-azlhfyo9 | co | 13 | 13 |
| `prod-mock-without-testmode` | `NEON_API_BASE` = fake URL set, KHONG co `-TestMode` switch (gate phai refuse truoc khi goi API; neu khong co guard, fake API se return PASS gia) | Ca 2 ep-shy-tree-az32as2c; fake API base | khong | 17 | 17 |
| `test-hrp-live-url-only` | Chi co `HRP_LIVE_URL_*` set (khong co `DATABASE_URL*`) -- gate phai refuse 10 vi khong co fallback | Ca 2 ep-shy-tree-az32as2c; chi HRP_LIVE_URL_* | co | 10 | 10 |

**Tinh huong dac biet quan trong can test (Tier 1 da cover):**

- **Case `test-hrp-live-url-only`** chung minh gate KHONG chap nhan `HRP_LIVE_URL_*` fallback. Neu Tier 0 chi set `HRP_LIVE_URL_ADMIN/WRITER` (nhieu baseline script Tier 0 da dung -- xem `233fab1/baseline-readonly-20260913T121238Z.json`), gate refuse 10. Tier 0 PHAI migrate env vars sang `DATABASE_URL`/`DATABASE_URL_ADMIN` cho khop Prisma truoc khi chay gate.
- **Case `prod-mock-without-testmode`** chung minh neu Tier 0 (hoac attacker) set `NEON_API_BASE` ma khong co `-TestMode`, gate refuse 17. `NEON_API_BASE` chi co the mo mock qua `-TestMode` switch (env var `NEON_ALLOW_MOCK_API` khong con duoc chap nhan).
- **Case `test-pass-hrp-live`** chung minh test mode KHONG emit `gate=PASS` exit 0; chi emit `gate=TEST_PASS` exit 19. Deploy script PHAI check exit code va tu choi di tiep khi gap 19.

Summary JSON ghi timestamp + node + powershell version + per-scenario exit code + stderr tail. Tier 1 da verify 6/6 PASS tren test harness offline. **Luu y quan trong: 6/6 test tren chi la proof-of-correctness cho code gate; KHONG PHAI preflight tren Neon that**. Tier 0 phai chay gate voi NEON_API_KEY that + NEON_PROJECT_ID that + DATABASE_URL that + DATABASE_URL_ADMIN that (KHONG co `NEON_API_BASE`, KHONG co `-TestMode`) truoc khi apply migration. Exit 0 moi la production PASS.

### 4.5 Cach xac minh (READ-ONLY, dung Neon API + pg query)

**Buoc 1:** Lay branch info qua Neon API.

```bash
curl -s -H "Authorization: Bearer $NEON_API_KEY" \
     "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches" \
     | jq '.branches[] | select(.name=="hrp-live") | {id, name, primary}'
```

**Buoc 2:** Lay endpoint info cho `hrp-live`.

```bash
curl -s -H "Authorization: Bearer $NEON_API_KEY" \
     "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches/$BRANCH_ID/endpoints" \
     | jq '.endpoints[] | select(.type=="read_write") | {id, host, port}'
```

**Buoc 3:** Cross-check endpoint-id voi DATABASE_URL.

```bash
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

**Buoc 4:** Xac minh bang SQL ngay khi ket noi (defense-in-depth).

```sql
SELECT current_database() AS db_name,
       inet_server_addr() AS server_ip,
       version() AS pg_version;
```

### 4.6 Cam

| Hanh dong | Ly do cam |
|---|---|
| Goi `neon branches create --primary` de "hop thuc hoa" prod | Tier 0 KHONG duoc tao branch moi |
| Dua vao `branch.primary == true` de chon branch | Co co the sai |
| Echo `DATABASE_URL` ra log | Lo credential |
| Dung `neon_branch_gate.ps1` cu (gate test) cho `hrp-live` | Gate test reject primary (exit 14); logic nguoc voi prod |
| Dat env `NEON_EXPECTED_BRANCH_NAME` de doi branch dich | Gate prod khong doc bien nay -- hardcode `hrp-live` |
| Dat env `NEON_API_BASE` de chi gate vao fake server | Gate prod chi chap nhan khi co `-TestMode` switch; neu khong co switch (production) gate refuse exit 17 truoc khi goi API. `NEON_ALLOW_MOCK_API=1` (env var) cu~ KHONG con duoc chap nhan -- chi co `-TestMode` switch moi mo mock (env var co the bi set tu session truoc va quen xoa). |
| Dat env `NEON_ALLOW_MOCK_API=1` de mo mock API o production | Gate prod KHONG con doc bien nay. Phai dung `-TestMode` switch. |
| Dat env `HRP_LIVE_URL_ADMIN/WRITER` ma KHONG dat `DATABASE_URL/ADMIN` | Gate prod doc `DATABASE_URL/ADMIN` (khop prisma/schema.prisma). Tier 0 viet `prisma migrate deploy` cung doc `DATABASE_URL_ADMIN` qua `directUrl` -> gate va Prisma cung xem mot URL. Neu Tier 0 chi set `HRP_LIVE_URL_*`, gate se refuse (exit 10). **Tier 0 phai migrate env vars sang `DATABASE_URL`/`DATABASE_URL_ADMIN` TRUOC khi chay gate**. |
| Truyen `-Url1`/`-Url2` parameter cho gate | Gate prod KHONG co 2 parameter nay. Chi doc env vars. Neu Tier 0 muon bypass env mismatch qua command line, gate khong chap nhan. |
| Chay `pwsh gate.ps1 -TestMode` roi feed `exit 0` vao deploy script de mo deploy that | Test mode emit `exit 19` + `gate=TEST_PASS`, KHONG phai `exit 0` + `gate=PASS`. Deploy script PHAI check exit code va tu choi di tiep khi gap 19. |
| Sua `prisma/schema.prisma` trong Stage 4 (bo `directUrl`, doi `url`) | Tier 0 KHONG sua schema trong Stage 4 (task N1 chi them migration). Neu sua, gate can cap nhat vi `directUrl` co the khong con la `DATABASE_URL_ADMIN` nua. |

---

## 5. Xac nhan "chi con dung 2 migration N1"

### 5.1 So lieu that tu evidence `233fab1` + `d70cb1a`

| Metric | Test branch `hrp_mp2_test` (sau Stage 3) | Production `hrp-live` (do 13/09 19:19) | Production (sau Stage 4 apply PASS) |
|---|---|---|---|
| completed | **37** | **35** | **37** |
| rolled-back | **5** | **5** | **5** |
| unfinished | **0** | **0** | **0** |
| N1 tracking rows | 2 (`20260912140411_*`, `20260912140412_*`) | 0 | 2 |
| `placement_case` table | ton tai | NULL | ton tai |
| Tong rows `_prisma_migrations` | **42** | **40** | **42** |

**Test branch `hrp_mp2_test` da apply N1** (theo `233fab1/postrun-cleanup-and-live-20260913.json` -- `test.counts.completed=37`, `test.n1_tracking` chua 2 entries voi `started_at=2026-09-13T12:17:34.133Z` va `2026-09-13T12:17:34.555Z`). **Test branch KHONG con la mirror cua `hrp-live`** tai thoi diem 13/09 21:00.

### 5.2 Cach xac minh READ-ONLY tren `hrp-live` ngay truoc khi apply

```sql
-- Query A: Tong so migration da apply (finished) va chua apply
SELECT
  COUNT(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS completed,
  COUNT(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS unfinished_stuck,
  COUNT(*) FILTER (WHERE rolled_back_at IS NOT NULL) AS rolled_back,
  COUNT(*) FILTER (WHERE migration_name LIKE '2026091214%') AS n1_partial_count
FROM _prisma_migrations;
-- Ky vong tren hrp-live: completed=35, unfinished_stuck=0, rolled_back=5, n1_partial_count=0

-- Query B: Liet ke 2 migration N1 pending
SELECT migration_name, started_at, finished_at, rolled_back_at, checksum
  FROM _prisma_migrations
 WHERE migration_name LIKE '2026091214%';
-- Ky vong tren hrp-live: 0 rows (chua apply)

-- Query C: Verify bang placement_case chua ton tai.
-- to_regclass dung cho RELATION (table/view/index/sequence).
-- Enum la TYPE, khong phai relation; dung to_regtype (PG phan biet relation va type).
SELECT to_regclass('public.placement_case') AS placement_case_relation_exists,
       to_regtype('public."PlacementCaseStatus"') AS placementcase_type_exists;
-- Ky vong tren hrp-live: NULL, NULL
```

### 5.3 Verify sau khi apply Stage 4 tren `hrp-live`

```sql
-- Verify _prisma_migrations
SELECT
  COUNT(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS completed,
  COUNT(*) FILTER (WHERE migration_name LIKE '2026091214%') AS n1_count
FROM _prisma_migrations;
-- Ky vong: completed=37, n1_count=2

-- Verify partial unique index
SELECT indexname, indexdef
  FROM pg_indexes
 WHERE indexname = 'placement_case_labor_profile_id_active_unique';
-- Ky vong: 1 row, indexdef chua 'WHERE (status = ANY (...))'

-- Verify FK (chuy: confdeltype='r' = RESTRICT, confupdtype='c' = CASCADE)
SELECT conname, conrelid::regclass, confrelid::regclass, confdeltype, confupdtype
  FROM pg_constraint
 WHERE conname IN (
   'placement_case_labor_profile_id_fkey',
   'candidate_submissions_placement_case_id_fkey'
 );
-- Ky vong:
--   placement_case_labor_profile_id_fkey: conrelid=placement_case, confrelid=labor_profiles, r, c
--   candidate_submissions_placement_case_id_fkey: conrelid=candidate_submissions, confrelid=placement_case, r, c

-- Verify RLS
SELECT relname, relrowsecurity, relforcerowsecurity
  FROM pg_class
 WHERE relname = 'placement_case';
-- Ky vong: relrowsecurity=t, relforcerowsecurity=t

-- Verify policy (bo sung: roles + USING + WITH CHECK, khong chi ten va polcmd)
-- polcmd cho ALL la ky tu '*' (theo PG docs pg_policy), khong phai '{a}'.
SELECT
  polname,
  polcmd,
  polpermissive,
  -- roles: pg_policy.polroles la oid[] cua role duoc apply policy. Dung regrole de
  -- lay ten role (PG khong the lay truc tiep qua array_to_string mac dinh).
  (SELECT string_agg(r.rolname, ',' ORDER BY r.oid)
     FROM pg_roles r
    WHERE r.oid = ANY(polroles)) AS role_names,
  pg_get_expr(polqual, polrelid) AS using_expression,
  pg_get_expr(polwithcheck, polrelid) AS with_check_expression
FROM pg_policy
WHERE polrelid = 'placement_case'::regclass;
-- Ky vong: polname='hrp_placement_case_scope', polcmd='*', polpermissive=true,
--          role_names='app_user,app_user_writer' (sau ORDER BY oid),
--          using_expression = with_check_expression = '(hrp_session_role() = ANY (ARRAY[...]))'

-- Verify candidate_submissions co column + index
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_name = 'candidate_submissions' AND column_name = 'placement_case_id';
-- Ky vong: data_type='text', is_nullable='YES'

SELECT indexname, indexdef
  FROM pg_indexes
 WHERE indexname = 'candidate_submissions_placement_case_id_idx';
-- Ky vong: 1 row, btree non-unique
```

---

## 6. Quy trinh dung & chan doan (KHONG co recovery mac dinh)

### 6.1 Nguyen tac

**Neu migration loi giua chung: DUNG, giu nguyen trang thai, KHONG tu retry, KHONG tu rollback DDL.**

Ly do:
- `ALTER TABLE ... ADD COLUMN` (nullable, khong default) **khong co `IF NOT EXISTS`**. Prisma KHONG tu bo qua mot migration ap do.
- `prisma migrate resolve --rolled-back` (xem [Prisma migrate -- failed migration](https://www.prisma.io/docs/orm/prisma-migrate/workflows/troubleshooting)) la co che chinh thuc de danh dau migration la rolled back, nhung Tier 0 **KHONG** dung no tu dong tren `hrp-live`. Tier 0/Owner quyet dinh phuong an recovery sau khi co day du evidence.
- T1 **KHONG** de xuat phuong an recovery mac dinh (sua migration da commit, them migration moi, drop bang, drop FK, v.v.) vi migration cu co the dang failed o trang thai khong xac dinh va moi phuong an deu co rui ro rieng. Quyet dinh recovery thuoc ve Tier 0/Owner, dua tren evidence that.
- T1 **XOА** moi goi y DROP POLICY / DISABLE RLS / DROP TABLE / DROP COLUMN / UPDATE `_prisma_migrations` truc tiep. Nhung thao tac nay deu co nguy co che giau loi, gay mat data hoac pha vo audit trail.

### 6.2 Quy trinh khi migration loi

**Buoc 1 -- Dung ngay lap tuc:**
- Neu `prisma migrate deploy` exit non-zero: **dung** tai lenh do. KHONG chay tiep bat ky lenh SQL/Prisma nao tren `hrp-live`.

**Buoc 2 -- Thu thap evidence:**
- Capture exit code + stdout + stderr cua `prisma migrate deploy` (artifact file `step3-deploy-20260913-hrp-live.failed.json`).
- Capture trang thai DB ngay luc do (READ ONLY):
  ```sql
  -- Migration nao da apply thanh cong truoc khi fail?
  SELECT migration_name, started_at, finished_at, rolled_back_at, logs
    FROM _prisma_migrations
   WHERE migration_name LIKE '2026091214%'
   ORDER BY started_at;
  -- placement_case table co ton tai khong?
  SELECT to_regclass('public.placement_case') AS placement_case_relation_exists,
         to_regtype('public."PlacementCaseStatus"') AS placementcase_type_exists;
  -- candidate_submissions.placement_case_id column co chua?
  SELECT column_name FROM information_schema.columns
   WHERE table_name='candidate_submissions' AND column_name='placement_case_id';
  -- pg_locks hien tai
  SELECT mode, granted, count(*)
    FROM pg_locks
   GROUP BY mode, granted;
  ```
- Capture `pg_stat_activity` de xem co session nao dang giu lock.
- Luu tat ca artifact vao file + commit len repo (evidence cho quyet dinh recovery).

**Buoc 3 -- Bao cao Owner/Tier 0:**
- Tom tat: migration nao fail, o cau lenh nao, vi ly do gi, trang thai DB hien tai.
- KHONG tu quyet dinh phuong an recovery. Owner/Tier 0 quyet dua tren evidence.

### 6.3 Tham khao Prisma cho recovery

[Prisma migrate -- troubleshooting failed migration](https://www.prisma.io/docs/orm/prisma-migrate/workflows/troubleshooting) mo ta quy trinh `prisma migrate resolve --rolled-back <name>` cho migration bi failed. Tier 0/Owner dung tai lieu nay de chon phuong an sau khi co evidence; Tier 1 **khong** de xuat cach ap dung cu the trong dossier nay.

### 6.4 Cac thao tac T1 cam tuyet doi de xuat

| Thao tac | Ly do cam |
|---|---|
| `DROP POLICY ... ON placement_case` | Che giau loi, co the che giau state RLS khong nhat quan |
| `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` / `NO FORCE ROW LEVEL SECURITY` | Che giau loi, policy co the van duoc coi la applied |
| `DROP TABLE placement_case` | Mat cau truc; FK tu `candidate_submissions` se block drop hoac drop ca 2 bang |
| `ALTER TABLE candidate_submissions DROP COLUMN placement_case_id` | Khong co `IF EXISTS` semantic tot voi cot co FK; co the mat data neu da duoc set |
| `DROP INDEX candidate_submissions_placement_case_id_idx` | Co the OK neu chi la rebuild, nhung Tier 1 khong tu quyet |
| `UPDATE _prisma_migrations SET rolled_back_at = NOW()` | Pha vo audit trail; Tier 0/Owner moi co quyen nay |
| Tu retry `prisma migrate deploy` sau khi fail | Co the fail lap lai; thay doi state giua cac lan retry lam kho chan doan |
| Sua file SQL cua 2 migration da commit (vd them `NOT VALID`) | Prisma dung checksum; sua file se fail `migrate deploy` o lan sau |

---

## 7. Stage 5 / AV6 van chua mo

Theo `current_gate` rev 2.31 (`N1_STAGE3_PASS_AWAITING_STAGE4_OWNER_DECISION`) + queue_authority o §0 PLANNER_HANDOVER.md:

- **Stage 5** (`hrp-v6-n1-intake-writer`): PENDING, gated boi Stage 3 + Stage 4. **KHONG mo.**
- **AV6** (HomepageSection CMS): DEFER, conflict schema/migration voi Stage 3/4. **KHONG mo.**

Tier 1 chi chuan bi Stage 4 dossier nay + gate production + test evidence. Tier 0/Owner la nguoi quyet dinh khi nao mo Stage 4.

---

## 8. Phu luc

### 8.1 Tai lieu tham khao

- TASK N1: `docs/tasks/hrp-v6-n1-placement-case-foundation/TASK.md` (commit `9fe4da2`).
- HANDOFF N1: `docs/tasks/hrp-v6-n1-placement-case-foundation/HANDOFF.md` (rev round 2 PASS).
- Fingerprint v1.1: `docs/tasks/hrp-v6-n1-stage3-investigation/evidence/hrp-live-fingerprint.md` (commit `0611b5d`).
- Verify scripts: `docs/tasks/hrp-v6-n1-stage3-investigation/evidence/verify-pre-step2.sql`.
- AV4 fix: commit `d790bcf` (UUID -> TEXT, bo REFERENCES users(id)).
- Stage 3 self-test: `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/`.
- Stage 3 real-run evidence: `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-hrp-mp2-test-run/` (commit `d70cb1a` + `233fab1`).
- Cross-check report Stage 3: `docs/investigations/n1-stage3-t1-cross-check-2026-09-13/REPORT.md`.
- PLANNER_HANDOVER.md rev 2.31 (Tier 0): advance cursor -> `N1_STAGE3_PASS_AWAITING_STAGE4_OWNER_DECISION`.
- **Stage 4 gate production:** `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/neon_branch_gate_prod.ps1` + `fake_neon_api.js` + `test-neon-branch-gate-prod.ps1` + `gate-prod-test-summary.json`.
- PG docs tham khao: https://www.postgresql.org/docs/current/explicit-locking.html, https://www.postgresql.org/docs/current/sql-altertable.html, https://www.postgresql.org/docs/current/sql-createindex.html, https://www.postgresql.org/docs/current/catalog-pg-policy.html.

### 8.2 Cross-check ngay 13/09 21:00

- Local `HEAD = fee3f9f` (rev 2.32 dossier Stage 4 commit cua T1); **local AHEAD origin/main 1 commit** (`origin/main` HEAD = `233fab1`, Tier 0 commit 19:54). Tier 0 se fetch + merge truoc khi apply Stage 4, hoac Tier 1 push sau khi dossier nay duoc duyet.
- `git ls-remote origin` chi co 2 branch (`main` + `tier1/n1-foundation`), khong co tier0 branch.
- T1 khong co quyen `psql` toi `hrp-live` -- Tier 0 la nguoi duy nhat chay duoc query SQL READ-ONLY tren production.

### 8.3 Trang thai dossier

- **Status:** **Tier 0 NO-GO cho Stage 4 hien tai** (decision 13/09 22:00 UTC+7). Tier 1 commit/push dossier + gate + test harness nhung KHONG chay `prisma migrate deploy` tren `hrp-live`.
- **Ly do NO-GO (Tier 0 bao cao 13/09 22:00):**
  - 6/6 PASS chi la test tren Neon gia (fake API stub) -- KHONG co gia tri preflight.
  - Gate chua chay voi Neon that (chua co production credential).
  - `prisma migrate status` khong tra duoc danh sach pending -- ket noi admin chi doc tra error **28P01** (PostgreSQL: `invalid_password` / authentication failed). Xem [PostgreSQL error codes](https://www.postgresql.org/docs/current/errcodes-appendix.html).
  - Vay khong the xac nhan dung 2 N1 pending, khong the do lock production, khong the predict behavior cua `prisma migrate deploy` that su tren `hrp-live`.
  - Tier 0 chua thuc hien thao tac ghi DB nao.
- **Dieu kien GO (Tier 0 se danh gia lai khi credential san):**
  - Owner/Operator cap nhat production credential + Neon API qua kenh bao mat.
  - Ket noi admin (read-write) hoat dong -- Tier 0 chay duoc `prisma migrate status` ma khong gap 28P01.
  - Tier 0 chay gate that tren Neon that (khong `-TestMode`, khong `NEON_API_BASE`) va nhan `exit 0`.
  - Tier 0 verify dung 2 N1 pending (`20260912140411_n1_placement_case_foundation` + `20260912140412_n1_placement_case_rls`), KHONG co migration loi (khong co row nao co `finished_at IS NULL`).
  - Tier 0 do duoc tinh trang tranh chap lock truoc deploy (qua `pg_locks`, `pg_stat_activity`) va uoc luong tac dong lock (qua test branch clone chay thu `prisma migrate deploy` voi EXPLAIN ANALYZE). Muc tac dong chap nhan duoc do Tier 0/Owner thiet lap nguong (Tier 1 KHONG cam ket con so cu the). **Luu y quan trong**: thoi gian lock that cua migration tren `hrp-live` chi do duoc khi thuc thi -- preflight chi co the uoc luong, KHONG phai phep do da hoan thanh truoc khi GO. Tier 0 can quyet dinh dua tren uoc luong + nguong chap nhan + rollback plan (§6), KHONG dua tren mot con so thoi gian lock "da do duoc tu preflight".
  - **CHI khi ca 5 dieu kien tren PASS**, Tier 0 doi verdict sang GO va chay `prisma migrate deploy`. Neu bat ky dieu kien nao FAIL, Tier 0 giu NO-GO va cap nhat dossier / bay lai cho Tier 1.
- **Pham vi Tier 1 commit/push (sau NO-GO):**
  - `docs/investigations/n1-stage4-readonly-prod-state-check-2026-09-13/DOSSIER.md` (rev 2.33 -- round 3).
  - `docs/investigations/n1-stage4-readonly-prod-state-check-2026-09-13/COVER-NOTE-TO-OWNER.md`.
  - `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/neon_branch_gate_prod.ps1` (gate).
  - `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/fake_neon_api.js` (fake API stub -- can thiet de test harness chay lap).
  - `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/test-neon-branch-gate-prod.ps1` (test harness).
  - `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/gate-prod-test-summary.json` (6/6 PASS).
- **Tier 1 KHONG push (working tree local)**: 12 file `*.log` (6 case `gate-*.{stdout,stderr}.log` + 6 case `fake-api-*.{stdout,stderr}.log`) bi `.gitignore` rule `*.log` repo-level bo qua. Logs van con o working tree de Tier 0 tham khao khi can, nhung KHONG nam trong commit `a987e80`.
- **Tier 1 KHONG thuc hien:** KHONG chay `prisma migrate deploy`, KHONG cap nhat production credential, KHONG tu fix 28P01 (Tier 0/Owner thuoc kenh bao mat).

### 8.4 Thay doi so voi ban dossier truoc (rev 2.32 / chi thi Owner 13/09 20:14 -> 21:25 -> 21:44)

**Round 1 (chi thi 20:14):** §3.2 timeout menu, §3.3 + §4.3 gate test exit 14, §4.4 gate test 3/3 PASS, §5.2 enum check (`to_regtype`), §5.3 policy verify bo sung, §6 rollback R-A..R-E (bo), §6.4 cam them "sua file SQL", §2.2 FK lock (SHARE ROW EXCLUSIVE tren ca 2 bang), §8.2 git state.

**Round 2 (chi thi 21:25):** §2.7 sua lock, §2.5+§2.6 bo cam ket thoi gian, §4.4 gate env vars, §4.4 gate override, §4.6 cam them 3 dong, §4.4 test scenarios them `wrong-branch` + `mock-without-testmode` (5/5 PASS).

**Round 3 (chi thi 21:44):**

| Muc | Truoc (rev round 2 / chi thi 21:25) | Sau (rev nay / chi thi 21:44) |
|---|---|---|
| Gate env vars fallback + CLI override | Gate doc `HRP_LIVE_URL_*` fallback + `-Url1`/`-Url2` parameters (Tier 0 co the bypass env mismatch) | **BO fallback `HRP_LIVE_URL_*` + BO parameters `-Url1`/`-Url2`**. Gate chi doc `DATABASE_URL_ADMIN` + `DATABASE_URL` tu env. Tier 0 PHAI migrate env vars sang `DATABASE_URL*` truoc khi chay gate. Tier 0 KHONG the bypass qua command line. |
| `directUrl` semantics | "directUrl = Prisma shadow DB / introspection" (qua v.v.) | **SUA**: theo Prisma docs (https://www.prisma.io/docs/orm/overview/databases/postgresql), `directUrl` la URL ket noi truc tiep non-pooled ma Prisma CLI/migration su dung de apply DDL. Pooled connection qua PgBouncer khong ho tro advisory lock + long-lived transaction can thiet cho migration. Vay `prisma migrate deploy` se connect qua `DATABASE_URL_ADMIN` (directUrl), KHONG phai qua `DATABASE_URL` (pooled runtime URL). Gate check CA HAI de phong hop Tier 0 sua schema de bo directUrl. |
| Tach tin hieu PASS khoi test logic | Test mode emit `exit 0` + `gate=PASS` (co the bi deploy script interpret nhu production PASS) | **SUA**: test mode emit `exit 19` + `gate=TEST_PASS` (KHONG the nham voi production `exit 0` + `gate=PASS`). Production deploy script PHAI check exit code va tu choi di tiep khi gap 19. |
| Mock allowance gate | `NEON_ALLOW_MOCK_API=1` (env var) duoc chap nhan mo mock API | **SUA**: env var `NEON_ALLOW_MOCK_API` KHONG con duoc chap nhan. Chi `-TestMode` switch moi mo mock (env var co the bi set tu session truoc va quen xoa). |
| Test scenarios | 5/5 PASS (pass-hrp-live, pass-hrp-mp2, refuse-empty, wrong-branch, mock-without-testmode) | **6/6 PASS**: them `test-hrp-live-url-only` (chi co `HRP_LIVE_URL_*` set -> gate refuse 10 vi khong co fallback). Case `test-pass-hrp-live` doi expected exit tu 0 -> 19 (TEST_PASS). Summary `gate-prod-test-summary.json` cap nhat. |
| §3.3 verify sau deploy | "Chay Query B o §5.2 de verify `_prisma_migrations`" (sai -- §5.2 la preflight query, khong phai post-deploy verify) | **SUA**: tro ve §5.3 (post-deploy verify query, xac nhan N1 da apply va dung schema). Them ghi chu rang §5.2 chi co y nghia PRE-DEPLOY (do N1 chua apply); POST-DEPLOY phai dung §5.3. Them buoc "GIAM SAT live traffic 5-10 phut sau apply" (Tier 0 lam thu cong; Tier 1 khong co quyen truy cap live log). |
