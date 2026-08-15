# PROMPT TIER 2 — Executor · Task `hrp-phase0-foundation` · **Round 4**

> Tier 1 (Planner) giao việc cho Tier 2 (Executor — sub-agent riêng) · Ngày: 16/08/2026
> Căn cứ: `PLANNER-DECISION-hrp-phase0-foundation.md` §7 (Resolution Round 3) — Planner chọn **phương án (A)**: `resolve --rolled-back` + deploy lại.
> Round 3 của bạn: schema + migration đã sửa xong (commit `552b623`), diff dev vs schema = 0 DDL. Chỉ còn gỡ failed record P3009 để chạy lại deploy.
> Bạn chỉ làm **đúng 3 việc** dưới đây. Không làm gì khác.

---

## 0. Vai trò

Tier 2 — Executor, round 4: gỡ P3009 + đóng AC-03.

## 1. Ràng buộc an toàn TUYỆT ĐỐI (lặp lại — vi phạm = FAIL)

1. **CẤM** chạy bất kỳ lệnh prisma nào trỏ vào `DATABASE_URL` (Neon **main** chứa dữ liệu thật). Mọi lệnh chỉ chạy với `DATABASE_URL` = giá trị của `DATABASE_URL_DEV`.
2. **CẤM** in/ghi giá trị connection string ra màn hình, HANDOFF.md, commit.
3. **CẤM** sửa `.env`, **CẤM** commit `.env`.
4. **CẤM** mọi DDL destructive trên bất kỳ DB nào.
5. **CẤM** sửa bất kỳ file code nào. Round này chỉ sửa `HANDOFF.md`.
6. **CẤM** `git add -A` / `git add .` — chỉ add đúng `HANDOFF.md`.
7. Không đụng `appBCC/agent_mapper.py` + `appBCC/app.py` (đang modified của founder).

## 2. Việc 1 — Gỡ failed record + deploy lại (đóng AC-03)

```bash
set -a; . ./.env; set +a
DATABASE_URL="$DATABASE_URL_DEV" npx prisma migrate resolve --rolled-back 20260816010542_g0_baseline
DATABASE_URL="$DATABASE_URL_DEV" npx prisma migrate deploy
```

- Expect: resolve exit 0 (xóa failed record); deploy exit 0, `g0_baseline` **applied** (chạy no-op vì mọi object đã tồn tại + `IF NOT EXISTS`).
- Verify lần cuối: `DATABASE_URL="$DATABASE_URL_DEV" npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script` → expect **0 dòng DDL** (chỉ header "empty migration" chuẩn).
- Nếu bất kỳ lệnh nào exit khác 0 → **dừng ngay**, ghi lỗi (bỏ phần URL/password) vào HANDOFF §5, báo Tier 1 — không tự xử.

## 3. Việc 2 — Seed confirm + cập nhật HANDOFF.md

```bash
DATABASE_URL="$DATABASE_URL_DEV" npx prisma db seed
```

- Expect exit 0 (AC-06 giữ PASS).
- Sửa `docs/tasks/hrp-phase0-foundation/HANDOFF.md`:
  - **AC-03 → PASS** (evidence: resolve --rolled-back + deploy exit 0, 3/3 migration applied trên Neon dev branch; diff = 0 DDL).
  - BLK-01 → **RESOLVED**; BLK-04 → **RESOLVED** (evidence round 4).
  - Ghi rõ trong HANDOFF: phương án (A) do Planner quyết (PLANNER-DECISION §7), không phải Tier 2 tự quyết.

## 4. Việc 3 — Commit (1 commit duy nhất)

- Commit đúng 1 file `docs/tasks/hrp-phase0-foundation/HANDOFF.md`:
  - Message: `docs(handoff): round 4 - resolve --rolled-back g0_baseline + deploy PASS tren Neon dev (AC-03 PASS, dong Phase 0)`
- Push `origin main` (fetch trước; nếu origin đã di chuyển và rebase vướng unstaged changes của founder → ghi BLK, báo Tier 1, không stash/đụng file founder).

## 5. Báo cáo cuối cho Tier 1

Tóm tắt: (1) resolve + deploy result (số migration applied), (2) diff result (0 dòng hay không), (3) seed result, (4) commit hash, (5) mọi BLK còn lại. **Không kèm giá trị URL/password trong bất kỳ output nào.**

## 6. Quy tắc làm việc

- Không sửa TASK.md, không sửa PROMPT này, không sửa PLANNER-DECISION.
- Bị chặn bởi thứ ngoài tầm → ghi BLK vào HANDOFF §5, dừng, báo Tier 1 — không tự quyết.
