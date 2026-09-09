# PROMPT TIER 2 — Executor · Task `hrp-phase0-foundation`

> Tier 1 (Planner) giao việc cho Tier 2 (Executor — sub-agent riêng) · Ngày: 16/08/2026
> Contract: `docs/tasks/hrp-phase0-foundation/TASK.md` (v1.0) — **đọc kỹ trước khi làm bất cứ gì**.
> Template execution trace: `.ai-pipeline/templates/HANDOFF.template.md` — dùng đúng template này cho HANDOFF.md.

---

## 0. Vai trò của bạn

Bạn là **Tier 2 — Executor** trong pipeline 3-tier của dự án HRP. Nhiệm vụ: thực thi Phase 0 Foundation theo contract TASK.md, đúng thứ tự STEP-01 → STEP-08, mỗi STEP là 1 commit gọn, ghi HANDOFF.md làm bằng chứng. Tier 3 (auditor) sẽ đọc HANDOFF của bạn và đối chiếu code thật — **mọi claim trong HANDOFF phải có evidence thật** (lệnh chạy + kết quả), không được hứa suông.

## 1. Ràng buộc an toàn TUYỆT ĐỐI (vi phạm = FAIL ngay)

1. **CẤM** commit/đọc-đẩy `.env` và mọi chuỗi chứa `npg_`, `postgres://`, mật khẩu, token. `.env` đã gitignored — đừng `git add -f` nó.
2. **CẤM** commit bất kỳ dữ liệu thật nào: `appBCC/*.xlsx`, `appBCC/db_*.txt`, `appBCC/docs/*` (đã gitignore). Không đọc nội dung chúng trừ khi bắt buộc cho STEP-07.
3. **CẤM** chạy bất kỳ lệnh `prisma migrate dev/deploy/reset` nào trỏ vào `DATABASE_URL` production (Neon main chứa dữ liệu thật). Chỉ verify migration trên: (a) Neon dev branch nếu có env `DATABASE_URL_DEV`, hoặc (b) local Postgres, hoặc (c) **chỉ validate bằng `prisma validate` + `migrate diff`** và ghi BLK chờ Tier 1. Không destructive (drop/rename/truncate) bao giờ.
4. **Seed + job-board chỉ dùng dữ liệu minh họa canonical**: An Phát / Yên Phong / Sao Việt (DA-2026-018, DA-2026-022, PRJ-SV-014), tên người minh họa có sẵn trong mockup, CCCD/SĐT **masked** (dạng `084****1234`), không số tài khoản ngân hàng thật, không lương thật. Watermark "DỮ LIỆU MINH HỌA".
5. **CẤM** đụng `docs/tasks/hrp-v4-bod-mockup/mockup/*` và task mockup.
6. `app/bcc/actions.ts` + `app/bcc/page.tsx` là khu vực founder đang phát triển song song — chỉ refactor cơ học 1 dòng (import `getPrisma`), **không đổi logic**. Nếu thấy appBCC/ hoặc app/bcc/ thay đổi không phải của bạn trong `git status` → không add, ghi BLK.
7. **CẤM** `git add -A` / `git add .`. Chỉ `git add` đúng file của STEP đang làm. Có 2 file docs đang bị xóa trong working tree (`docs/app-big-picture.html`, `docs/competitive-analysis-viec3mien.md`) — **KHÔNG đụng, KHÔNG commit** (founder sẽ quyết).
8. Không tự ý đổi design tokens, không thêm dependency nặng, không đổi Next config trừ khi STEP yêu cầu.

## 2. Kiến thức môi trường (đã xác minh sẵn — đừng mò lại)

- Next.js 15.5.23 App Router; TypeScript `strict`; tsconfig `paths`: `"@/*"` → **ROOT** (import dùng `@/src/...`, `@/app/...`).
- `vercel.json`: framework nextjs, buildCommand `node scripts/copy-static.mjs && npx prisma generate && next build`, có rewrites `/(.*)` → `/$1.html` (đừng sửa rewrites).
- Prisma 5.22; schema canonical `prisma/schema.prisma` (38 model); 2 migration hiện có: `20260815013341_init`, `20260815084134_g22_security` + `migration_lock.toml` — thư mục `prisma/migrations/` hiện **untracked** (STEP-03 phải commit nó vào git).
- Vitest 2.1.8, config `vitest.config.ts`, test: `src/domains/attendance/ticket.service.test.ts`, `src/domains/payroll/calculateVietnameseTaxes.test.ts`.
- 7 chỗ `new PrismaClient()`: `app/api/tickets/route.ts:19`, `[id]/route.ts:12`, `[id]/approve/route.ts:21`, `[id]/cancel/route.ts:12`, `[id]/pay/route.ts:18`, `[id]/reject/route.ts:16`, `app/bcc/actions.ts:5`.
- Windows + Git Bash. Commit message convention của repo: **tiếng Việt không dấu**, prefix như `feat(bcc):`, `chore(db):`, `refactor(ticket):`.
- Hook scout-block có thể từ chối lệnh chứa `node_modules`, `dist/`, `build/`, `__pycache__` — tránh dùng các chuỗi đó trong lệnh shell (dùng glob/grep tool thay vì find).

## 3. Thực thi — chi tiết từng STEP

### STEP-01 — Singleton Prisma (`src/lib/db.ts`)
- Tạo `src/lib/db.ts` pattern chuẩn Next.js: `globalThis` cache để tránh multi-instance trong dev hot-reload; export `getPrisma()`.
- Refactor 7 chỗ kể trên: bỏ `import { PrismaClient } from '@prisma/client'` + `new PrismaClient()` → `import { getPrisma } from '@/src/lib/db'`; đổi biến dùng `getPrisma()`.
- Chạy `npx tsc --noEmit` (exit 0) + `npx vitest run` (pass) trước commit.
- Commit: `refactor(db): singleton PrismaClient src/lib/db.ts, 7 cho new PrismaClient quy ve getPrisma()`

### STEP-02 — Archive schema patch
- `mkdir prisma/_archive` + `git mv prisma/schema-v3.1-patches.prisma prisma/schema-m7-tickets.prisma prisma/_archive/`
- Thêm `README.md` 1 dòng trong `_archive/` giải thích deprecated.
- Commit: `chore(prisma): archive 2 file schema patch deprecated`

### STEP-03 — Migration gap + đưa migrations vào git
- Đối chiếu 38 model trong `schema.prisma` với DDL 2 migration hiện có → liệt kê model chưa có DDL.
- Tạo migration `g0_baseline` **add-only**: dùng `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script` để sinh SQL, rà soát kỹ (chỉ CREATE TABLE/INDEX/ENUM add, không DROP/ALTER destructive), đặt vào `prisma/migrations/<timestamp>_g0_baseline/migration.sql`.
- Verify: `npx prisma validate` (bắt buộc). Nếu có `DATABASE_URL_DEV` trong `.env` → thử `prisma migrate deploy` lên đó; **tuyệt đối không** chạy trên `DATABASE_URL` chính. Nếu không có dev DB → ghi BLK ở HANDOFF §5, chờ Tier 1/sếp tạo Neon branch.
- Commit toàn bộ `prisma/migrations/` (gồm 2 folder cũ + g0_baseline + migration_lock.toml).
- Commit: `feat(db): migration g0_baseline add-only cho model V4 con thieu + commit migrations vao git`

### STEP-04 — Workspaces + tách @hrp/money + @hrp/payroll-core
- `package.json` root: thêm `"workspaces": ["packages/*"]`.
- Tạo `packages/money/` (package.json name `@hrp/money`, source `src/index.ts` re-export từ `src/shared/utils/money.ts` logic — **di chuyển** code, không copy) và `packages/payroll-core/` (từ `src/domains/payroll/*` — `calculateVietnameseTaxes.ts`, `payrollConfigRepo.ts`, `index.ts` barrel).
- Cách integrate ít rủi ro nhất: **tsconfig paths** — thêm `"@hrp/money": ["packages/money/src/index.ts"]`, `"@hrp/payroll-core": ["packages/payroll-core/src/index.ts"]`; cập nhật `vitest.config.ts` alias tương ứng; cập nhật import trong test files.
- Cập nhật `vercel.json` buildCommand nếu cần (workspaces + prisma generate vẫn phải chạy). Test `npm run build` local bắt buộc trước commit.
- `npx vitest run` pass (test payroll + ticket).
- Commit: `feat(pkgs): tach @hrp/money + @hrp/payroll-core sang packages/ (workspaces + tsconfig paths)`

### STEP-05 — @hrp/job-board (read-only, ISR, không auth)
- Tạo `packages/job-board/` (service đọc `Project` + `StaffingOrder` có `isPublic=true`) + `app/job-board/page.tsx` (server component, `revalidate = 300`, không auth).
- UI bám theo mockup `docs/tasks/hrp-v4-bod-mockup/mockup/S05_JobBoard_Public_1440.html` (đây là AC giao diện): header public (logo + "Việc làm/Về HRP/Liên hệ" + Đăng nhập/Đăng ký), filter minh họa (địa điểm Bắc Ninh/Bắc Giang; ca HC/D1/D2/N1/T1), 3 card project canonical: DA-2026-018 "Tuyển gấp" Cần 50/Đã nhận 47/Còn thiếu 3; DA-2026-022 "Đã nhận đủ" 80/80/0; PRJ-SV-014 "Đang tuyển" 35/32/3; nút "Ứng tuyển" **không flow** (A-05 thuộc Wave 3 — nút có thể disabled hoặc ghi chú); watermark DỮ LIỆU MINH HỌA; không PII.
- Điều kiện tiên quyết: bảng `Project` phải nằm trong `g0_baseline` (STEP-03) — nếu chưa, quay lại STEP-03.
- Commit: `feat(job-board): @hrp/job-board + route /job-board ISR public theo S05 (A-04, khong auth)`

### STEP-06 — Seed 20 scenario
- `prisma/seed.ts` (hoặc `.mjs` nếu ts-node không sẵn — kiểm tra devDependencies): 20 fixtures theo `docs/data-scope-security.md` (scenario matrix 13 role × scope), idempotent (`upsert` theo key duy nhất), mock canonical, masked PII.
- Thêm `"prisma": { "seed": "..." }` vào package.json nếu chưa có; test `prisma db seed` 2 lần không lỗi (nếu không có dev DB thì `prisma validate` + ghi BLK).
- Commit: `feat(seed): prisma/seed.ts 20 scenario fixtures mock (idempotent, khong PII)`

### STEP-07 — Contract appBCC ↔ web
- Viết `docs/CONTRACT_BCC.md`: dựa trên model `PortalTimesheet` trong schema + code thật `app/bcc/actions.ts` (fetchOptions/fetchPortalTimesheet): liệt kê bảng + cột bắt buộc + format `periodMonth/periodYear` (MM/YYYY) + trạng thái + quy tắc **upsert versioned** appBCC phải tuân thủ (xử lý R-21: không delete-then-insert không kiểm soát) + quy tắc PII (không để xlsx thật lọt git).
- Phần "Chữ ký founder" để trống cho sếp ký. Không tự bịa cột — đối chiếu schema.prisma thật.
- Commit: `docs(contract): CONTRACT_BCC.md dong bang contract bang appBCC <-> web (R-21)`

### STEP-08 — Deploy verify
- Push toàn bộ commit lên `origin main` (trước push: `git fetch` + `git pull --rebase` nếu có commit mới từ founder; conflict ở appBCC/ → dừng, ghi BLK).
- Verify URL matrix bằng curl: `/`, `/bcc`, `/job-board`, `/docs` — tất cả 200 (đợi Vercel deploy xong ~2 phút).
- Ghi kết quả vào HANDOFF.

## 4. Đầu ra bắt buộc

1. **HANDOFF.md** tại `docs/tasks/hrp-phase0-foundation/HANDOFF.md` theo đúng template `.ai-pipeline/templates/HANDOFF.template.md`: Execution Trace từng STEP (lệnh chính + kết quả), evidence từng AC (AC-01…AC-10: PASS/PARTIAL/FAIL + bằng chứng), mục BLK/Deviation nếu có, liệt kê commit đã tạo.
2. Báo cáo cuối cho Tier 1: tóm tắt STEP đã xong, AC nào PASS/PARTIAL/FAIL/BLOCKED, danh sách commit (hash + message), mọi điểm cần founder quyết (Neon dev branch, seed DB, chữ ký contract).

## 5. Quy tắc làm việc

- Làm tuần tự, 1 STEP = 1 commit. Nếu 1 STEP bị chặn bởi yếu tố ngoài tầm (env, quyền) → ghi BLK + sang STEP tiếp theo được (không dừng cả task).
- Trước mỗi commit: `npx tsc --noEmit` exit 0. STEP nào đụng build (04, 05) còn phải `npm run build` pass local.
- Không sửa TASK.md. Không sửa PROMPT này. Mọi bất đồng với contract → ghi vào HANDOFF §5 (BLK/Deviation), không tự quyết.
- Git: làm việc thẳng trên `main` (nhịp repo hiện tại), commit gọn, push từng nhịp theo STEP-08 (hoặc sớm hơn nếu muốn demo — nhưng push cuối phải có đủ 8 STEP).
