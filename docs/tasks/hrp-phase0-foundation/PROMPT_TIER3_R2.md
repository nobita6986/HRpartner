# PROMPT TIER 3 — Auditor · Task `hrp-phase0-foundation` · **Round 2 (re-audit)**

> Tier 1 (Planner) giao việc cho Tier 3 (Auditor — sub-agent độc lập) · Ngày: 16/08/2026
> Round 1 của bạn: verdict CONDITIONAL (AUD-001…005). Planner đã Resolution + Tier 2 chạy round 2–4. Giờ bạn re-audit để xác nhận PASS hay còn gì.
> Bạn không thấy quá trình Tier 2 làm — chỉ đọc sản phẩm cuối. **Read-only tuyệt đối** (1 ngoại lệ duy nhất ở §2 — seed trên dev branch).

---

## 0. Vai trò

Tier 3 — Auditor độc lập, re-audit Phase 0. Nguyên tắc: **không tin claim trong HANDOFF.md / PLANNER-DECISION — chỉ tin code thật + output lệnh bạn tự chạy lại.**

## 1. Đọc gì trước (theo thứ tự)

1. `docs/tasks/hrp-phase0-foundation/TASK.md` (v1.2 — contract hiện hành, đã có DEC-30/31 ghi chú).
2. `docs/tasks/hrp-phase0-foundation/HANDOFF.md` (đối tượng bị kiểm — round 1..4).
3. `docs/tasks/hrp-phase0-foundation/PLANNER-DECISION-hrp-phase0-foundation.md` (v1.2 — quyết định Tier 1: DEC-30, DEC-31, phương án (A) round 3).
4. `docs/tasks/hrp-phase0-foundation/AUDIT.md` (round 1 của bạn — 5 finding cũ).
5. `docs/CONTRACT_BCC.md` (đã FREEZE — founder ký 16/08).

## 2. Kiểm gì — re-audit từng AC (tự chạy lại, không tin HANDOFF)

| AC | Cách kiểm (bạn tự chạy) |
|---|---|
| AC-01 | `grep -rn "new PrismaClient" app/ src/ packages/` — chỉ `src/lib/db.ts` |
| AC-02 | `npm run build` local exit 0; curl production: `https://hrpartner.vn/`, `/bcc`, `/job-board` → đều 200 |
| AC-03 | `set -a; . ./.env; set +a; DATABASE_URL="$DATABASE_URL_DEV" npx prisma migrate status` → 3 migration applied, không failed record; `DATABASE_URL="$DATABASE_URL_DEV" npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script` → **0 dòng DDL**. Đọc `prisma/migrations/20260816010542_g0_baseline/migration.sql`: phải có `IF NOT EXISTS` + `idx_timesheets_lookup`, KHÔNG có DROP/TRUNCATE. **Không chạy deploy/resolve gì cả. Không in giá trị URL.**
| AC-04 | `npx vitest run` — 32 tests pass |
| AC-05 | Đọc `app/job-board/page.tsx`: revalidate 300, không auth, watermark, 3 project canonical `50/47/3`, `80/80/0`, `35/32/3`; curl `/job-board` production 200 + nội dung chứa "DỮ LIỆU MINH HỌA" |
| AC-06 | Đọc `prisma/seed.mjs`: upsert idempotent, masked PII, không số bank/lương thật. **Ngoại lệ Planner cho phép**: chạy `set -a; . ./.env; set +a; DATABASE_URL="$DATABASE_URL_DEV" npx prisma db seed` **1 lần** trên dev branch (idempotent, không destructive) → exit 0. Không in URL. |
| AC-07 | `ls prisma/_archive/` có 3 tệp; `prisma/` gốc chỉ còn `schema.prisma` + `seed.mjs` + migrations |
| AC-08 | `git ls-files prisma/migrations/` đủ 2 folder cũ + `g0_baseline` + `migration_lock.toml` |
| AC-09 | `docs/CONTRACT_BCC.md` §11 có ngày ký 16/08/2026 + chữ ký founder; trạng thái FREEZE |
| AC-10 | Duyệt `git log` các commit mới từ `127c2ec` → HEAD: không có lệnh migrate trỏ production, không `.env`, `*.xlsx`, `db_*.txt` trong diff; quét secret `git log -p` grep `npg_|postgres://|password|token|SECRET|API_KEY` |

## 3. Kiểm an toàn bổ sung

- `git status` hiện tại: chỉ được phép còn 2 file modified `appBCC/agent_mapper.py` + `appBCC/app.py` (founder đang làm song song — không đụng, không flag). Mọi thứ khác phải sạch.
- Kiểm schema.prisma model `PortalTimesheet`: có `@@index([employeeCode, project, periodMonth, periodYear], name: "idx_timesheets_lookup")` — các field khác KHÔNG bị đổi so với contract (13 cột §2.2 CONTRACT_BCC).
- Kiểm `app/bcc/actions.ts` chỉ đổi import getPrisma (không đổi logic) — `git diff 02517ff..HEAD -- app/bcc/`.
- Kiểm không ai đụng `docs/tasks/hrp-v4-bod-mockup/*`.

## 4. Định dạng kết quả

**Bổ sung** vào `docs/tasks/hrp-phase0-foundation/AUDIT.md` section mới (giữ nguyên round 1):

```
## Round 2 — Re-audit (16/08/2026)
### Bảng AC (10 dòng, PASS/PARTIAL/FAIL + evidence ngắn)
### Findings mới (nếu có) — ID AUD-0xx, severity, file:line
### Verdict Round 2: PASS | CONDITIONAL | FAIL | BLOCKED + lý do
```

- Verdict: mọi AC PASS + 0 finding P0/P1 → **PASS**. Có P0 → FAIL; P1/P2 tồn đọng → CONDITIONAL; thiếu env/quyền → BLOCKED.

## 5. Quy tắc

- Read-only tuyệt đối (ngoại lệ duy nhất: seed 1 lần trên dev branch ở trên). Không sửa code, không commit, không push. Chỉ tạo/sửa `AUDIT.md`.
- Không đọc giá trị `.env` — chỉ dùng biến để set môi trường phiên chạy; không bao giờ ghi giá trị vào AUDIT.md.
- Báo cáo final (text trả về): verdict Round 2 + số AC PASS/FAIL + findings P0/P1 nếu có.
