# TASK — HRP Phase 0 Foundation (`hrp-phase0-foundation`)

> Pipeline 3-tier: `TASK.md` (Tier 1 — Planner) → `HANDOFF.md` (Tier 2 — Executor) → `AUDIT.md` (Tier 3 — Auditor)
> Spec version: `v1.0` · Ngày khởi tạo: **16/08/2026**
> Status: `PASS` — Tier 3 re-audit Round 2 (16/08): **10/10 AC PASS, 0 P0/P1** (AUDIT.md Round 2). Còn 1 exit gate cuối: **sếp duyệt demo** https://hrpartner.vn/job-board (DoD §8). AUD-006/007 (P3) + DEV-01…04 → backlog Phase 4.
> Căn cứ: **D13** (backbone invariant-phase + monorepo Phương án A), **D14** (freeze Mockup Baseline = trigger Phase 0; founder cho khởi động sớm 16/08 song song dry-run mockup), `docs/PHASE_KHOAHOC_V1.md` §4, `docs/MODULE_TACH_V2.md` §VII W1 + 5 điều chỉnh kỹ thuật đã duyệt 16/08/2026.

---

## 1. Mục tiêu & Non-goal

**Mục tiêu** (PHASE_KHOAHOC §4 — Phase 0): build chạy, DB + schema khớp, mọi mutation gọi qua 1 singleton, 3 sub-package "rủi ro thấp" tách xong, job-board public demo được, contract appBCC ↔ web đóng băng.

**Non-goal** (KHÔNG làm trong Phase 0):

- KHÔNG auth/JWT, KHÔNG rào /bcc (thuộc Phase 1 — D15; rủi ro tạm chấp nhận tới tuần đầu Phase 1)
- KHÔNG RLS / field masking (Phase 2)
- KHÔNG audit/outbox/idempotency (Phase 3)
- KHÔNG UI nghiệp vụ mới ngoài job-board
- KHÔNG đụng mockup frames, KHÔNG thay đổi contract task `hrp-v4-bod-mockup`
- KHÔNG microservice (hard rule D13)

## 2. Quyết định đã chốt áp dụng

| ID | Nội dung | Nguồn |
|---|---|---|
| D13 | Backbone invariant-phase; tách theo Phương án A vertical-slice monorepo, 3 sub-package đầu: `@hrp/money`, `@hrp/payroll-core`, `@hrp/job-board` | DECISION_LOG 0.2 |
| D14 | Freeze Mockup Baseline = trigger Phase 0; founder cho khởi động sớm 16/08 — chạy song song với dry-run mockup, **freeze vẫn là exit gate của task mockup** | DECISION_LOG 0.2 + lệnh founder 16/08 |
| D15 | Rào /bcc JWT tuần đầu Phase 1 — Phase 0 KHÔNG làm nhưng không được tạo thêm endpoint no-auth mới ngoài job-board | DECISION_LOG 0.2 |
| D16 | Hạ tầng chốt trước Phase 4 — Phase 0 chỉ ghi nhận, không phụ thuộc | DECISION_LOG 0.2 |
| DEC-30 | Monorepo hiện thực bằng **tsconfig paths** (không npm workspaces) — build local + Vercel xanh 16/08; bổ sung workspaces khi package đầu tiên cần cài dependency riêng | PLANNER-DECISION Round 1 (AUD-001) |
| — | ~~Workspaces `packages/*`~~ — thay bằng paths-based (DEC-30); `vercel.json` giữ nguyên | Điều chỉnh kỹ thuật D13–D16 + DEC-30 |
| — | `prisma/migrations/` đưa vào git trong Phase 0 (hiện untracked) | Điều chỉnh kỹ thuật D13–D16 |
| — | Đóng băng contract bảng appBCC ↔ web (R-21) | Điều chỉnh kỹ thuật D13–D16 |

## 3. Hiện trạng đã xác minh (16/08/2026)

- **7 chỗ** `new PrismaClient()`: `app/api/tickets/route.ts:19`, `[id]/route.ts:12`, `[id]/approve:21`, `[id]/cancel:12`, `[id]/pay:18`, `[id]/reject:16`, `app/bcc/actions.ts:5` — cần quy về singleton.
- `calculateVietnameseTaxes` + `payrollConfigRepo` **không có consumer ngoài** `src/domains/payroll/` — tách an toàn.
- `package.json` chưa có `workspaces`, chưa có package `@hrp/*`.
- `prisma/migrations/`: `20260815013341_init` + `20260815084134_g22_security` + `migration_lock.toml` — **untracked, chưa commit**.
- Schema 38 model; migration `init` chỉ tạo subset — nhiều model V4 chưa có DDL (Migration gap — cần xử lý STEP-03).
- `vercel.json`: framework nextjs, buildCommand `node scripts/copy-static.mjs && npx prisma generate && next build`.
- Neon production main đang chứa **dữ liệu thật** (appBCC bơm vào) — cấm mọi migrate destructive.
- `app/bcc/` là khu vực founder đang phát triển liên tục — Tier 2 chỉ refactor cơ học, không đụng logic.

## 4. Scope — STEP

| STEP | Nội dung | Output |
|---|---|---|
| STEP-01 | Tạo `src/lib/db.ts` singleton Prisma (global caching theo pattern chuẩn Next.js) + refactor 7 chỗ `new PrismaClient()` qua `getPrisma()` | 7 file sửa; AC-01 |
| STEP-02 | Chuyển `schema-v3.1-patches.prisma` + `schema-m7-tickets.prisma` → `prisma/_archive/` | AC-07 |
| STEP-03 | Migration gap: đối chiếu 38 model vs DDL hiện có; tạo migration `g0_baseline` **add-only** (không drop/rename/truncate) cho phần thiếu; verify trên **Neon dev branch riêng** (không đụng production main); commit toàn bộ `prisma/migrations/` vào git | AC-03, AC-08, AC-10 |
| STEP-04 | Paths-based monorepo (DEC-30): tách `@hrp/money` (từ `src/shared/utils/money.ts`) + `@hrp/payroll-core` (từ `src/domains/payroll/*`); integrate bằng tsconfig paths — **không** dùng npm workspaces (đã chứng minh build local + Vercel xanh 16/08); test cũ pass | AC-02, AC-04 |
| STEP-05 | Tạo `@hrp/job-board` (read-only, ISR ~300s, không auth) + route `app/job-board/page.tsx` theo AC của `S05_JobBoard_Public_1440` (mockup STEP-09): header public, filter minh họa, 3 card project canonical (DA-2026-018 `50/47/3`, DA-2026-022 `80/80/0`, PRJ-SV-014 `35/32/3`), nút Ứng tuyển không flow (A-05 Wave 3), watermark DỮ LIỆU MINH HỌA, không PII | AC-05 |
| STEP-06 | `prisma/seed.ts`: fixtures 20 scenario từ `data-scope-security.md` — dùng canonical mock data, **không PII thật** (masked CCCD/SĐT, không bank, không lương trên card), idempotent (upsert) | AC-06 |
| STEP-07 | `docs/CONTRACT_BCC.md`: đóng băng contract bảng appBCC ↔ web (cột, format period `MM/YYYY`, trạng thái, quy tắc upsert versioned) — xử lý R-21; founder ký duyệt | AC-09 |
| STEP-08 | Demo A-04: deploy job-board lên Vercel + verify URL matrix (`/`, `/bcc`, `/job-board` — `/docs` không phải site, bỏ khỏi matrix 16/08) | AC-05, AC-02 |

## 5. Acceptance Criteria (AC)

| ID | Tiêu chí | Verify bằng |
|---|---|---|
| AC-01 | Toàn repo không còn `new PrismaClient()` ngoài `src/lib/db.ts` | `grep -rn "new PrismaClient" app/ src/` chỉ ra 1 file |
| AC-02 | `npm run build` exit 0 local + deploy Vercel thành công (paths-based monorepo — DEC-30) | build + URL |
| AC-03 | `prisma migrate dev` thành công trên **Neon dev branch sạch** + upgrade path từ 2 migration cũ | log migrate |
| AC-04 | `npx vitest run` pass (test ticket + payroll cũ không đỏ sau tách package) | vitest |
| AC-05 | `/job-board` public hiển thị 3 project canonical, ISR, không cần login, khớp S05 | mở URL public |
| AC-06 | `prisma db seed` chạy lại được không lỗi (idempotent), seed không chứa PII thật | 2 lần seed + review diff |
| AC-07 | 2 file patch nằm trong `prisma/_archive/`, `schema.prisma` là canonical duy nhất | ls |
| AC-08 | `prisma/migrations/` (2 folder + g0_baseline + migration_lock) được commit vào git | git ls-files |
| AC-09 | `docs/CONTRACT_BCC.md` tồn tại, ghi cột/format/trạng thái, founder ký duyệt | sếp duyệt |
| AC-10 | Không có destructive migration trên production Neon main; chỉ add-only sau khi verify dev branch | audit migration SQL |

## 6. Rủi ro (RISK)

| ID | Rủi ro | Giảm thiểu |
|---|---|---|
| RISK-01 | Neon production có dữ liệu thật — migrate destructive = mất data thật | CẤM tuyệt đối drop/rename/truncate; mọi DDL verify trên dev branch trước |
| RISK-02 | Workspaces làm vỡ Vercel build | Cập nhật `vercel.json` + test build local trước khi push; commit riêng từng bước để dễ revert |
| RISK-03 | Founder đang sửa `app/bcc/` song song — refactor actions.ts đụng code đang làm | Chỉ đổi 1 dòng import/khởi tạo, giữ nguyên logic; nếu xung đột → để lại cho sếp, ghi deviation |
| RISK-04 | Job-board cần bảng Project có DDL — nếu chưa có trong g0_baseline thì route chết runtime | STEP-03 phải xong trước STEP-05 |
| RISK-05 | Seed fixtures vô tình dùng dữ liệu gần giống người thật | Dùng đúng canonical (An Phát/Yên Phong/Sao Việt + tên minh họa đã có); review không PII trước commit |

## 7. Phân vai Tier 1–2–3

| Vai | Ai | Nhiệm vụ trong task này |
|---|---|---|
| **Tier 1 — Planner** | Claude chính (tôi) | Chốt contract TASK.md này; ra decisions (DEC-30+); duyệt HANDOFF của Tier 2; Planner Resolution cho mọi finding của Tier 3; cập nhật Revision Log |
| **Tier 2 — Executor** | **Sub-agent riêng** (lệnh founder 16/08: "Tier 2 là thằng khác") — nhận prompt tại `PROMPT_TIER2.md` | Thực thi STEP-01…08 đúng thứ tự; ghi HANDOFF.md (Execution Trace + evidence từng AC + deviation/BLK) theo template `.ai-pipeline/templates/HANDOFF.template.md` |
| **Tier 3 — Auditor** | Sub-agent độc lập (không thấy quá trình Tier 2 làm) | Đọc TASK.md + HANDOFF.md + **code thật trên repo**; viết AUDIT.md (findings `AUD-xxx`, verdict `PASS/CONDITIONAL/FAIL/BLOCKED`, severity P0–P3) |

**Quy trình**: Tier 1 viết TASK (xong) → founder duyệt → Tier 2 thực thi + HANDOFF → Tier 3 audit (background agent) → Tier 1 Planner Resolution → lặp tới PASS.

## 8. Definition of Done (Phase 0 — PHASE_KHOAHOC §4)

- [x] `npm run build` exit 0
- [x] `prisma migrate deploy` chạy trên Neon dev branch (upgrade path state thật + 3/3 migration; diff = 0 DDL)
- [x] 7 chỗ `new PrismaClient()` đã quy về `getPrisma()`
- [x] `vitest run` pass
- [x] 3 sub-package tách xong (`@hrp/money`, `@hrp/payroll-core`, `@hrp/job-board`)
- [ ] **Demo**: link public `app/job-board` lên Vercel — sếp duyệt

## 9. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-08-16` | Khởi tạo contract Phase 0 Foundation: 8 STEP, 10 AC, 5 RISK, phân vai 3-tier | Lệnh founder "vào Phase 0" + D13–D16 đã chốt |
| `v1.1` | `2026-08-16` | Planner Resolution Round 1: DEC-30 paths-based monorepo (STEP-04/AC-02); bỏ `/docs` khỏi URL matrix (STEP-08); Status → CONDITIONAL chờ 2 gate founder | AUDIT Round 1 CONDITIONAL → PLANNER-DECISION v1.0 |
| `v1.2` | `2026-08-16` | Resolution Round 2: DEC-31 drift recovery (g0_baseline IF NOT EXISTS + idx_timesheets_lookup vào schema); Status → ROUND_3 | Tier 2 round 2 (AC-03 BLOCKED P3018) → PLANNER-DECISION v1.1 |
| `v1.3` | `2026-08-16` | Tier 3 re-audit Round 2: **PASS 10/10 AC, 0 P0/P1**; DoD kỹ thuật hoàn thành; Status → PASS chờ sếp duyệt demo | AUDIT.md Round 2 → PLANNER-DECISION v1.3 |
