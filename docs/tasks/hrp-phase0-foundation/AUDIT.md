# AUDIT — hrp-phase0-foundation · Round 1
> Tier 3 · 2026-08-16 · Verdict tổng: **CONDITIONAL**

**Independence Statement:** Tôi là Tier 3 Auditor độc lập. Tôi không tham gia vào quá trình viết mã của Tier 2. Các kết luận dưới đây dựa trên mã nguồn thực tế và kết quả thực thi lệnh cục bộ.

## Bảng AC
| AC | Kết quả | Evidence (lệnh + output thật) |
|---|---|---|
| AC-01 | **PASS** | `grep -rn "new PrismaClient" app/ src/ packages/` chỉ trả về `src/lib/db.ts:10`. Mọi tham chiếu khác đã dùng singleton. |
| AC-02 | **PARTIAL** | `npx tsc --noEmit` exit 0 thành công. Tuy nhiên, `package.json` và `vercel.json` **KHÔNG** có cấu hình hỗ trợ workspaces (Tier 2 tự ý bỏ qua). |
| AC-03 | **PARTIAL** | `npx prisma validate` pass. File `migration.sql` của `g0_baseline` là add-only (chỉ `CREATE TABLE` và `CREATE INDEX`). Không thể verify `prisma migrate dev` do thiếu môi trường Neon dev branch. |
| AC-04 | **PASS** | `npx vitest run` thành công: 2 test files, 32 tests passed (exit 0). Không có lỗi import alias. |
| AC-05 | **PARTIAL** | File `app/job-board/page.tsx` tồn tại, có `revalidate = 300`, watermark "DỮ LIỆU MINH HỌA" và dữ liệu khớp yêu cầu S05. Chưa verify được runtime do chưa deploy Vercel thực tế. |
| AC-06 | **PASS** | Đọc `prisma/seed.mjs` xác nhận sử dụng dữ liệu Canonical (An Phát, Yên Phong, Sao Việt), mask số điện thoại, CCCD. Logic sử dụng `upsert` (idempotent). |
| AC-07 | **PASS** | `ls prisma/_archive/` có chứa 3 tệp (kèm `README.md`). Thư mục `prisma/` gốc chỉ còn `schema.prisma`. |
| AC-08 | **PASS** | `git ls-files prisma/migrations/` trả về các file sql/toml cũ và thư mục `20260816010542_g0_baseline` đã được tracked trên git. |
| AC-09 | **PARTIAL** | `docs/CONTRACT_BCC.md` tồn tại, cấu trúc schema khớp với model `PortalTimesheet`. Đang chờ Founder ký xác nhận (Freeze). |
| AC-10 | **PASS** | Check `git log -p`: Không có lệnh migrate trực tiếp lên prod, không có `.env`, `*.xlsx`, `db_*.txt`. App/bcc chỉ đổi đúng phần gọi `getPrisma()`. Không leak secret. |

## Findings
| ID | Severity | Mô tả | Vị trí (file:line) | Đề xuất sửa |
|---|---|---|---|---|
| AUD-001 | P2 | Thiếu cấu hình Workspaces (DEV-01) | `package.json:1`, `vercel.json:1` | Cần cập nhật `package.json` (thêm `"workspaces"`) và `vercel.json` để không bị fail khi build thật sự. Planner cần quyết định lùi sang Phase 1 hay sửa liền. |
| AUD-002 | P2 | Thiếu Neon Dev Branch (BLK-01) | `N/A:0` | Yêu cầu Founder / Planner cung cấp môi trường Neon dev DB (`DATABASE_URL_DEV`) để Tier 2 có thể verify việc migrate add-only là hoàn toàn an toàn và thành công thật sự. |
| AUD-003 | P3 | Hardcode dữ liệu & Inline Style (DEV-02, DEV-03) | `app/job-board/page.tsx:15` | Chấp nhận tạm cho mục đích demo (Phase 0). Tier 1 cần ghi nhận việc sẽ refactor lại dùng query thật từ DB và sử dụng `_assets/hrp.css` vào Phase 4. |
| AUD-004 | P3 | Chờ ký duyệt Contract BCC (BLK-03) | `docs/CONTRACT_BCC.md:175` | Founder cần review kỹ contract và ký xác nhận Freeze. Tier 1 theo dõi. |
| AUD-005 | P3 | Chưa verify được URL runtime (BLK-02) | `N/A:0` | Cần Deploy Vercel (theo STEP-08 của nhiệm vụ) để audit toàn bộ AC-05 trên môi trường staging/production. |

## Verdict tổng + lý do
**Verdict:** `CONDITIONAL`
**Lý do:**
1. Tất cả các yếu tố core (Database Integrity, Scope Adherence, Secret/PII Leak) đều vượt qua. **Không có finding P0 hay P1**. Code an toàn.
2. Có một số finding P2/P3 liên quan tới Deviations (tự bỏ workspaces để tránh build lỗi) và Blockers (thiếu môi trường test Neon dev branch, chưa deploy Vercel, chưa có chữ ký Founder). 
3. Các vấn đề này cần Tier 1 (Planner) xác nhận chấp thuận hoặc lên kế hoạch xử lý (Phase 1) trước khi có thể chuyển trạng thái sang PASS hoàn toàn.

---

## Round 2 — Re-audit (16/08/2026)

> Tier 3 re-audit sau Resolution Round 1–3 của Planner (PLANNER-DECISION v1.2) + Tier 2 round 2–4.
> Toàn bộ lệnh dưới đây do tôi (Tier 3) tự chạy lại trên repo — không tin claim trong HANDOFF.
> Tuân thủ: read-only tuyệt đối (ngoại lệ duy nhất: seed 1 lần trên dev branch), không commit/push, không ghi giá trị URL/password.

### Bảng AC

| AC | Kết quả | Evidence (lệnh + output thật tôi tự chạy) |
|---|---|---|
| AC-01 | **PASS** | `grep -rn "new PrismaClient" app/ src/ packages/` → chỉ 1 dòng duy nhất `src/lib/db.ts:10` (cache globalThis). Seed script (`prisma/seed.mjs`) tạo PrismaClient riêng — ngoài phạm vi grep AC-01, là script CLI không qua Next runtime, chấp nhận. |
| AC-02 | **PASS** | `npm run build` local → `[exited with code 0]`; route table in ra đủ `/bcc` + `/job-board` (job-board revalidate 5m). Curl production: `https://hrpartner.vn/` → 200, `/bcc` → 200, `/job-board` → 200. |
| AC-03 | **PASS** | Trên **Neon dev branch** (DATABASE_URL = DATABASE_URL_DEV, không in giá trị): `npx prisma migrate status` → exit 0, "3 migrations found", "Database schema is up to date!" (không có failed record). `npx prisma migrate diff --from-url (dev) --to-schema-datamodel prisma/schema.prisma --script` → exit 0, output chỉ `-- This is an empty migration.` = **0 DDL** → dev DB khớp canonical 100%. Đọc `migration.sql`: `CREATE TABLE IF NOT EXISTS` (dòng 9), `CREATE INDEX IF NOT EXISTS` (dòng 26), `CREATE INDEX IF NOT EXISTS "idx_timesheets_lookup"` (dòng 28); **không có** DROP/TRUNCATE/RENAME. Không chạy deploy/resolve. |
| AC-04 | **PASS** | `npx vitest run` → Test Files 2 passed, **Tests 32 passed (32)**, exit 0 (ticket 16 + payroll 16). |
| AC-05 | **PASS** | Đọc `app/job-board/page.tsx`: `revalidate = 300` (dòng 3), không auth, không gọi DB; watermark (dòng 30, 89); 3 project canonical khớp `packages/job-board/src/index.ts`: DA-2026-018 `50/47`, DA-2026-022 `80/80`, PRJ-SV-014 `35/32`. Curl production `/job-board` → 200, HTML chứa "DU LIEU MINH HOA", đủ 3 mã project + tên (An Phat / Yen Phong / Sao Viet). Ghi chú P3: chuỗi watermark ở bản deploy là bản **không dấu** "DU LIEU MINH HOA" (mockup S05 dùng "DỮ LIỆU MINH HỌA" có dấu) — xem AUD-006. |
| AC-06 | **PASS** | Đọc `prisma/seed.mjs`: toàn bộ dùng `upsert` (idempotent), PII masked (SĐT `090****001`, CCCD `084****1234`), không bank/lương thật. **Chạy 1 lần** (ngoại lệ Planner) trên dev branch: `prisma db seed` → exit 0, `Upserted: 12 users, 4 projects, 3 workers` — upsert, không destructive. |
| AC-07 | **PASS** | `ls prisma/_archive/` → đúng 3 tệp: `README.md` + `schema-m7-tickets.prisma` + `schema-v3.1-patches.prisma`. `prisma/` gốc chỉ còn `schema.prisma` + `seed.mjs` + `migrations/`. |
| AC-08 | **PASS** | `git ls-files prisma/migrations/` → `20260815013341_init`, `20260815084134_g22_security`, `20260816010542_g0_baseline` (mỗi folder 1 migration.sql) + `migration_lock.toml`. |
| AC-09 | **PASS** | `docs/CONTRACT_BCC.md` §11: `Ngay ky: 16/08/2026`, `Ky ten: Founder (sep) — duyet qua chat: "Gate 1: OK"`; header dòng 8: **FREEZE** — founder da ky duyet 16/08/2026. |
| AC-10 | **PASS** | `git log` `127c2ec..HEAD` (9 commit): chỉ docs + `prisma/schema.prisma` (+1 dòng `@@index` lookup, DEC-31) + `migration.sql` g0_baseline (IF NOT EXISTS + idx). Không `.env`, không `*.xlsx`, không `db_*.txt` (xlsx/txt appBCC đã được `.gitignore` che — verify bằng `git check-ignore`). Quét secret `git log -p` grep `npg_|postgres://|password|token|SECRET|API_KEY`: chỉ trúng chữ hướng dẫn trong doc PROMPT/HANDOFF (vd "Không kèm giá trị URL/password") và 1 comment CSS `/* ═══════ TOKENS ═══════ */` thuộc file `docs/app-big-picture.html` bị **xóa** (commit 7bfa69a) — không có secret thật, không có lệnh migrate trỏ production trong diff. |

### Kiểm an toàn bổ sung (§3)

- **git status**: đúng như trạng thái cho phép — chỉ còn 2 file modified `appBCC/agent_mapper.py` + `appBCC/app.py` (founder làm song song, không đụng). Các mục untracked còn lại (`.ai-pipeline/`, `.claude/`, `.codegraph/`, `stitch/`, `favicon.ico`, `TIER1/2/3_PROMPT.md`) đều có mtime **15/08** — tồn tại TRƯỚC khi task bắt đầu (16/08 01:03), là artifact harness/pipeline, **không phải sản phẩm thừa của Tier 2** (các round 1–4 không để lại file untracked mới) — ghi nhận, không flag (xem AUD-007).
- **Schema `PortalTimesheet`**: có `@@index([employeeCode, project, periodMonth, periodYear], name: "idx_timesheets_lookup")` (sau `@@index([employeeCode])`); đối chiếu 13 cột với CONTRACT §2.2: id, employee_code, full_name, project, period_month, period_year, total_work_days DECIMAL(5,2), ot_hours DECIMAL(5,2), absent_days DECIMAL(5,2), daily_data JSONB, payroll_data JSONB, total_income DECIMAL(12,2), created_at TIMESTAMP(3) — **khớp 100%**, không field nào đổi. `git diff 127c2ec..HEAD -- prisma/schema.prisma` = đúng 1 dòng thêm (index lookup).
- **`app/bcc/actions.ts`**: diff bản trước refactor (commit `4665692`) vs sau (commit `db6bc04` — STEP-01) chỉ đổi: import `PrismaClient` + `new PrismaClient()` → `import { getPrisma } from '@/src/lib/db'` + 2 dòng `const prisma = getPrisma();` trong `fetchOptions` và `fetchPortalTimesheet`. **Logic giữ nguyên.** `app/bcc/page.tsx` không bị chạm bởi Tier 2 (`git log db6bc04..HEAD -- app/bcc/` rỗng).
- **`docs/tasks/hrp-v4-bod-mockup/*`**: `git diff 127c2ec..HEAD` trên thư mục này = **rỗng** — không ai đụng trong phạm vi audit.

### Findings mới

| ID | Severity | Mô tả | Vị trí (file:line) | Đề xuất |
|---|---|---|---|---|
| AUD-006 | P3 | Watermark job-board ở bản deploy là chuỗi **không dấu** "DU LIEU MINH HOA" trong khi mockup S05 dùng "DỮ LIỆU MINH HỌA" (có dấu). Toàn trang dùng kiểu không dấu nhất quán (badge "Tuyen gap", nút "Ung tuyen") — thuần cosmetic, không ảnh hưởng AC (nội dung watermark minh họa vẫn hiển thị rõ) | `app/job-board/page.tsx:30,89` | Gộp vào backlog polish job-board Phase 4 (cùng AUD-003 round 1) |
| AUD-007 | P3 | Working tree còn mục untracked (`.ai-pipeline/`, `.claude/`, `.codegraph/`, `stitch/`, `favicon.ico`, `TIER1/2/3_PROMPT.md`) — đều tồn tại từ **trước task** (mtime 15/08), là artifact harness/pipeline, không phát sinh trong các round Tier 2 | repo root | Không cần hành động cho Phase 0; sếp cân nhắc thêm vào `.gitignore` hoặc quyết định đưa vào git riêng |

### Verdict Round 2: **PASS** + lý do

- **10/10 AC PASS** (không có PARTIAL/FAIL); 0 finding P0/P1; chỉ 2 ghi chú P3 cosmetic/observation (AUD-006, AUD-007) không chặn.
- 2 gate founder đã đóng: contract FREEZE ký 16/08 (AC-09) + Neon dev branch có `DATABASE_URL_DEV` (AC-03, AC-06 runtime PASS — tôi tự chạy lại: migrate status up-to-date 3/3, diff = 0 DDL, seed exit 0).
- Build local xanh + production URL matrix (`/`, `/bcc`, `/job-board`) đều 200 + nội dung job-board đủ watermark & 3 project canonical (AC-02, AC-05 runtime).
- An toàn: g0_baseline add-only `IF NOT EXISTS`, không destructive; schema khớp contract 13 cột; app/bcc chỉ đổi import; không secret leak trong mọi commit mới.
- Đề nghị Tier 1 đóng Phase 0 theo DoD §8 (duyệt demo job-board) và chuyển AUD-006/AUD-007 cùng các mục backlog đã ghi nhận (DEV-01…04) vào TASK Phase 4.

---

## Round 3 — Verify STEP-09/AC-11 (16/08/2026)

> Tier 3 audit sau commit `e6d7f2b` (round 5 — UI polish `/job-board` theo Warm Professionalism).
> Toàn bộ lệnh dưới đây do tôi (Tier 3) tự chạy lại trên repo — không tin claim trong HANDOFF §1 Round 5.
> Tuân thủ: read-only tuyệt đối, không commit/push, chỉ sửa AUDIT.md.

### Bảng kết quả từng mục kiểm

| # | Mục kiểm | Kết quả | Evidence (lệnh + output thật tôi tự chạy) |
|---|---|---|---|
| 1 | Scope commit `e6d7f2b` | **PASS** | `git show e6d7f2b --stat` → đúng 4 file: `app/globals.css` (+173), `app/job-board/page.tsx` (113 ±), `app/layout.tsx` (+20), `docs/tasks/hrp-phase0-foundation/HANDOFF.md` (+24). Không file lạ, không đụng `appBCC/`. Commit là HEAD (e6d7f2b). |
| 2 | `page.tsx` bỏ toàn bộ inline style màu cũ | **PASS** | Bản trước (e6d7f2b^) có 15+ chỗ inline style `#0F4C81`/`system-ui`/`#F7F8FA`/`#E5E7EB`/không dấu (dòng 18–47) — bản mới dùng class `pub-*`, `fchip`, `job-card`, `badge-*`, `apply-btn`, `watermark-badge`. Còn đúng 1 inline style `style={{ width: ... }}` (dòng 96) là **width động theo dữ liệu** của thanh progress — không phải màu/style tự bịa (xem AUD-009). |
| 3 | Data 3 project canonical không đổi | **PASS** | `packages/job-board/src/index.ts` (không nằm trong commit e6d7f2b): DA-2026-018 `50/47` (thiếu 3), DA-2026-022 `80/80` (thiếu 0), PRJ-SV-014 `35/32` (thiếu 3); `listPublicJobs()` giữ nguyên. |
| 4 | `revalidate = 300` giữ + không auth | **PASS** | `app/job-board/page.tsx:4` `export const revalidate = 300`; không import auth/session, không gọi `getPrisma`. Build route table: `/job-board` ○ Static, Revalidate 5m. |
| 5 | Watermark có dấu | **PASS** | `app/job-board/page.tsx:39` (header) + `:108` (footer): **"DỮ LIỆU MINH HỌA"** có dấu. Grep `DU LIEU MINH HOA` toàn `app/`: 0 match. |
| 6 | `globals.css` tokens Warm Professionalism | **PASS** | `:root`: `--primary #f26522` (:10), `--primary-dark #a63b00` (:11), `--background #faf9f7` (:16), `--line #eae8e4` (:24), `--radius 8px` (:31, button/chip), `--radius-md 16px` (:32, card), `--shadow-card` ambient orange `rgba(242, 101, 34, 0.08)` (:33). `.job-card` padding 24px (:119). |
| 7 | `layout.tsx` font Be Vietnam Pro + Inter | **PASS** | `next/font/google`: `Be_Vietnam_Pro` (subsets `latin`+`vietnamese`, 400/500/600/700) + `Inter` (400/500/600), gán `--font-bvp`/`--font-inter`; `<html lang="vi">`; metadata giữ nguyên (ngoài phạm vi). |
| 8 | Grep toàn `app/` không còn token cũ | **PASS** | `#0F4C81`: 1 match duy nhất ở `app/globals.css:6` — **comment** mô tả việc thay thế, không phải màu render (xem AUD-008). `system-ui`: 0. `DU LIEU MINH HOA`: 0. `#F7F8FA`/`#E5E7EB`/Material Symbols/CDN tailwind: 0. `lucide-react ^0.468.0` đã có sẵn trong `package.json` (package.json không nằm trong commit — không thêm dependency). |
| 9 | `npx tsc --noEmit` | **PASS** | exit 0. |
| 10 | `npm run build` | **PASS** | exit 0. `/job-board` ○ Static Revalidate 5m (ISR giữ nguyên), route table đủ `/bcc` + `/job-board`; "Compiled successfully in 17.3s". |
| 11 | `npx vitest run` | **PASS** | Test Files 2 passed, **Tests 32 passed (32)**, exit 0 (ticket 16 + payroll 16). |
| 12 | Curl production `https://hrpartner.vn/job-board` | **PASS** | HTTP 200 (0.15s). HTML: watermark **"DỮ LIỆU MINH HỌA" có dấu** (4 match), `0f4c81` = 0 match. CSS tĩnh `/_next/static/css/693d078eae805d40.css`: `f26522` (2), `faf9f7`, `eae8e4`, `--radius:8px`, `--radius-md:16px`, `--shadow-card:0 1px 2px #1a1c1b0a,0 6px 18px #f2652214` (ambient orange dạng minified = rgba(242,101,34,0.08)), `@font-face` **Be Vietnam Pro** + **Inter** + Fallback. `system-ui` chỉ xuất hiện trong boilerplate 404 built-in Next.js (RSC payload `"404: This page could not be found."`) — không phải code dự án. **Deploy production đã là bản mới — verify runtime xong, không cần chờ.** |
| 13 | Layout khớp S05 + header tham chiếu landing standard | **PASS** | Đối chiếu `docs/tasks/hrp-v4-bod-mockup/mockup/S05_JobBoard_Public_1440.html`: đủ nav "Việc làm/Về HRP/Liên hệ", nút "Đăng nhập/Đăng ký", watermark header+footer (mockup 2 match), 3 project code DA-2026-018 / DA-2026-022 / PRJ-SV-014, badge "Tuyển gấp/Đã nhận đủ/Đang tuyển", 3 nút "Ứng tuyển" — trùng cấu trúc implementation. `stitch/hrp_landing_page_html_standard/code.html`: `#f26522` + `orangeDark: '#a63b00'` — khớp `--primary`/`--primary-dark`. |

### Findings mới

| ID | Severity | Mô tả | Vị trí (file:line) | Đề xuất |
|---|---|---|---|---|
| AUD-008 | P3 | `app/globals.css:6` vẫn còn chuỗi "#0F4C81" trong comment mô tả việc thay thế inline style cũ ("xanh #0F4C81...") — không phải màu render (grep dính 1 match văn bản). Không ảnh hưởng AC-11: không còn **màu** xanh nào được render. HANDOFF đã thừa nhận match này. | `app/globals.css:6` | Không bắt buộc; nếu muốn `grep #0F4C81` về 0 tuyệt đối, xóa cụm từ trong comment ở lần sửa UI sau. |
| AUD-009 | P3 | `app/job-board/page.tsx:96` còn đúng 1 inline style `style={{ width: ... }}` cho thanh tiến độ — width động theo dữ liệu (pct), data-driven hợp lý, **không** phải màu/style tự bịa. | `app/job-board/page.tsx:96` | Observation, không cần hành động. |

### Verdict AC-11: **PASS**

- **13/13 mục kiểm PASS**; 0 finding P0/P1; chỉ 2 observation P3 (AUD-008, AUD-009) không chặn.
- Đủ 5 tiêu chí AC-11: (1) hết màu xanh `#0F4C81` (chỉ còn comment), (2) có primary `#F26522` + nền `#FAF9F7` + font **Be Vietnam Pro** (next/font, subset vietnamese) — đều xác nhận trong CSS tĩnh production, (3) watermark có dấu **"DỮ LIỆU MINH HỌA"** (code + production HTML), (4) layout khớp S05 (đối chiếu mockup + `code.html` brand tokens `#f26522`/`#a63b00`), (5) KHÔNG đổi logic/data: `listPublicJobs()`, `revalidate = 300`, không auth, 3 project canonical (50/47/3, 80/80/0, 35/32/3).
- **AUD-006 (round 2 — watermark không dấu) → RESOLVED**: production giờ render "DỮ LIỆU MINH HỌA" có dấu (4 match trong HTML).
- Runtime production đã verify xong (deploy live, HTTP 200, CSS tĩnh chứa đủ tokens + @font-face) — không cần ghi "chờ deploy".
- Tổng thể: STEP-09 hoàn thành đúng spec, không deviation mới ngoài 2 observation P3 cosmetic. **AC-11 PASS**; gate còn lại thuộc sếp: mắt sếp duyệt demo `/job-board` (DoD §8) — ngoài phạm vi Tier 3.
