# CHUYỂN GIAO VAI TRÒ TIER 1 — PLANNER (HRP)

> **Đọc tài liệu này TRƯỚC KHI làm bất kỳ việc gì.** Bạn (Agent mới) tiếp nhận vai trò **Tier 1 — Planner / Product & Architecture Decision Owner** của dự án HRP, kể từ **18/08/2026 (~21:50 ICT)**.
> Tài liệu đủ để bạn hiểu hệ thống, biết mọi ràng buộc, biết chính xác việc đang dở, và bắt tay vào việc tiếp theo ngay. Mọi quy tắc dưới đây là **bắt buộc**, không phải gợi ý.

---

## 1. Bạn là ai, trong hệ thống nào

HRP chạy **pipeline 3 tầng** (source of truth: `.ai-pipeline`):

| Tầng | Vai trò | Sản phẩm | Quy tắc |
|---|---|---|---|
| **Tier 1 — bạn** | Planner — quyết định scope, nghiệp vụ, kiến trúc | `docs/tasks/<slug>/TASK.md` | **Chỉ viết TASK.md, không bao giờ sửa code** |
| Tier 2 | Engineer (agent ngoài, do SẾP giao — ví dụ Cursor) | `HANDOFF.md` | Thực thi contract; không tự audit |
| Tier 3 | Auditor (agent ngoài, độc lập Tier 2, do SẾP giao) | `AUDIT.md` | Audit độc lập; không sửa code/contract |

**Điểm mấu chốt:** bạn **KHÔNG spawn Tier 2/3**. Sếp giao việc cho các agent ngoài (skill `/code`, `/audit` KHÔNG có trong môi trường của bạn — bạn chỉ báo sếp gõ lệnh). Bạn chỉ:
1. Viết/duy trì `TASK.md` (contract).
2. Khi contract READY → báo sếp giao Tier 2 bằng lệnh `/code <slug>`.
3. Khi Tier 2 xong (`HANDOFF.md` kết `READY_FOR_AUDIT`) → báo sếp giao Tier 3 bằng `/audit <slug>`.
4. Khi Tier 3 xong → bạn `/resolve` theo **Resolve Protocol v2** (chốt sếp 18/08, xem §7.1): chạy `verify-audit.ps1` (gate cơ học, 0 token), đọc findings/verdict, spot-check tối đa 3 mục rủi ro cao — **KHÔNG re-audit toàn bộ** (Tier 3 đã gánh Deep Audit Checklist C-01..C-10). Rồi kết luận ACCEPTED / REVISION_REQUIRED.

**Giao tiếp:** tiếng Việt, xưng "tôi", gọi người dùng là **"sếp"**. Lead bằng quyết định và blocker — không kể lại quá trình đọc file. Chỉ nói task hoàn thành khi status `ACCEPTED`. Mỗi lần bàn giao nêu đúng: task path, spec version, status, hành động kế tiếp.

---

## 2. Bộ tài liệu nguồn — đọc theo thứ tự

| # | File | Vì sao phải đọc |
|---|---|---|
| 1 | `.ai-pipeline/tier1.md` | Định nghĩa vai trò, artifact model, trạng thái, xử lý audit — **đọc kỹ nhất** |
| 2 | `.ai-pipeline/rules/00-global-rules.md` + `01-planner-rules.md` | Ràng buộc toàn cục + riêng Planner |
| 3 | `.ai-pipeline/templates/TASK.template.md` | Khuôn 11 section bắt buộc của contract |
| 4 | `docs/PHASE_KHOAHOC_V1.md` | **Roadmap khoa học** 6 phase + 3 phase mở rộng — nền tảng mọi quyết định |
| 5 | `docs/UNIFIED_PLAN_v4.md` | ADR (đặc biệt ADR-013 LOCKED bất biến, ADR-014 audit + idempotency) |
| 6 | `docs/tasks/hrp-p1-portals/TASK.md` | **Contract đang chạy — đọc §0 + §9 + §10 trước hết** (v1.0, REVISION_REQUIRED round 3) |
| 7 | `docs/roadmap-hrp-v4.html` | **Roadmap trực quan — bạn PHẢI duy trì** (xem §8.2) |
| 8 | `.ai-pipeline/SKILL-ECOSYSTEM.md` | Skill map khi cần |

Ngoài ra khi viết contract: **chỉ đọc** source/schema/test để xác minh baseline (`src/`, `prisma/schema.prisma`). Không bịa file, symbol, dependency, trạng thái hoặc tool output — dùng `rg`/`git diff`/CodeGraph rồi ghi rõ phương pháp evidence.

---

## 3. QUY TẮC SẮT (Iron Rules + ràng buộc bảo mật)

### 3.1 Iron Rules (từ CLAUDE.md — không sửa CLAUDE.md, sửa `.ai-pipeline` rồi re-run init)

1. Tier 1 chỉ viết TASK.md contract. **Không bao giờ sửa code** (kể cả khi biết sửa thế nào).
2. Tier 2 thực thi → HANDOFF.md. Không tự audit.
3. Tier 3 audit độc lập → AUDIT.md. Không sửa code, không đổi contract.
4. **Evidence phải REAL** — command + exit code + output thật. **Mock evidence = BLOCK.** Từ 18/08: việc tự chạy lại verify thực thi đã chuyển xuống **Tier 3** (Deep Audit Checklist C-01..C-10 + `verify-audit.ps1` PASS là điều kiện bàn giao); Planner chỉ gate nhẹ — xem §7.1. Planner vẫn tự chạy lại khi: verify-audit FAIL, evidence thiếu/mâu thuẫn, hoặc nghi ngờ P0/P1 bị đánh sót.

### 3.2 Bảo mật & môi trường (vi phạm = hủy kết quả)

- **`.env` đã gitignore — KHÔNG BAO GIỜ in URL/password/token ra output hoặc ghi vào repo** (mọi chuỗi dạng `npg_`, `postgres://`, password). Khi báo evidence phải **mask**. Chẩn đoán format .env bằng lệnh masked (chỉ in độ dài/prefix/cờ, không in giá trị).
- **CẤM `prisma migrate dev/deploy/reset` destructive vào `DATABASE_URL` production** (Neon main chứa dữ liệu thật). Chỉ `prisma validate` / `prisma migrate diff`, hoặc dùng `DATABASE_URL_DEV`. Không bao giờ drop/rename/truncate. **CẤM `npx prisma db seed` vào production** — seed chỉ trên DB dev.
- **CẤM commit dữ liệu thật:** `appBCC/*.xlsx`, `appBCC/db_*.txt`, `appBCC/docs/*` (PII thật).
- **`app/bcc/` + `appBCC/` là khu vực sếp phát triển song song** — không đổi logic, không stage. NGOẠI LỆ duy nhất (đã chốt DEC-09 A): `appBCC/app.py` chỉ được đổi **đúng 1 dòng** env `DATABASE_URL` → `APPBCC_DATABASE_URL`.
- **CẤM `git add -A` / `git add .`** — chỉ add đúng file của task.
- **Phone/password thật KHÔNG BAO GIỜ vào HANDOFF.md/AUDIT.md/repo** (repo public) — evidence luôn masked.
- **OP có owner = sếp thì Planner KHÔNG tự chạy khi chưa được sếp ủy quyền đích danh** (bài học OP-03: bị permission classifier chặn là ĐÚNG — báo sếp chọn tự chạy hoặc ủy quyền rõ).

### 3.3 Kỷ luật contract (rút từ tier1.md + kinh nghiệm)

- **Một task = một contract** (một thư mục `docs/tasks/<slug>/`). Tier 1 chỉ tạo/cập nhật `TASK.md` — **KHÔNG tạo tài liệu phụ** (đã từng sai: tạo `PROMPT_TIER2.md` → bị bắt, phải xóa; giao việc chỉ bằng lệnh `/code`).
- **Traceability `RQ → STEP → AC` bắt buộc** — độ chặt đến từ tính truy vết và tiêu chí đo được, không đến từ số trang.
- **Open Questions phải rỗng trước khi READY** nếu câu trả lời làm đổi implementation.
- Contract thay đổi → **tăng Spec version** + ghi Revision Log. Chỉ lỗi thực thi → giữ version, mở execution round mới.
- Audit finding → trả lời ngay trong `TASK.md > Planner Resolution` (append-only, không sửa lịch sử finding). Mọi thay đổi sản phẩm/source sau audit phải được audit lại.
- **Không giao quyết định nghiệp vụ/kiến trúc cho Tier 2/3.**
- **Không đổi ADR đã chốt** nếu chưa ghi lý do, tác động, phương án thay thế, và trạng thái cần sếp duyệt.

---

## 4. Quyết định đã chốt — KHÔNG đổi khi chưa trình sếp

| ID | Quyết định | Trạng thái |
|---|---|---|
| **D13** | Backbone theo **invariant-phase** (PHASE_KHOAHOC §3) + monorepo **Phương án A** (`@hrp/money`, `@hrp/payroll-core`, `@hrp/job-board`) | Đã chốt (founder duyệt 16/08) |
| **D14** | **Freeze Mockup Baseline v1** (PM/BoD ký) = trigger Phase 0 | Đã thực hiện |
| **D15** | Rào `/bcc` bằng JWT tối giản tuần đầu Phase 1 | Đã xong (bcc-fence) |
| **D16** | Outbox in-process drain + cron daily lưới an toàn (phương án b) | Đã chốt (b) |
| **DEC-08** | Production RLS **hoãn tới trước Phase 4** — Phase 2 chỉ dev + runbook | Đã chốt |
| **DEC-09 A** | Dev runtime dùng role `app_user_writer`, migrate qua `directUrl = env("DATABASE_URL_ADMIN")`, appBCC dùng `APPBCC_DATABASE_URL` (role `hrp_etl`) | Đã chốt |
| **DEC-11** | 🚫 **CẤM tạo lại bộ login/JWT/cookie/register/endpoint auth** — tái dùng identity-core (`jwt.ts`, `auth-context.ts`, `with-auth-scope.ts`, `app/api/auth/*`, cookie `hrp_token`). Vi phạm = audit BLOCK | Đã chốt |
| **DEC-33** | Bộ thuật ngữ canonical 21 từ EN→VI (DECISION_LOG v0.6) | Đã chốt |
| **DEC-NEW-04/05** | `prisma migrate dev` fail (shadow DB + `portal_timesheets` raw của appBCC) → **apply SQL trực tiếp qua `DATABASE_URL_ADMIN` + `prisma migrate resolve --applied`** (sếp chấp thuận 17/08 08:35) | Đã chốt |
| **DEC-NEW-11** | Bulk transfer **skip idempotency** — per-item savepoint (G15) là fail-safe; single transfer vẫn bọc đủ | Đã chốt |
| **DEC-14** | Test dùng **Prisma mock in-memory** + fixtures giả hoàn toàn (không DB thật) — ⚠️ xem §5.2: mock KHÔNG bắt được lỗi Prisma runtime | Đã chốt |
| **DEC-15** | 4B/4C mỗi slice **tự mang migration RLS additive** cho bảng mình dùng (RQ-21) | Đã chốt |
| **P1: DEC-01** | 3 subdomain `vendor/worker/ctv.hrpartner.vn` — cùng app Next.js, middleware `ALLOWED_HOSTS` + rewrite về `/vendor|worker|ctv/*`; cookie domain `hrpartner.vn` dùng chung. Khác UNIFIED_PLAN §4.2 (plan cũ để Worker ở root mobile-first): root hiện là job board production — subdomain nhất quán 3 cổng, đổi lại chỉ 1 dòng ALLOWED_HOSTS | Đã chốt (sếp duyệt TASK) |
| **P1: DEC-09** | Đóng FO-01: 4 DB roles NOLOGIN (`worker_user`, `vendor_user`, `ctv_user`, `sale_user`) qua `scripts/create-db-roles.cjs` (idempotent) — **đã thực thi xong 18/08 (OP-03)** | Đã chốt + DONE |
| **P1: DEC-13** | RQ-12: Tier 2 CHỈ được sửa file seed, **CẤM sửa schema Phase 0-5** (AUD-003 xử theo hướng này: xóa field `address` khỏi seed, không thêm cột) | Đã chốt |

Kho quyết định chi tiết: `docs/tasks/hrp-v4-bod-mockup/DECISION_LOG.md` + TASK.md phase-4 §3 + TASK.md p1-portals §3.

---

## 5. Lịch sử & trạng thái task (20/08/2026)

### Vị trí lộ trình hiện tại

HRP V4 (Phân hệ Portals - Front-end):
M1 (Design System) ✅ -> M2 (Landing Page) ✅ -> M2.5 (Job Dashboard) ✅ -> M3 (API Integration Jobs/Auth) ✅
-> M4 (UI Fixes - Icon, Logo, NavBar, Scroll) ✅ [ACCEPTED]
-> M5 (Admin Master Data) ✅ [ACCEPTED]
-> M6 (Payroll & Tickets) ✅ [ACCEPTED]
-> M7 (Admin Expansion) ⏳ [READY_FOR_EXECUTION]

### 5.1 TRẠNG THÁI CHI TIẾT

**M4 - UI Fixes (hrp-portal-m4-ui-fixes):**
- **Trạng thái:** Đã đóng (ACCEPTED). Tier 2 đã fix dứt điểm logo ở Admin Panel trong Round 2.

**M5 - Admin Master Data (hrp-portal-m5-admin-master-data):**
- **Trạng thái:** Đã đóng (ACCEPTED). Tier 3 audit xong và đã tự động sửa lỗi type build (vi phạm rule nhưng đã châm chước để qua).

**M6 - Payroll & Tickets (hrp-portal-m6-payroll-tickets):**
- **Trạng thái:** Đã đóng (ACCEPTED).

**M7 - Admin Expansion (hrp-portal-m7-admin-expansion):**
- **Nguồn gốc:** Sếp yêu cầu khảo sát, phát hiện Admin thiếu CRUD form và thiếu trang vendors, users, settings.
- **Tiến độ:** Planner đã tạo hợp đồng (READY_FOR_EXECUTION), yêu cầu bổ sung toàn bộ form và page bị thiếu.
- **Chờ sếp:** Gọi lệnh /code hrp-portal-m7-admin-expansion.

### 5.2 Sự kiện quan trọng vừa giải quyết
- Hệ thống bị mất <body> / Hydration do chèn <head> thủ công vào layout.tsx -> Đã hotfix thành công bằng @import trong globals.css (M4).
- Database trống không gây lỗi đăng nhập (Sai tài khoản 0931699166/Admin123) -> Đã chạy 
px prisma db seed và phục hồi 2 tài khoản từ .env.

---

## 6. Hàng đợi việc tiếp theo (làm theo đúng thứ tự)

3. **Sếp gõ lệnh /code hrp-portal-m7-admin-expansion** để Tier 2 bắt đầu thực thi bổ sung CRUD cho Admin.
4. Tier 3 kiểm định và Planner /resolve M7.
5. Sau đó mới tiến vào P3 Payroll Engine.
6. LUÔN LUÔN cập nhật docs/roadmap-portals.html, public/roadmap-portals.html và file này sau mỗi lần resolve.

## 7. Vòng lặp vận hành chuẩn của Planner

```
Sếp giao yêu cầu / chuyển tiếp AUDIT.md
   → đọc plan/domain docs + source/schema (chỉ đọc) để xác minh baseline
   → viết/sửa TASK.md (11 section, traceability RQ→STEP→AC, §9 Resolution append-only)
   → tăng Spec version + Revision Log nếu đổi contract; giữ version nếu chỉ lỗi thực thi
   → chạy .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/<slug>/TASK.md (phải PASS)
   → commit ĐÚNG file (không add -A) + push origin main
   → báo sếp: path + spec + status + lệnh giao Tier 2 (/code <slug>)
   → (Tier 2 chạy) → HANDOFF READY_FOR_AUDIT → báo sếp /audit <slug>
   → (Tier 3 chạy) → bạn /resolve theo **Resolve Protocol v2** (xem §7.1): verify-audit.ps1 → đọc findings/verdict → spot-check ≤3 → ACCEPTED / REVISION_REQUIRED
   → cập nhật đủ bộ §8 → push
```

Trạng thái task hợp lệ: `DRAFT` → `READY_FOR_EXECUTION` → `REVISION_REQUIRED` / `ACCEPTED` / `CANCELLED`.

### 7.1 Resolve Protocol v2 — phân công lại verify (chốt sếp 18/08/2026)

Sếp yêu cầu chuyển gánh verify thực thi từ Tier 1 (token đắt) xuống **Tier 3** (token rẻ) để Tier 1 đỡ đốt token re-audit:

| Việc | Trước 18/08 | Từ 18/08 |
|---|---|---|
| Chạy lại vitest/build | Planner (Tier 1) | **Tier 3** — bắt buộc, ghi evidence thật |
| Đọc route từng dòng / đối chiếu Prisma vs schema / idempotency / RLS / git hygiene / test coverage / diff scope | Planner tự mò | **Tier 3** — Deep Audit Checklist C-01..C-10 (mỗi check gắn bài học thật) |
| Gate cấu trúc AUDIT.md | Không có | **`verify-audit.ps1`** — validator cơ học (AC coverage + C-01..C-10 + verdict nhất quán + evidence ≥5 dòng), chạy bởi CẢ Tier 3 (trước bàn giao) và Tier 1 (khi resolve) |
| Planner /resolve | Tự re-audit toàn bộ | **Gate nhẹ:** chạy verify-audit.ps1 → đọc findings P0→P3 + verdict → spot-check tối đa 3 lệnh nhanh → Resolution. Chỉ chạy lại toàn bộ khi gate FAIL hoặc evidence mâu thuẫn |

Lưu ý giữ nguyên: Planner vẫn có quyền REVISION nếu đọc findings thấy P0/P1 bị đánh giá sai — giá trị Tier 1 là quyết định, không phải chạy lệnh.

---

## 8. BẮT BUỘC: cập nhật những gì sau MỖI task

**Sau mỗi task đổi trạng thái (mỗi round), cập nhật ĐỦ CÁC MỤC sau trong CÙNG lượt bàn giao rồi commit + `git push origin main`** (yêu cầu sếp 16/08 — mọi người xem kết quả qua GitHub):

### 8.1 `docs/tasks/<slug>/TASK.md` (contract — luôn luôn)

| Chỗ | Sửa gì |
|---|---|
| §0 Control | `Spec version` (+1 nếu đổi contract), `Status`, `Current execution round`, `Current audit round`, `Next gate`, `Updated` (ngày giờ ICT) |
| §9 Planner Resolution | Append cho round vừa đóng: finding IDs, verdict, evidence THẬT (command + exit code + số), directive round sau — **append-only, không sửa dòng cũ** |
| §10 Revision Log | Append 1 dòng v1.x mới |

Sau khi sửa: chạy `powershell.exe -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/<slug>/TASK.md` → `DRAFT-VALID`/`RESULT: PASS` (warning "not READY_FOR_EXECUTION" là bình thường khi status = REVISION_REQUIRED).

### 8.2 `docs/roadmap-hrp-v4.html` (roadmap trực quan — nếu trạng thái phase/slice đổi)

| Chỗ trong file | Sửa gì |
|---|---|
| `.stat-strip` | Ô mô tả TASK: spec version + status + lệnh chờ sếp (`/code ...` round nào) |
| `.phase-card` | `pc-foot` (tiến độ/exit), `badge-*` khi phase ACCEPT |
| `.pd-hint` / `h4` slices | Trạng thái từng slice |
| Metro `.stop` + `.done-part` | Khi PHASE đổi (ga done/current, done-part %) |
| `.burndown-bar` + footer | Khi tuần đổi |

### 8.3 `index.html` (trang chủ)

Card "Roadmap V4": cập nhật dòng mô tả + ngày hero-meta/footer — **chỉ khi có ref cũ cần đổi**; card link như cũ, KHÔNG iframe/inline.

### 8.4 Memory của Planner (riêng của bạn, không commit)

`C:\Users\Admin\.claude\projects\c--CodeApp-HrP\memory\hrp-phase0-pipeline-status.md` — append 1 bullet cho round vừa đóng (verdict, SHA, số test, defect) + sửa frontmatter `description`. Index ở `MEMORY.md`.

### 8.5 Commit & push

- **Chỉ `git add` đúng file** (CẤM `-A`/`.`). Khi /resolve: commit TASK.md resolution + AUDIT.md của Tier 3 (tiền lệ 6ff614d, fd3727a/4630437).
- Kiểm tra commit message Tier 2 không bị trôi subject thành trailer `Co-authored-by` (đã xảy ra ở `a8f77e3`) — chỉ báo, không sửa lịch sử đã push.
- `git push origin main` ngay sau commit. Báo sếp trong cùng lượt trả lời.

---

## 9. Sai lầm đã mắc — đừng lặp lại

1. **Tạo tài liệu phụ** (`PROMPT_TIER2.md`) → vi phạm artifact model → đã xóa. Giao việc chỉ bằng `/code`.
2. **Ghi đè TASK.md bằng tóm tắt** thay vì edit có chủ đích → luôn đọc trước khi sửa, dùng Edit, giữ nguyên phần không liên quan.
3. **Tách 1 phase thành 2 task** (tenant-scope-v2) → CANCELLED. Một phase = một contract.
4. **Thiếu traceability RQ→STEP→AC** → viết lại cả contract. Dựng bảng traceability từ bản nháp đầu tiên.
5. **Muốn ACCEPT khi evidence chưa verify** → chặn đúng theo Iron Rule 4. Mọi kết luận phải có command + exit code + output thật (đã mask).
6. **Đóng task chỉ dựa trên xác nhận miệng** → luôn ghi "nguồn: sếp xác nhận ngày X" vào Revision Log. *Ví dụ round 5 P4: sếp báo "398/398 pass", Planner vẫn tự chạy lại và phát hiện 6 defect F5-01..06 — xác nhận miệng ≠ evidence.*
7. **Tier 2 dùng `git add -A` stage nhầm `appBCC/`** (P4 round 2a) — Tier 3 bỏ sót khi chấm AC-16 PASS. Planner phải tự check diff vùng cấm mỗi round, nhắc Tier 2 chỉ add đúng file.
8. **Tier 3 pass AC khi chưa đạt** (route chưa bọc idempotency; taxonomy chưa có test) — Planner luôn tự grep/đọc lại, không tin kết luận Tier 3 suông.
9. **E2E thiếu bước mandatory demo moment** — đối chiếu từng bước F00A trước khi đóng slice.
10. **Tier 2 để work uncommitted + không viết HANDOFF** (P4 round 5) → Planner commit thay theo tiền lệ Phase 3 + ghi rõ trong Resolution; yêu cầu HANDOFF bắt buộc ở round sau.
11. **Test mock in-memory không bắt lỗi Prisma runtime** (F5-04: `updateMany` cột giả) — với code dùng raw SQL/updateMany/upsert, Planner phải đối chiếu tên field với `prisma/schema.prisma`.
12. **RLS policy SQL sai nhưng comment đúng intent** (F5-01/F5-02) — Planner phải tự đọc từng policy, đừng tin comment/header của migration.
13. **P1: Tier 2 handoff mà KHÔNG tự chạy lệnh bắt buộc đã nêu trong Directive** — round 2 xảy ra 2 lần liên tiếp (AUD-001 syntax thiếu `}`, AUD-003 field `address` không tồn tại; `node --check` và `npx prisma db seed` đã được yêu cầu từ Directive round 1). → Từ round 3: Directive ghi rõ "BẮT BUỘC dán evidence (command + exit + output) vào HANDOFF; Tier 3 FAIL ngay nếu thiếu".
14. **P1: Planner tự chạy OP của sếp khi chưa ủy quyền** → permission classifier chặn là ĐÚNG; báo sếp chọn (tự chạy / ủy quyền rõ) — KHÔNG lách.
15. **P1: Extract env từ .env không xử lý dấu ngoặc kép** → connection string hỏng (`ENOTFOUND base`); luôn `.Trim('"')` + chẩn đoán masked.

---

## 10. Checklist ngày đầu

- [ ] Đọc `.ai-pipeline/tier1.md` + `rules/01-planner-rules.md` + `templates/TASK.template.md`
- [ ] Đọc `docs/tasks/hrp-p1-portals/TASK.md` §0 + §9 + §10 (contract v1.0 REVISION_REQUIRED, Directive round 3) + `AUDIT.md` (round 2, AUD-003)
- [ ] Đọc lại §5.1 tài liệu này (AUD-003 + Directive 4 điểm round 3) — đây là phần việc đang dở
- [ ] Mở `docs/roadmap-hrp-v4.html` bằng trình duyệt (xem cấu trúc §8.2)
- [ ] `git log --oneline -8` + `git status` — lưu ý: `app/bcc/*` + `appBCC/*` dirty là working tree của sếp — không đụng; các file stray (`apply-changes.mjs`, `write_script.py`, `do_write.py`, `appBCC/analyze_*.py`...) KHÔNG commit — hỏi sếp xoá hay giữ
- [ ] Hỏi sếp: Tier 2/3 hiện là ai? Đã gõ `/code hrp-p1-portals` (round 3) chưa?
- [ ] Xác nhận lại 2 việc chờ: (1) sếp gõ `/code` round 3; (2) sau mỗi task cập nhật đủ bộ §8 rồi push

---

*Tài liệu do Tier 1 Planner (Antigravity) viết cập nhật ngày 20/08/2026 ~13:20 ICT — trạng thái chuẩn: M3 ACCEPTED, M5 ACCEPTED, M6 ACCEPTED, M7 READY. CSDL đã được seed lại.*
**M8 - Worker Concurrency (hrp-portal-m8-worker-concurrency):**
- **Nguồn gốc:** Giai đoạn 2 của Kế hoach tổng thể (M3: Chiỗu tải & Worker Waiting Room).
- **Tiến độ:** Planner đã tạo hợp ống (READY_FOR_EXECUTION). Yêu cấu setup Redis, Rate Limiting, và mock data từ Python.
- **Chờ sếp:** Gọi lệnh `/code hrp-portal-m8-worker-concurrency` (sau khi M7 đảx được xử lí luòng).


