# PROMPT TIER 2 — Executor · Task `hrp-phase0-foundation` · **Round 2**

> Tier 1 (Planner) giao việc cho Tier 2 (Executor — sub-agent riêng) · Ngày: 16/08/2026
> Căn cứ: `PLANNER-DECISION-hrp-phase0-foundation.md` §4 (Round 1 resolution) — **2 GATE founder đã xong**: GATE-1 contract FREEZE, GATE-2 Neon dev branch + `DATABASE_URL_DEV` đã có trong `.env`.
> Bạn chỉ làm **đúng 2 việc** dưới đây. Không làm gì khác.

---

## 0. Vai trò

Bạn là Tier 2 — Executor, round 2 của Phase 0 Foundation. Round 1 bạn đã xong 7 STEP; Tier 3 audit = CONDITIONAL; Planner đã xử (xem PLANNER-DECISION). Round này chỉ còn **đóng 2 AC bị chặn bởi env**: AC-03 (migrate verify) + AC-06 (seed idempotent runtime).

## 1. Ràng buộc an toàn TUYỆT ĐỐI (lặp lại — vi phạm = FAIL)

1. **CẤM** chạy bất kỳ lệnh prisma nào trỏ vào `DATABASE_URL` (Neon **main** chứa dữ liệu thật). Mọi lệnh hôm nay chỉ chạy với `DATABASE_URL` = giá trị của `DATABASE_URL_DEV`.
2. **CẤM** in/ghi giá trị connection string ra màn hình, vào HANDOFF.md, vào commit. Chỉ dùng nó để set biến môi trường trong phiên chạy.
3. **CẤM** sửa `.env`, **CẤM** commit `.env` (đã gitignored — đừng `git add -f`).
4. **CẤM** mọi DDL destructive (drop/rename/truncate) trên bất kỳ DB nào.
5. **CẤM** sửa bất kỳ file code nào (app/, src/, packages/, prisma/schema.prisma, appBCC/). Round này **không đổi code**.
6. **CẤM** `git add -A` / `git add .` — chỉ add đúng `HANDOFF.md` khi kết thúc.
7. Không đụng 2 file `appBCC/agent_mapper.py` + `appBCC/app.py` đang modified (founder đang sửa song song).

## 2. Việc 1 — Migrate verify trên Neon dev branch (đóng AC-03)

```bash
# Windows Git Bash — load env + chay migrate deploy len DEV branch
set -a; . ./.env; set +a
DATABASE_URL="$DATABASE_URL_DEV" npx prisma migrate deploy
```

- Expect: 3 migration được apply (2 cũ + `g0_baseline`) hoặc báo "already applied" nếu đã chạy. **Không lỗi = AC-03 PASS.**
- Kiểm tra nhanh: `DATABASE_URL="$DATABASE_URL_DEV" npx prisma validate` vẫn pass.
- Nếu lỗi kết nối (P1012/P1017/sslmode/ECONNREFUSED): **đừng sửa .env, đừng mò** — ghi nguyên lỗi (bỏ phần có chứa password/URL) vào HANDOFF §5 và báo Tier 1.
- Nếu lỗi "table already exists": ghi lỗi + gõ `DATABASE_URL="$DATABASE_URL_DEV" npx prisma migrate status` lấy output, ghi vào HANDOFF §5 (không kèm giá trị URL), báo Tier 1.

## 3. Việc 2 — Seed idempotent 2 lần (đóng AC-06)

```bash
DATABASE_URL="$DATABASE_URL_DEV" npx prisma db seed
DATABASE_URL="$DATABASE_URL_DEV" npx prisma db seed
```

- Lần 2 phải **chạy lại không lỗi** (idempotent — upsert). Ghi vào HANDOFF: exit code 2 lần + (nếu có) số row output — không ghi dữ liệu row.
- Nếu seed lỗi lần 2 → FAIL, ghi lỗi vào HANDOFF §5.

## 4. Cập nhật HANDOFF.md + commit (1 commit duy nhất)

- Sửa `docs/tasks/hrp-phase0-foundation/HANDOFF.md`:
  - §BLK: đánh dấu BLK-01 (thiếu dev DB) **RESOLVED** — evidence: `prisma migrate deploy` exit 0 trên Neon dev branch + 3 migration applied; seed 2 lần exit 0.
  - Cập nhật status AC-03 → PASS (dev branch), AC-06 → PASS (runtime seed 2 lần). AC-09 → PASS (contract FREEZE 16/08/2026, commit riêng của Planner).
- Commit: `docs(handoff): round 2 - migrate deploy + seed idempotent tren Neon dev branch (AC-03, AC-06 PASS)` — chỉ add đúng `docs/tasks/hrp-phase0-foundation/HANDOFF.md`.
- Push lên `origin main` (trước push: `git pull --rebase` — nếu conflict ở appBCC/ thì dừng, báo Tier 1).

## 5. Báo cáo cuối cho Tier 1

Tóm tắt: (1) migrate deploy result + số migration, (2) seed 2 lần result, (3) commit hash, (4) mọi điểm còn BLK. **Không kèm giá trị URL/password trong bất kỳ output nào.**

## 6. Quy tắc làm việc

- Không sửa TASK.md, không sửa PROMPT này, không sửa PLANNER-DECISION.
- Nếu bất kỳ bước nào bị chặn bởi thứ ngoài tầm → ghi BLK vào HANDOFF §5, dừng, báo Tier 1 — không tự quyết.
