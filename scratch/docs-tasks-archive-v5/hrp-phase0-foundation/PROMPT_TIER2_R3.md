# PROMPT TIER 2 — Executor · Task `hrp-phase0-foundation` · **Round 3**

> Tier 1 (Planner) giao việc cho Tier 2 (Executor — sub-agent riêng) · Ngày: 16/08/2026
> Căn cứ: `PLANNER-DECISION-hrp-phase0-foundation.md` §6 (Resolution Round 2) — **DEC-31**: drift recovery g0_baseline + canonical hóa index lookup.
> Round 2 của bạn: AC-06 PASS, AC-09 PASS; AC-03 BLOCKED vì P3018 (`portal_timesheets` đã tồn tại trên DB). Planner đã khảo sát read-only: bảng khớp đủ 13 cột schema; DB chỉ dư index `idx_timesheets_lookup` trên `(employee_code, project, period_month, period_year)` — chính là key upsert R-21 của appBCC → **giữ, không drop**.
> Bạn chỉ làm **đúng 4 việc** dưới đây. Không làm gì khác.

---

## 0. Vai trò

Tier 2 — Executor, round 3: thực hiện DEC-31 để đóng AC-03.

## 1. Ràng buộc an toàn TUYỆT ĐỐI (lặp lại — vi phạm = FAIL)

1. **CẤM** chạy bất kỳ lệnh prisma nào trỏ vào `DATABASE_URL` (Neon **main** chứa dữ liệu thật). Mọi lệnh chỉ chạy với `DATABASE_URL` = giá trị của `DATABASE_URL_DEV`.
2. **CẤM** in/ghi giá trị connection string ra màn hình, HANDOFF.md, commit. Chỉ dùng để set biến môi trường trong phiên chạy.
3. **CẤM** sửa `.env`, **CẤM** commit `.env`.
4. **CẤM** mọi DDL destructive (drop/rename/truncate) trên bất kỳ DB nào — kể cả DROP INDEX.
5. **CẤM** sửa bất kỳ file code nào khác ngoài 3 file liệt kê ở §2. Không đụng `appBCC/` (đặc biệt `appBCC/agent_mapper.py` + `appBCC/app.py` đang modified), không đụng `app/`, `src/`, `packages/`.
6. **CẤM** `git add -A` / `git add .` — chỉ add đúng 3 file ở §4.
7. Không tự ý đổi cột/field của model `PortalTimesheet` — chỉ THÊM khai báo index như §2.

## 2. Việc 1 — Sửa `prisma/schema.prisma` (canonical hóa index lookup)

- Mở model `PortalTimesheet` trong `prisma/schema.prisma`, thêm đúng 1 dòng `@@index` (đặt sau khai báo `@@index([employee_code])` nếu có):

```prisma
  @@index([employee_code, project, period_month, period_year], name: "idx_timesheets_lookup")
```

- **Không** đổi bất kỳ field/cột nào khác. Chạy `npx prisma validate` (exit 0) + `npx prisma format` nếu cần.

## 3. Việc 2 — Sửa `prisma/migrations/20260816010542_g0_baseline/migration.sql`

Migration này **chưa applied ở bất kỳ DB nào** (dev fail, production chưa chạy) → được phép sửa nội dung (Planner đã quyết DEC-31):

1. `CREATE TABLE "portal_timesheets"` → `CREATE TABLE IF NOT EXISTS "portal_timesheets"`
2. `CREATE INDEX "portal_timesheets_employee_code_idx"` → `CREATE INDEX IF NOT EXISTS "portal_timesheets_employee_code_idx"`
3. Thêm dòng CUỐI file:

```sql
CREATE INDEX IF NOT EXISTS "idx_timesheets_lookup" ON "portal_timesheets"("employee_code", "project", "period_month", "period_year");
```

4. Cập nhật comment đầu file cho đúng: IF NOT EXISTS để tương thích drift state thật (bảng đã tồn tại ngoài migration history).

## 4. Việc 3 — Verify trên Neon dev branch (đóng AC-03)

```bash
set -a; . ./.env; set +a
DATABASE_URL="$DATABASE_URL_DEV" npx prisma migrate deploy
```

- Expect: `g0_baseline` applied, exit 0, không lỗi.

```bash
DATABASE_URL="$DATABASE_URL_DEV" npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
```

- Expect: **output RỖNG hoàn toàn (0 dòng)** = dev DB khớp schema canonical. 
- Nếu output còn dòng gì đó: **dừng ngay**, ghi nguyên output (bỏ phần có URL/password) vào HANDOFF §5, báo Tier 1 — không tự xử.

```bash
DATABASE_URL="$DATABASE_URL_DEV" npx prisma db seed
```

- Seed 1 lần confirm vẫn exit 0 (AC-06 giữ PASS).

## 5. Việc 4 — Cập nhật HANDOFF.md + commit (1 commit duy nhất)

- Sửa `docs/tasks/hrp-phase0-foundation/HANDOFF.md`:
  - BLK-01 → **RESOLVED**; BLK-04 → **RESOLVED** (evidence: migrate deploy exit 0 + diff 0 dòng trên dev branch).
  - AC-03 → **PASS** (upgrade path từ state thật + 2 migration cũ; IF NOT EXISTS đảm bảo chạy được cả trên DB sạch).
- Commit đúng 3 file: `prisma/schema.prisma`, `prisma/migrations/20260816010542_g0_baseline/migration.sql`, `docs/tasks/hrp-phase0-foundation/HANDOFF.md`:
  - Message: `fix(db): g0_baseline IF NOT EXISTS + khai bao idx_timesheets_lookup (DEC-31) - AC-03 PASS tren Neon dev branch`
- Push `origin main` (fetch trước; nếu origin đã di chuyển và rebase vướng unstaged changes của founder → ghi BLK, báo Tier 1, không stash/đụng file founder).

## 6. Báo cáo cuối cho Tier 1

Tóm tắt: (1) migrate deploy result, (2) diff result (đúng 0 dòng hay không), (3) seed result, (4) commit hash, (5) mọi BLK còn lại. **Không kèm giá trị URL/password trong bất kỳ output nào.**

## 7. Quy tắc làm việc

- Không sửa TASK.md, không sửa PROMPT này, không sửa PLANNER-DECISION.
- Bị chặn bởi thứ ngoài tầm → ghi BLK vào HANDOFF §5, dừng, báo Tier 1 — không tự quyết.
