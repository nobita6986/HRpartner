# TASK — HRP Phase 0 Foundation (`hrp-phase0-foundation`)

> Pipeline 3-tier: `TASK.md` (Tier 1 — Planner) → `HANDOFF.md` (Tier 2 — Executor) → `AUDIT.md` (Tier 3 — Auditor)
> Spec version: `v1.0` · Ngày khởi tạo: **16/08/2026**
> Status: `PASS` — STEP-09/AC-11 (PASS 13/13) + STEP-10/AC-12 (PASS 15/15) hoàn thành; production live filter trái theo mockup S05 v2. Gate cuối duy nhất: **sếp mở https://hrpartner.vn/job-board duyệt demo** → đóng Phase 0.
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
| STEP-09 | **UI polish `/job-board`**: bám đúng design system **Warm Professionalism** (`stitch/warm_professionalism/DESIGN.md`): primary `#F26522` (canonical G27), nền `#FAF9F7`, font **Be Vietnam Pro** (headline/body) + **Inter** (label), radius 8px button / 16px card, spacing 8px scale, card padding 24px, border `#EAE8E4`, shadow ambient orange. Bám layout mockup `docs/tasks/hrp-v4-bod-mockup/mockup/S05_JobBoard_Public_1440.html`; header public tham chiếu `stitch/hrp_landing_page_html_standard/code.html` (brand.orange `#f26522`, orangeDark `#a63b00`). Watermark **"DỮ LIỆU MINH HỌA" có dấu**. **Bỏ toàn bộ inline style tự bịa** (màu xanh `#0F4C81`). KHÔNG đổi logic/data (`listPublicJobs`, `revalidate = 300`, không auth, 3 project canonical) | AC-11 |
| STEP-10 | **Sidebar filter trái `/job-board` (DEC-32)**: bám mockup `S05_JobBoard_Public_1440.html` **v2** — bỏ filter chips ngang, thêm panel filter trái 240px (surface, border `#EAE8E4`, radius 16px, padding 20px), 4 nhóm: **Địa điểm** (Tất cả/Bắc Ninh/Bắc Giang), **Ca làm** (Tất cả/HC/D1/D2/N1/T1), **Loại hình** (Tất cả/Nhà máy/Kho vận), **Trạng thái tuyển** (Tất cả/Tuyển gấp/Đang tuyển/Đã nhận đủ) + nút **"Xóa bộ lọc"** + số đếm từng mục. **Filter hoạt động client-side thật** trên 3 card canonical (KHÔNG đụng DB — query DB thật thuộc Phase 4/AUD-003): chọn 1 mục/nhóm → chỉ card khớp hiển thị; "Tất cả" = default; "Xóa bộ lọc" reset. Được phép thêm field hỗ trợ filter vào `listPublicJobs()` (vd `province`, `type`) — **additive, không đổi số liệu canonical** (50/47/3, 80/80/0, 35/32/3). Responsive <900px: panel co lại/xuống trên grid. Không auth, giữ `revalidate = 300` | AC-12 |

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
| AC-11 | `/job-board` dùng đúng design tokens Warm Professionalism: không còn màu xanh `#0F4C81`; có primary `#F26522` + nền `#FAF9F7` + font Be Vietnam Pro; watermark có dấu "DỮ LIỆU MINH HỌA"; layout khớp S05 | đọc code + curl production + mắt sếp |
| AC-12 | `/job-board` có **cột filter trái khớp mockup S05 v2** (panel 240px, 4 nhóm filter + nút Xóa bộ lọc + số đếm); filter **hoạt động client-side thật**: chọn "Bắc Giang" → chỉ Sao Việt; chọn "Ca làm = N1" → chỉ An Phát; chọn "Loại hình = Kho vận" → chỉ Yên Phong; "Xóa bộ lọc" reset về 3 card; số liệu canonical không đổi; không auth, `revalidate = 300` giữ | đọc code + `npm run build` + curl production + mắt sếp |

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
- [x] `/job-board` khớp design Warm Professionalism + filter trái S05 v2 (AC-11 PASS 13/13 + AC-12 PASS 15/15)
- [ ] **Demo**: link public `app/job-board` lên Vercel — sếp duyệt

## 9. Revision Log

| Spec version | Date | Change | Reason |
|---|---|---|---|
| `v1.0` | `2026-08-16` | Khởi tạo contract Phase 0 Foundation: 8 STEP, 10 AC, 5 RISK, phân vai 3-tier | Lệnh founder "vào Phase 0" + D13–D16 đã chốt |
| `v1.1` | `2026-08-16` | Planner Resolution Round 1: DEC-30 paths-based monorepo (STEP-04/AC-02); bỏ `/docs` khỏi URL matrix (STEP-08); Status → CONDITIONAL chờ 2 gate founder | AUDIT Round 1 CONDITIONAL → PLANNER-DECISION v1.0 |
| `v1.2` | `2026-08-16` | Resolution Round 2: DEC-31 drift recovery (g0_baseline IF NOT EXISTS + idx_timesheets_lookup vào schema); Status → ROUND_3 | Tier 2 round 2 (AC-03 BLOCKED P3018) → PLANNER-DECISION v1.1 |
| `v1.3` | `2026-08-16` | Tier 3 re-audit Round 2: **PASS 10/10 AC, 0 P0/P1**; DoD kỹ thuật hoàn thành; Status → PASS chờ sếp duyệt demo | AUDIT.md Round 2 → PLANNER-DECISION v1.3 |
| `v1.4` | `2026-08-16` | Thêm **STEP-09 + AC-11** (UI polish theo Warm Professionalism) — lệnh sếp: demo chưa đúng design, sửa ngay trước khi duyệt; Status → READY_FOR_EXECUTION | PLANNER-DECISION v1.4 |
| `v1.5` | `2026-08-16` | Tier 3 Round 3: **AC-11 PASS 13/13**, 0 P0/P1 (AUD-008/009 P3 cosmetic); AUD-006 RESOLVED; production live; DoD "khớp design" tick; Status → PASS chờ sếp duyệt demo | PLANNER-DECISION v1.5 |
| `v1.6` | `2026-08-16` | Thêm **STEP-10 + AC-12** (cột filter trái theo mockup S05 v2, DEC-32) — lệnh sếp sau review demo; filter client-side hoạt động thật trên 3 card canonical; DoD "khớp design" mở lại; Status → READY_FOR_EXECUTION | PLANNER-DECISION v1.6 |
| `v1.7` | `2026-08-16` | Tier 3 Round 4: **AC-12 PASS 15/15**, 0 P0/P1 (AUD-010/011 P3 ghi nhận); production live filter trái; DoD "khớp design" tick; Status → PASS chờ sếp duyệt demo | PLANNER-DECISION v1.7 |
