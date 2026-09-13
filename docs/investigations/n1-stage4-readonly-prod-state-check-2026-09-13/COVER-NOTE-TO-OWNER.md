# T1 -> Owner: Cover note cho Stage 4 dossier (rev sau khi sua 5 chi thi)

**Date:** 2026-09-13 21:00 (UTC+7)
**From:** Tier 1 - Agent
**To:** Owner
**Subject:** Sua dossier Stage 4 theo 5 chi thi cua anh (20:14) + gate production da kiem thu

---

Anh,

Em (Tier 1) da sua dossier theo dung 5 chi thi cua anh luc 20:14, viet gate production rieng cho `hrp-live`, kiem thu 3 scenario, va day tat ca evidence. Ban sua o file:

**`docs/investigations/n1-stage4-readonly-prod-state-check-2026-09-13/DOSSIER.md`** (da overwrite file cu, em xoa ban `DOSSIER-v2-pre-approval.md` de tranh nham).

---

## Tom tat 5 sua doi

### 1. §3.2 timeout - Bo menu 3 cach chua kiem thu

Dossier truoc de xuat 3 cach dat `lock_timeout` cho Prisma (`default_transaction_lock_timeout`, bien env, `PGOPTIONS`). Em da **BO** menu nay vi Tier 1 khong khang dinh Prisma ton trong cac co nay khi chua kiem thu tren duong ket noi that.

Thay bang: **neu can timeout, Tier 1 de xuat mot cach da kiem thu tren test branch truoc khi dua vao runbook**. Hien chua co cach nao duoc Tier 1 verify. Tier 0 quyet: (a) chay khong timeout, hoac (b) Tier 0 tu kiem thu 1 cach + push evidence.

### 2. Gate production da viet + kiem thu 3/3 PASS

Tier 1 da viet `neon_branch_gate_prod.ps1` (counterpart cua `neon_branch_gate.ps1` test):

- **Gate script:** `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/neon_branch_gate_prod.ps1`
- **Fake Neon API stub:** `evidence/stage4-preflight/fake_neon_api.js` (Node.js, 3 scenarios)
- **Test harness:** `evidence/stage4-preflight/test-neon-branch-gate-prod.ps1`
- **Summary:** `evidence/stage4-preflight/gate-prod-test-summary.json`

**Khac biet gate prod vs gate test:**

| Dac diem | Test gate (`neon_branch_gate.ps1`) | Prod gate (`neon_branch_gate_prod.ps1`) |
|---|---|---|
| `NEON_EXPECTED_BRANCH_NAME` default | `hrp_mp2_test` | `hrp-live` |
| Branch name check | Case-insensitive `.ToLower()` | Case-sensitive `-ceq` |
| Primary branch | **Tu choi** (exit `14`) -- test branch phai non-primary | **Chap nhan** -- `hrp-live` co the la primary |
| Env vars | `TEST_DATABASE_URL_ADMIN/WRITER` | `HRP_LIVE_URL_ADMIN/WRITER` |

**Exit codes gate prod:**

| Code | Y nghia |
|---|---|
| 0 | PASS |
| 10 | credentials missing |
| 11 | HTTP error Neon API |
| 12 | endpoint-id khong co trong bat ky branch nao |
| 13 | admin + writer endpoints map ve 2 branch khac nhau |
| 16 | branch name != "hrp-live" (case-sensitive) |

**Test results (3/3 PASS, timestamp 2026-09-13T20:55:21+07:00):**

| Scenario | Input | Expected | Actual |
|---|---|---|---|
| `pass` | URLs map ve `hrp-live` (primary) | 0 | 0 PASS |
| `refuse-name` | URLs map ve `hrp_mp2_test` | 16 | 16 PASS |
| `refuse-empty` | URL map ve endpoint-id khong ton tai | 12 | 12 PASS |

**Sua theo chi thi anh:**
- Dong "branch non-primary fail-closed" trong §3.3 da bo.
- Exit code primary gate test = **14** (khong phai 13) -- em da verify trong script goc.

### 3. §5.2 enum check - Sua `to_regclass` -> `to_regtype`

Enum `PlacementCaseStatus` la **TYPE**, khong phai relation. PG phan biet:

```sql
-- Sai (enum khong phai relation)
SELECT to_regclass('public."PlacementCaseStatus"');

-- Dung
SELECT to_regtype('public."PlacementCaseStatus"');
```

Bo sung verify policy trong §5.3 -- khong chi `polname` + `polcmd` ma con:
- `polroles` (qua `string_agg(r.rolname)` tu `pg_roles`) -- verify roles ap dung policy
- `using_expression` (qua `pg_get_expr(polqual, polrelid)`) -- verify USING
- `with_check_expression` (qua `pg_get_expr(polwithcheck, polrelid)`) -- verify WITH CHECK

### 4. §6 dung & chan doan - Bo danh sach recovery R-A..R-E

Dossier truoc liet ke 5 phuong an recovery (R-A tiep tuc manual, R-B `migrate resolve --rolled-back`, R-C `migrate resolve --applied`, R-D forward-only fix migration, R-E dung vinh vien). Em da **BO** danh sach nay.

Ly do: migration cu co the dang failed o trang thai khong xac dinh; khong phuong an nao mac dinh an toan. Tier 1 khong de xuat "sua migration da commit" hoac "them migration moi" khi chua biet trang thai DB that.

**Quy trinh moi:**
- **STOP** ngay khi `prisma migrate deploy` exit non-zero.
- Thu thap evidence (artifact file + READ ONLY queries).
- Bao cao Owner/Tier 0 -- Tier 0/Owner **quyet dinh rieng theo trang thai thuc**.
- Tham khao duy nhat: [Prisma migrate - troubleshooting failed migration](https://www.prisma.io/docs/orm/prisma-migrate/workflows/troubleshooting).

§6.4 cam them 1 dong: "Sua file SQL cua 2 migration da commit" (Prisma dung checksum; sua se fail `migrate deploy` lan sau).

### 5. Sua git state + FK lock note

**§8.2 sua:** `git log origin/main` HEAD = `fee3f9f` (sai -- day la local HEAD, ahead origin). Sua thanh:

> Local `HEAD = fee3f9f` (rev 2.32 dossier Stage 4 cua T1); **local AHEAD origin/main 1 commit** (`origin/main` HEAD = `233fab1`, Tier 0 commit 19:54). Tier 0 fetch + merge truoc khi apply Stage 4.

**§2.2 sua FK lock note:** Truoc em ghi `ADD CONSTRAINT FK` lay SHARE o bang tham chieu. Theo PG ALTER TABLE reference, thuc te lay **SHARE ROW EXCLUSIVE** tren **CA HAI** bang (referencing + referenced). Em da sua bang lock semantics:

| Thao tac | Lock tren bang bi cham | Lock tren bang tham chieu |
|---|---|---|
| `ADD CONSTRAINT FK` (Prisma default, khong NOT VALID) | SHARE ROW EXCLUSIVE | **SHARE ROW EXCLUSIVE** (khong phai SHARE) |

---

## SUA LAN 2 -- 3 diem theo chi thi Owner 21:25 (chua commit)

### A. Gate prod doc env vars khop prisma/schema.prisma

Dossier/gate truoc doc `HRP_LIVE_URL_ADMIN/WRITER`. **Sai**: `prisma/schema.prisma` dung `DATABASE_URL` (writer -- Prisma migrate deploy) + `DATABASE_URL_ADMIN` (directUrl). Hai cap co the tro ve 2 branch khac nhau ma gate van PASS, trong khi Tier 0 viet `prisma migrate deploy` chi target theo Prisma schema -> ghi vao branch khac.

**Sua**: gate prod doc `DATABASE_URL` + `DATABASE_URL_ADMIN` (khop Prisma). Tier 0 viet migration se dung cung env vars; khong the co tinh trang gate PASS nhung Prisma deploy vao branch khac.

### B. Gate prod chan bypass qua fake API

Dossier/gate truoc cho phep:
- `NEON_EXPECTED_BRANCH_NAME` override branch dich (co the doi sang `hrp_mp2_test` de fake PASS).
- `NEON_API_BASE` tro vao fake Neon API (co the dung local server tra PASS gia).

**Sua**:
- Branch name **hardcode** `hrp-live` trong script -- khong doc env.
- `NEON_API_BASE` chi duoc chap nhan khi co `-TestMode` switch HOAC `NEON_ALLOW_MOCK_API=1`. Production deploy khong co 2 cai nay, nen attempt bypass se exit 17 truoc khi goi API.

Test case moi: `mock-without-testmode` (gate refuse 17), `wrong-branch` (2 URL khac branch -> gate refuse 13 truoc khi goi API).

### C. §2.7 + §2.6 cam ket thoi gian sai

Dossier ghi "SHARE ROW EXCLUSIVE tren `labor_profiles` KHONG chan INSERT/UPDATE/DELETE". **Sai** theo PG conflict table (https://www.postgresql.org/docs/current/explicit-locking.html): SHARE ROW EXCLUSIVE conflict voi ROW EXCLUSIVE (lock cua INSERT/UPDATE/DELETE) -> SHARE ROW EXCLUSIVE **CHAN** INSERT/UPDATE/DELETE.

Cung sua: §2.5 + §2.6 co "<1ms", "<1 giay tren moi PG version" cho cac lenh tren `placement_case`. **BO cam ket** -- Tier 0 phai do.

### Test results 5/5 PASS (sau khi sua)

| Scenario | Input | Expected | Actual |
|---|---|---|---|
| `pass-hrp-live` | Ca 2 URL -> hrp-live | 0 | 0 PASS |
| `pass-hrp-mp2` | Ca 2 URL -> hrp_mp2_test (gate hardcode hrp-live -> refuse) | 16 | 16 PASS |
| `refuse-empty` | URL -> endpoint khong ton tai | 12 | 12 PASS |
| `wrong-branch` | Url1->hrp-live, Url2->hrp_mp2_test | 13 | 13 PASS |
| `mock-without-testmode` | NEON_API_BASE fake, khong co -TestMode | 17 | 17 PASS |

**Luu y quan trong (Tier 0 can doc ky)**: 5/5 PASS chi la proof-of-correctness cho code gate tren test harness offline. **KHONG PHAI preflight tren Neon that**. Tier 0 phai chay gate voi NEON_API_KEY that + NEON_PROJECT_ID that + DATABASE_URL that + DATABASE_URL_ADMIN that truoc khi apply migration.

---

## SUA LAN 3 -- theo chi thi Owner 21:44 (chua commit)

### A. Gate bo fallback `HRP_LIVE_URL_*` + bo tham so `-Url1`/`-Url2`

Gate round 2 van co fallback `HRP_LIVE_URL_*` (Tier 1 them de compat voi offline scripts) va parameters `-Url1`/`-Url2`. **Sai**: ca hai deu cho phep bypass env mismatch.

**Sua**: gate prod chi doc `DATABASE_URL_ADMIN` + `DATABASE_URL` tu env. KHONG co fallback. KHONG co parameters. Tier 0 PHAI migrate env vars sang `DATABASE_URL*` truoc khi chay gate (xem evidence `233fab1/baseline-readonly-20260913T121238Z.json` -- Tier 0 baseline script dung `HRP_LIVE_ADMIN_URL`, can doi sang `DATABASE_URL_ADMIN`).

### B. Tach tin hieu PASS khoi test logic

Gate round 2 khi chay `-TestMode` van emit `gate=PASS` + `exit 0`. **Sai**: deploy script co the interpret `exit 0` tu test mode nhu production PASS.

**Sua**: 
- Production preflight (khong `-TestMode`, khong `NEON_API_BASE`): PASS -> `exit 0` + `gate=PASS`.
- Test mode (co `-TestMode`): PASS logic nhung emit `exit 19` + `gate=TEST_PASS`. Deploy script PHAI check exit code va tu choi di tiep khi gap 19.
- `NEON_ALLOW_MOCK_API=1` (env var) cu~ KHONG con duoc chap nhan -- chi `-TestMode` switch moi mo mock (env var co the bi set tu session truoc va quen xoa).

### C. `directUrl` semantics (sua dossier)

Dossier round 2 ghi `directUrl` la Prisma shadow DB / introspection. **Sai** theo Prisma docs (https://www.prisma.io/docs/orm/overview/databases/postgresql): `directUrl` la URL ket noi truc tiep non-pooled ma Prisma CLI/migration su dung de apply DDL (pooled connection qua PgBouncer khong ho tro advisory lock + long-lived transaction can thiet cho migration DDL).

**Sua**: dossier ghi ro `prisma migrate deploy` se connect qua `DATABASE_URL_ADMIN` (directUrl), KHONG phai qua `DATABASE_URL` (pooled). Gate check CA HAI de phong hop Tier 0 sua schema de bo directUrl.

### D. §3.3 verify sau deploy tro sai section

Dossier §3.3 Buoc 4 ghi "Chay Query B o §5.2". **Sai**: §5.2 la preflight query (do N1 chua apply), §5.3 la post-deploy verify query.

**Sua**: §3.3 Buoc 4 tro ve §5.3. Them ghi chu Tier 0 phai GIAM SAT live traffic 5-10 phut sau apply (Tier 0 lam thu cong; Tier 1 khong co quyen truy cap live log).

### Test results 6/6 PASS (sau khi sua round 3)

| Scenario | TestMode | Expected | Actual |
|---|---|---|---|
| `test-pass-hrp-live` (URLs -> hrp-live, test mode) | co | 19 (TEST_PASS) | 19 PASS |
| `test-refuse-name` (URLs -> hrp_mp2_test) | co | 16 | 16 PASS |
| `test-refuse-empty` (endpoint khong ton tai) | co | 12 | 12 PASS |
| `test-wrong-branch` (Url1->hrp-live, Url2->hrp_mp2_test) | co | 13 | 13 PASS |
| `prod-mock-without-testmode` (fake API base, khong co -TestMode) | khong | 17 | 17 PASS |
| `test-hrp-live-url-only` (chi co `HRP_LIVE_URL_*`) | co | 10 (gate khong fallback) | 10 PASS |

**Luu yeu cau cho deploy script Tier 0**:
- Deploy script chi di tiep sang `prisma migrate deploy` khi `exit 0` (production PASS).
- `exit 19` (TEST_PASS) phai dung deploy -- chi la test PASS tren mock, KHONG phai production preflight that.
- `exit 10/11/12/13/16/17` la REFUSE, deploy script phai abort va bao loi.

**Tier 0 PHAI chay gate tren Neon that truoc khi apply migration** (khong co `-TestMode`, khong co `NEON_API_BASE`). 6/6 PASS chi la proof-of-correctness cho code gate tren test harness offline.

---

## Trang thai truoc commit

**CHUA commit gi** (anh bao "chua push dossier nhu mot runbook da duoc chap thuan"). Files dang o local:

- **Modified:** `docs/investigations/n1-stage4-readonly-prod-state-check-2026-09-13/DOSSIER.md` (overwrite ban cu)
- **Modified:** `docs/investigations/n1-stage4-readonly-prod-state-check-2026-09-13/COVER-NOTE-TO-OWNER.md`
- **Untracked:**
  - `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/neon_branch_gate_prod.ps1`
  - `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/fake_neon_api.js`
  - `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/test-neon-branch-gate-prod.ps1`
  - `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/gate-prod-test-summary.json`
  - `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/gate-pass.{stdout,stderr}.log` (test artifact)
  - `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/gate-refuse-name.{stdout,stderr}.log`
  - `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/gate-refuse-empty.{stdout,stderr}.log`
  - `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage4-preflight/fake-api-{pass,refuse-name,refuse-empty}.{stdout,stderr}.log`

Anh check `DOSSIER.md` (dac biet §2.2 FK lock + §3.2 timeout + §4.4 gate + §5.2 enum + §6 stop) va `gate-prod-test-summary.json`. Khi anh duyet:

1. Em commit dossier + cover note + gate files (`docs/investigations/...` + `docs/tasks/.../evidence/stage4-preflight/`).
2. Update PLANNER_HANDOVER.md rev 2.33 (ghi ro "sua theo 5 chi thi 13/09 20:14, gate production da kiem thu 3/3 PASS").
3. Push len origin/main.

Neu anh can sua tiep em san sang.

-- Tier 1 Agent, 13/09/2026 21:00 UTC+7
