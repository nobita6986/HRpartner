# PLANNER-DECISION — hrp-phase0-foundation · Round 1

> Tier 1 (Planner) · 16/08/2026 · Đối tượng: `AUDIT.md` Round 1 (Tier 3, verdict **CONDITIONAL**)
> Quy tắc: mọi sửa chữa đi qua file này — **không giao sửa trực tiếp cho Tier 2**.

---

## 1. Tóm tắt verdict Tier 3 + verify bổ sung của Planner

| Nguồn | Kết quả |
|---|---|
| Tier 3 — AUDIT.md Round 1 | **CONDITIONAL** · 0 P0/P1 · 2 P2 (AUD-001, AUD-002) · 3 P3 (AUD-003…005) · "Code an toàn" |
| Planner tự chạy `npm run build` (16/08) | **exit 0** — build local xanh với cách paths-based hiện tại |
| Planner tự curl URL matrix production (16/08) | `/` 200 · `/bcc` 200 · **`/job-board` 200** — deploy Vercel thật đã xanh |

**Hệ quả:** AUD-005 đóng được ngay bằng bằng chứng mới của Planner (không cần chờ Tier 2). AUD-001 đủ căn cứ chuyển thành quyết định kiến trúc chính thức (DEC-30).

## 2. Resolution từng finding

| ID | Sev | Quyết định | Lý do / Điều kiện | Owner | Due |
|---|---|---|---|---|---|
| **AUD-001** | P2 | **ACCEPT_DEVIATION → DEC-30** | Tier 2 bỏ `npm workspaces`, resolve qua tsconfig paths trực tiếp vào `packages/*/src`. Planner verify: build local exit 0 + `/job-board` 200 production → cách paths-based hoạt động trên cả local lẫn Vercel. Với 3 package **source-only** (được Next bundle trực tiếp, chưa cần install dependency riêng) thì npm workspaces là thừa rủi ro (RISK-02). **DEC-30 chốt**: monorepo Phương án A hiện thực bằng *paths-based monorepo*; bổ sung `workspaces` khi package đầu tiên cần cài dependency riêng (khi đó ra DEC mới). Điều kiện kèm theo: Vercel build xanh — **đã đạt 16/08**. | Planner (tôi) | Xong 16/08 |
| **AUD-002** | P2 | **BLOCKED — chờ sếp** | AC-03 không thể đóng nếu không có dev DB: migration g0_baseline đã xác nhận add-only + `prisma validate` pass (an toàn về SQL), nhưng chưa chạy `migrate deploy` thật trên môi trường sạch. Action sếp: tạo Neon branch dev + thêm `DATABASE_URL_DEV` vào `.env` local. Khi có env: Tier 2 round 2 chạy migrate deploy trên dev branch + seed 2 lần (đóng AC-03 + AC-06 runtime) → mở re-audit. Trong lúc chờ: AC-03, AC-06 giữ PARTIAL. | Sếp | Trước khi đóng Phase 0 |
| **AUD-003** | P3 | **ACCEPT_RISK** | Hardcode data + inline style trong `app/job-board/page.tsx` là chấp nhận được cho demo A-04 (Phase 0 non-goal: "KHÔNG UI nghiệp vụ mới ngoài job-board"). Backlog chính thức: **Phase 4** refactor — query thật từ DB (`Project`/`StaffingOrder` isPublic) + style về `_assets/hrp.css`. Ghi vào TASK Phase 4 khi lập. | Planner | Phase 4 |
| **AUD-004** | P3 | **WAIT_FOUNDER** | `docs/CONTRACT_BCC.md` tồn tại, khớp model `PortalTimesheet`. Action sếp: review + ký xác nhận Freeze. AC-09 đóng khi có chữ ký. | Sếp | Trước khi đóng Phase 0 |
| **AUD-005** | P3 | **CLOSED — Planner tự verify 16/08** | `/`, `/bcc`, `/job-board` đều 200 production → deploy Vercel xanh, AC-05 đủ runtime evidence. `/docs` 404 là **hiện trạng đúng**: repo không có site docs (docs/ là thư mục .md nội bộ, không route, không index.html) — URL matrix trong TASK ghi nhầm, Planner sửa TASK v1.1 (bỏ `/docs` khỏi matrix). Không cần Tier 2 round 2 cho phần này. | Planner (tôi) | Xong 16/08 |

## 3. Verdict Planner sau Round 1

**Duy trì `CONDITIONAL`** với chính xác 2 gate còn lại — đều thuộc sếp:

1. **GATE-1**: sếp ký `docs/CONTRACT_BCC.md` (Freeze) → đóng AC-09 (AUD-004).
2. **GATE-2**: sếp tạo Neon dev branch + cấp `DATABASE_URL_DEV` → Tier 2 round 2 migrate+seed → đóng AC-03/AC-06 runtime (AUD-002).

Sau 2 gate: mở **Tier 3 re-audit Round 2** (chạy lại AC-03, AC-05 runtime, AC-06, AC-09) → PASS → đóng Phase 0, chuyển Phase 1.

**Không cần giao sửa code nào cho Tier 2 lúc này** (workspaces đã xử bằng DEC-30, deploy đã xanh).

## 4. Phân công tiếp theo (route qua file này)

| Việc | Ai | Khi |
|---|---|---|
| Tạo Neon branch dev + ghi `DATABASE_URL_DEV` vào `.env` local (không commit .env) | Sếp | Khi thuận tiện |
| Review + ký `docs/CONTRACT_BCC.md` | Sếp | Khi thuận tiện |
| Tier 2 round 2: `prisma migrate deploy` lên dev branch + seed 2 lần idempotent + cập nhật HANDOFF §5 (chỉ 2 việc này, tham chiếu PLANNER-DECISION này) | Orchestrator spawn sau khi sếp xong 2 gate | Sau GATE-2 |
| Tier 3 re-audit Round 2 (AC-03, AC-05 runtime, AC-06, AC-09) | Tier 3 | Sau round 2 |
| Đóng Phase 0 PASS + cập nhật Revision Log | Tier 1 (tôi) | Sau re-audit PASS |

## 5. DEC mới phát sinh

| ID | Quyết định | Nội dung chốt | Nguồn |
|---|---|---|---|
| **DEC-30** | Paths-based monorepo | Giai đoạn source-only (3 package hiện tại): monorepo hiện thực bằng tsconfig paths (`@hrp/*` → `packages/*/src/index.ts`), **không dùng npm workspaces** — đã chứng minh build local + Vercel xanh. Bổ sung `workspaces` khi package đầu tiên cần install dependency riêng (ra DEC mới lúc đó). | AUDIT Round 1 — AUD-001 |
| **DEC-31** | Drift recovery g0_baseline + canonical hóa index lookup | Bảng `portal_timesheets` trên DB thật đã tồn tại **đúng 13 cột** (khớp schema.prisma — Planner tự diff: chỉ dư 1 index `idx_timesheets_lookup`). Index đó nằm trên `(employee_code, project, period_month, period_year)` — **chính là key upsert R-21** trong CONTRACT_BCC §5.2 → **giữ, khai báo vào schema.prisma** (`@@index`, name giữ nguyên). Migration `g0_baseline` (chưa applied ở bất kỳ DB nào) sửa sang **`IF NOT EXISTS`** + bổ sung CREATE INDEX lookup. KHÔNG drop bất kỳ object nào. | Survey Planner 16/08 (diff + pg_indexes) |

## 6. Resolution Round 2 — BLK-04 (drift) · 16/08

Tier 2 round 2 báo cáo: **AC-06 PASS** (seed 2 lần exit 0 trên dev branch), **AC-09 PASS** (contract FREEZE `42a475f`), **AC-03 BLOCKED** — `migrate deploy` fail P3018: bảng `portal_timesheets` đã tồn tại trên dev branch (kế thừa state từ main — bảng được tạo ngoài migration history).

Planner tự khảo sát (read-only, chỉ trỏ dev branch):
- `migrate diff` dev DB vs `schema.prisma` = đúng 1 dòng `DROP INDEX "idx_timesheets_lookup"` → bảng khớp hoàn toàn schema, không thiếu cột.
- `pg_indexes` cho thấy `idx_timesheets_lookup` trên `(employee_code, project, period_month, period_year)` = key định danh upsert R-21 (CONTRACT_BCC §5.2) → index của appBCC, **giữ lại**.

Quyết định (DEC-31): không drop index; khai báo vào schema.prisma; `g0_baseline` chuyển `IF NOT EXISTS` (an toàn — chưa applied ở bất kỳ DB nào) + bổ sung index lookup. **Tiêu chí AC-03 PASS**: `migrate deploy` exit 0 trên dev branch + `migrate diff` dev vs schema ra **rỗng hoàn toàn (0 dòng)**.

Route: `PROMPT_TIER2_R3.md` → Tier 2 round 3 thực hiện (sửa schema + migration + verify). Sau đó mở Tier 3 re-audit Round 2.

## 7. Resolution Round 3 — P3009 (failed migration record) · 16/08

Tier 2 round 3: sửa schema + migration xong (commit `552b623`, validate PASS; DEV-06 ghi nhận — `@@index` dùng tên field camelCase `[employeeCode, project, periodMonth, periodYear]`, SQL sinh ra tương đương, chấp nhận). **Diff dev DB vs schema = 0 DDL** — DB khớp canonical 100%.

Nhưng deploy vẫn bị chặn bởi **P3009**: bản ghi `g0_baseline` trạng thái failed (từ lần P3018 ở round 2) nằm trong `_prisma_migrations` của dev branch — Prisma không tự chạy lại failed migration.

Quyết định (Planner): **phương án (A)** — `prisma migrate resolve --rolled-back 20260816010542_g0_baseline` trên dev branch, rồi `migrate deploy` lại. Lý do: migration đã sửa `IF NOT EXISTS` sẽ được **thực thi thật sự** (no-op trên dev vì state đã khớp) — history phản ánh đúng "migration này đã chạy", không đánh dấu suông như phương án (B). `resolve --rolled-back` chỉ xóa failed record (SQL round 2 đã rollback hoàn toàn trong transaction — không để lại gì), an toàn trên dev branch.

Ghi nhận cho tương lai: production main có thể gặp state tương tự khi deploy Phase 1 (bảng tồn tại ngoài migration history) — sẽ xử bằng đúng quy trình DEC-31 + resolve này, sau khi khảo sát read-only. Planner sẽ ra DEC riêng lúc đó.

Route: `PROMPT_TIER2_R4.md` → Tier 2 round 4 (resolve + deploy + diff + seed confirm + HANDOFF).

## 8. Resolution Round 4 — Re-audit PASS · 16/08

Tier 3 re-audit Round 2 (AUDIT.md section Round 2): **PASS — 10/10 AC, 0 P0/P1**. 2 ghi chú P3 không chặn:
- **AUD-006** (P3): watermark bản deploy là "DU LIEU MINH HOA" không dấu (mockup S05 có dấu) → gộp backlog Phase 4 cùng AUD-003 (refactor job-board: query DB thật + hrp.css).
- **AUD-007** (P3): untracked harness artifacts tồn tại từ trước task — không cần hành động.

Planner chốt: **Phase 0 đạt DoD kỹ thuật**. Exit gate cuối = sếp duyệt demo https://hrpartner.vn/job-board. Sau "demo OK": đóng Phase 0 → **Phase 1** (D15: rào /bcc JWT tối giản tuần đầu — ưu tiên an ninh vì appBCC đang bơm dữ liệu thật vào Neon).

Backlog Phase 4 chính thức: AUD-003 + AUD-006 (job-board: query DB thật + watermark có dấu + hrp.css), DEV-01…04, AUD-007 (dọn harness artifacts nếu cần).

## 9. Resolution Round 5 — Demo chưa đúng design → sửa ngay · 16/08

Sếp review demo `/job-board` và xác nhận: bản hiện tại là rough demo — Tier 2 dùng inline style tự bịa (primary xanh `#0F4C81`, nền xám lạnh, font system-ui) thay vì design system đã chốt **Warm Professionalism** (`stitch/warm_professionalism/DESIGN.md`: primary `#F26522` G27, nền `#FAF9F7`, Be Vietnam Pro + Inter).

Quyết định (lệnh sếp qua chọn lựa 16/08): **sửa ngay trước khi duyệt demo** — kéo phần UI của AUD-003/AUD-006 từ backlog Phase 4 về Phase 0:
- TASK v1.4: thêm **STEP-09 + AC-11** (UI polish theo Warm Professionalism + mockup S05 + header mẫu `stitch/hrp_landing_page_html_standard/code.html`; watermark có dấu; không đổi logic/data).
- Status TASK → `READY_FOR_EXECUTION` — Tier 2 nhận qua `/code` hoặc prompt.
- Sau Tier 3 verify AC-11 → sếp duyệt demo → đóng Phase 0.

## 10. Revision Log

| Ver | Ngày | Thay đổi |
|---|---|---|
| `v1.0` | `2026-08-16` | Khởi tạo — Resolution AUD-001…005 Round 1: DEC-30 (paths-based monorepo), đóng AUD-005 (verify runtime 200), BLOCKED AUD-002 chờ sếp cấp dev DB, WAIT AUD-004 chờ ký contract, ACCEPT_RISK AUD-003 (Phase 4) |
| `v1.1` | `2026-08-16` | Resolution Round 2 (BLK-04 drift): **DEC-31** — g0_baseline `IF NOT EXISTS` + khai báo `idx_timesheets_lookup` vào schema; AC-06/AC-09 PASS; route Tier 2 round 3 qua PROMPT_TIER2_R3 |
| `v1.2` | `2026-08-16` | Resolution Round 3 (P3009 failed record): chọn phương án (A) `resolve --rolled-back` + deploy lại trên dev; diff = 0 DDL đã chứng minh state khớp; route Tier 2 round 4 qua PROMPT_TIER2_R4 |
| `v1.3` | `2026-08-16` | Resolution Round 4: re-audit **PASS 10/10 AC, 0 P0/P1**; chốt DoD kỹ thuật xong; AUD-006/007 + DEV-01…04 → backlog Phase 4; chờ sếp duyệt demo → đóng Phase 0 |
| `v1.4` | `2026-08-16` | Resolution Round 5: lệnh sếp sửa UI ngay — thêm STEP-09 + AC-11 vào TASK v1.4, Status READY_FOR_EXECUTION; kéo UI AUD-003/006 từ Phase 4 về Phase 0 |
