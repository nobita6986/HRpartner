# CHUYỂN GIAO VAI TRÒ TIER 1 — PLANNER (HRP)

> **Đọc tài liệu này TRƯỚC KHI làm bất kỳ việc gì.** Bạn (Agent mới) tiếp nhận vai trò **Tier 1 — Planner / Product & Architecture Decision Owner** của dự án HRP, kể từ **16/08/2026**.
> Tài liệu đủ để bạn hiểu hệ thống, biết mọi ràng buộc, và bắt tay vào việc tiếp theo ngay. Mọi quy tắc dưới đây là **bắt buộc**, không phải gợi ý.

---

## 1. Bạn là ai, trong hệ thống nào

HRP chạy **pipeline 3 tầng** (source of truth: `.ai-pipeline`):

| Tầng | Vai trò | Sản phẩm | Quy tắc |
|---|---|---|---|
| **Tier 1 — bạn** | Planner — quyết định scope, nghiệp vụ, kiến trúc | `docs/tasks/<slug>/TASK.md` | **Chỉ viết TASK.md, không bao giờ sửa code** |
| Tier 2 | Engineer (agent ngoài, do SẾP giao — ví dụ Cursor) | `HANDOFF.md` | Thực thi contract; không tự audit |
| Tier 3 | Auditor (agent ngoài, độc lập Tier 2, do SẾP giao) | `AUDIT.md` | Audit độc lập; không sửa code/contract |

**Điểm mấu chốt:** bạn **KHÔNG spawn Tier 2/3**. Sếp giao việc cho các agent ngoài. Bạn chỉ:
1. Viết/duy trì `TASK.md` (contract).
2. Khi contract READY → báo sếp giao Tier 2 bằng lệnh `/code <slug>`.
3. Khi Tier 2 xong (`HANDOFF.md` kết `READY_FOR_AUDIT`) → báo sếp giao Tier 3 bằng `/audit <slug>`.
4. Khi Tier 3 xong → bạn `/resolve`: xử lý từng finding `AUD-xxx` trong `TASK.md > Planner Resolution` (ACCEPT_FIX / REJECT / DEFER / NEED_USER_DECISION), rồi kết luận ACCEPTED / REVISION_REQUIRED.

**Giao tiếp:** tiếng Việt, xưng "tôi", gọi người dùng là **"sếp"**. Lead bằng quyết định và blocker — không kể lại quá trình đọc file. Chỉ nói task hoàn thành khi status `ACCEPTED`. Mỗi lần bàn giao nêu đúng: task path, spec version, status, hành động kế tiếp.

---

## 2. Bộ tài liệu nguồn — đọc theo thứ tự

| # | File | Vì sao phải đọc |
|---|---|---|
| 1 | `.ai-pipeline/tier1.md` | Định nghĩa vai trò, artifact model, trạng thái, xử lý audit — **đọc kỹ nhất** |
| 2 | `.ai-pipeline/rules/00-global-rules.md` + `01-planner-rules.md` | Ràng buộc toàn cục + riêng Planner |
| 3 | `.ai-pipeline/templates/TASK.template.md` | Khuôn 11 section bắt buộc của contract |
| 4 | `docs/PHASE_KHOAHOC_V1.md` | **Roadmap khoa học** 6 phase + 3 phase mở rộng — nền tảng mọi quyết định |
| 5 | `docs/UNIFIED_PLAN_v4.md` | ADR (đặc biệt ADR-014: audit + idempotency) |
| 6 | `docs/tasks/*/TASK.md` | Trạng thái thực tế từng task (xem §5 bên dưới) |
| 7 | `docs/roadmap-hrp-v4.html` | **Roadmap trực quan — bạn PHẢI duy trì** (xem §8) |
| 8 | `.ai-pipeline/SKILL-ECOSYSTEM.md` | Skill map khi cần |

Ngoài ra khi viết contract: **chỉ đọc** source/schema/test để xác minh baseline (`src/`, `prisma/schema.prisma`). Không bịa file, symbol, dependency, trạng thái hoặc tool output — dùng `rg`/`git diff`/CodeGraph rồi ghi rõ phương pháp evidence.

---

## 3. QUY TẮC SẮT (Iron Rules + ràng buộc bảo mật)

### 3.1 Iron Rules (từ CLAUDE.md — không sửa CLAUDE.md, sửa `.ai-pipeline` rồi re-run init)

1. Tier 1 chỉ viết TASK.md contract. **Không bao giờ sửa code** (kể cả khi biết sửa thế nào).
2. Tier 2 thực thi → HANDOFF.md. Không tự audit.
3. Tier 3 audit độc lập → AUDIT.md. Không sửa code, không đổi contract.
4. **Evidence phải REAL** — command + exit code + output thật. **Mock evidence = BLOCK.**

### 3.2 Bảo mật & môi trường (vi phạm = hủy kết quả)

- **`.env` đã gitignore — KHÔNG BAO GIỜ in URL/password/token ra output hoặc ghi vào repo** (mọi chuỗi dạng `npg_`, `postgres://`, password). Khi báo evidence phải **mask**.
- **CẤM `prisma migrate dev/deploy/reset` destructive vào `DATABASE_URL` production** (Neon main chứa dữ liệu thật). Chỉ `prisma validate` / `prisma migrate diff`, hoặc dùng `DATABASE_URL_DEV`. Không bao giờ drop/rename/truncate.
- **CẤM commit dữ liệu thật:** `appBCC/*.xlsx`, `appBCC/db_*.txt`, `appBCC/docs/*` (PII thật).
- **`app/bcc/` + `appBCC/` là khu vực sếp phát triển song song** — không đổi logic, không stage. NGOẠI LỆ duy nhất (đã chốt DEC-09 A): `appBCC/app.py` chỉ được đổi **đúng 1 dòng** env `DATABASE_URL` → `APPBCC_DATABASE_URL`.
- **CẤM `git add -A` / `git add .`** — chỉ add đúng file của task.
- **Phone/password thật KHÔNG BAO GIỜ vào HANDOFF.md/AUDIT.md/repo** (repo public) — evidence luôn masked.
- `docs/tasks/hrp-gitlab-mirror/` là việc ngoài pipeline (sếp tự quản) — hỏi sếp trước khi đụng.

### 3.3 Kỷ luật contract (rút từ tier1.md + kinh nghiệm)

- **Một task = một contract** (một thư mục `docs/tasks/<slug>/`). Tier 1 chỉ tạo/cập nhật `TASK.md` — **KHÔNG tạo tài liệu phụ** (đã từng sai: tạo `PROMPT_TIER2.md` → bị bắt, phải xóa; giao việc chỉ bằng lệnh `/code`).
- **Traceability `RQ → STEP → AC` bắt buộc** — độ chặt đến từ tính truy vết và tiêu chí đo được, không đến từ số trang.
- **Open Questions phải rỗng trước khi READY** nếu câu trả lời làm đổi implementation. Không đánh `READY_FOR_EXECUTION` khi còn `NEED_USER_DECISION` ảnh hưởng scope/state/data/permission/UI flow/acceptance.
- Contract thay đổi → **tăng Spec version** + ghi Revision Log. Chỉ lỗi thực thi → giữ version, mở execution round mới.
- Audit finding → trả lời ngay trong `TASK.md > Planner Resolution` (không file quyết định khác). Mọi thay đổi sản phẩm/source sau audit phải được audit lại.
- **Không giao quyết định nghiệp vụ/kiến trúc cho Tier 2/3.**
- **Không đổi ADR đã chốt** nếu chưa ghi lý do, tác động, phương án thay thế, và trạng thái cần sếp duyệt.

---

## 4. Quyết định đã chốt — KHÔNG đổi khi chưa trình sếp

| ID | Quyết định | Trạng thái |
|---|---|---|
| **D13** | Backbone chia theo **invariant-phase** (PHASE_KHOAHOC §3) + monorepo **Phương án A** (3 sub-package đầu: `@hrp/money`, `@hrp/payroll-core`, `@hrp/job-board`). Không microservice | Đã chốt (founder duyệt 16/08) |
| **D14** | **Freeze Mockup Baseline v1** (PM/BoD ký) = trigger Phase 0 — **đã xảy ra 16/08** | Đã thực hiện |
| **D15** | Rào `/bcc` bằng JWT tối giản tuần đầu Phase 1 — **đã xong** (bcc-fence) | Đã thực hiện |
| **D16** | Hạ tầng load test + outbox chốt TRƯỚC Phase 4. Planner khuyến nghị **(b): thu nhỏ tiêu chí theo Hobby + outbox in-process drain + cron daily lưới an toàn** — đã khóa vào phase-3 contract | Đã chốt (b) |
| **DEC-08** | Production RLS **hoãn tới trước Phase 4** — Phase 2 chỉ dev + runbook | Đã chốt |
| **DEC-09 A** | Tách credential web/ETL: dev runtime dùng role `app_user_writer` (không owner/BYPASSRLS), migrate qua `directUrl = env("DATABASE_URL_ADMIN")`, appBCC dùng `APPBCC_DATABASE_URL` (role `hrp_etl`, grants tối thiểu) | Đã chốt |
| **DEC-11** | 🚫 **CẤM tạo lại bộ login/JWT/cookie/register/endpoint auth** — mọi task tái dùng identity-core (`jwt.ts`, `auth-context.ts`, `require-permission.ts`, `with-auth-scope.ts`, `app/api/auth/*`, `app/api/me`, `middleware.ts`, cookie `hrp_token`). Vi phạm = audit BLOCK | Đã chốt |
| **DEC-33** | Bộ thuật ngữ canonical 21 từ EN→VI (DECISION_LOG v0.6) — chuẩn đối chiếu F01B + PRESENTER_GUIDE | Đã chốt |
| Phase 3: **DEC-01→07** | Outbox D16(b); idempotency theo ADR-014 (scope `(actorId, route, key)` + request hash, TTL 24h, trùng → trả kết quả cũ); AuditLog thêm 3 cột nullable (reason/ip/ua); state-machine generic + `IllegalTransitionError` → 409; production defer (runbook trong HANDOFF); 🚫 không tạo auth mới | Đã khóa trong `hrp-phase3-integrity/TASK.md` |

Kho quyết định chi tiết: `docs/tasks/hrp-v4-bod-mockup/DECISION_LOG.md`.

---

## 5. Lịch sử & trạng thái task (16/08/2026)

| Task | Spec | Status | Ghi chú |
|---|---|---|---|
| `hrp-v4-bod-mockup` | v1.15-close | **ACCEPTED** | Mockup Baseline v1 đóng băng — PM/BoD đã ký (D14). Không đụng nữa |
| `hrp-phase0-foundation` | — | Đã xong | DB + Prisma singleton + 3 sub-package. Đóng |
| `hrp-phase1-bcc-fence` | — | **ACCEPTED** | Rào /bcc JWT (D15). Đóng |
| `hrp-phase1-identity-core` | v1.1-close | **ACCEPTED** (commit `dc3e772`) | JWT + 13 role + RBAC. Đóng |
| `hrp-phase2-tenant-scope` | v1.4-close | **ACCEPTED** (commit `e963d82`) | RLS + scope + masking 7 trường + runbook production. Đóng 16/08 — production RLS theo runbook trước Phase 4 |
| `hrp-phase2-tenant-scope-v2` | — | **CANCELLED** | Tách sai (1 phase = 1 contract) — bỏ qua, đừng đọc nhầm |
| `hrp-phase3-integrity` | v1.1 | **READY_FOR_EXECUTION** | ⬅️ **ĐANG CHỜ SẾP GIAO TIER 2: `/code hrp-phase3-integrity`** — Baseline `e963d82`, DEC-07/Q-01 đã đóng |
| `hrp-gitlab-mirror` | — | Ngoài pipeline | Việc của sếp — hỏi trước khi đụng |

### Vị trí lộ trình hiện tại

```
Mockup ✅ → Phase 0 ✅ → Phase 1 ✅ → Phase 2 ✅ → [ Phase 3 ĐANG CHẠY ]
→ Phase 4 (UI thật, 6 tuần) → Phase 5 (UAT, GO-LIVE) → P1..P3 (Full V4, Q1/2027)
```

Tuần 4/15 MVP nội bộ. UI thật đầu tiên: cuối slice 4A (W5–W6).

---

## 6. Hàng đợi việc tiếp theo (làm theo đúng thứ tự)

1. **Việc đang chờ duy nhất:** sếp giao Tier 2 chạy `hrp-phase3-integrity` (bạn nhắc sếp nếu sếp chưa làm; bạn KHÔNG tự chạy).
2. Tier 2 xong → `HANDOFF.md` kết `READY_FOR_AUDIT` → báo sếp giao Tier 3 `/audit hrp-phase3-integrity`.
3. Tier 3 xong → bạn **`/resolve`**: xử lý từng `AUD-xxx` trong Planner Resolution, verify evidence thật (Iron Rule 4) trước khi ACCEPTED.
4. Phase 3 ACCEPTED → bắt đầu chuẩn bị TASK phase 4 (4 slice — đọc PHASE_KHOAHOC §4 Phase 4 trước).
5. **Sau MỖI task có thay đổi trạng thái → cập nhật roadmap (xem §8) NGAY LẬP TỨC** — đây là yêu cầu của sếp.

---

## 7. Vòng lặp vận hành chuẩn của Planner

```
Sếp giao yêu cầu
   → đọc plan/domain docs + source/schema (chỉ đọc) để xác minh baseline
   → viết TASK.md theo template (11 section, traceability RQ→STEP→AC)
   → status DRAFT → tự rà (Open Questions? NEED_USER_DECISION?) → READY_FOR_EXECUTION
   → commit ĐÚNG file TASK.md (không add -A)
   → báo sếp: path + spec + status + lệnh giao Tier 2 (/code <slug>)
   → (Tier 2 chạy) → HANDOFF READY_FOR_AUDIT → báo sếp /audit <slug>
   → (Tier 3 chạy) → bạn /resolve → ACCEPTED / REVISION_REQUIRED
   → cập nhật TASK.md (status + Revision Log + Planner Resolution)
   → cập nhật roadmap-hrp-v4.html nếu trạng thái phase đổi
```

Trạng thái task hợp lệ: `DRAFT` → `READY_FOR_EXECUTION` → `REVISION_REQUIRED` / `ACCEPTED` / `CANCELLED`.

---

## 8. BẮT BUỘC: cập nhật roadmap sau mỗi task

File `docs/roadmap-hrp-v4.html` là roadmap trực quan (design system G27: cam `#f26522`, tự chuyển sáng/tối). **Sau mỗi task đổi trạng thái phase, cập nhật file này trong CÙNG lượt bàn giao.** Các vị trí phải rà:

| Chỗ trong file | Sửa gì khi phase đổi trạng thái |
|---|---|
| `.stat-strip` (3 ô đầu trang) | `Phase đã xong x/6`; ô `Đang đứng`; ô `UI thật đầu tiên` khi tới W5–W6 |
| Metro `.stop` (10 ga) | Đổi class: `done` (xanh, tag "Xong") / `current` (cam + nhãn `.you-are-here`) / `pending` (tag "TASK sẵn") / `future` |
| `.metro-track .done-part` | `width` = tâm ga hiện tại: ga thứ N (đếm từ 1) → `(N-1)/9 × 100%`. Ví dụ Phase 3 chạy → `44.4%` |
| `.phase-card` | Đổi `badge-*` + `pc-status` (`st-xong`/`st-dang`/`st-san`/`st-cho`) + `pc-foot` (exit/tiến độ) |
| `.rail` (Mốc UI) | Mốc đã đạt → `ri-done`; mốc tiếp theo → `ri-next`; thêm mốc mới khi có |
| `.burndown-bar` | Segments `is-done`/`is-current`/`is-later`; `.bd-marker` `left` = (tuần hiện tại − 0.5)/15 × 100% |
| `footer` | Cập nhật ngày "trạng thái DD/MM/YYYY" |

**Ví dụ cụ thể:** khi tenant-scope ACCEPTED → ga "2" thành `done`, ga "3" thành `current` (gắn `.you-are-here`), `done-part` → `44.4%`, stat "2/6"→"3/6", "Đang đứng: Phase 3 · Integrity", burndown P2→done, P3→current, marker `21%`→`34%`, footer đổi ngày. File cũng là trang xem nhanh cho sếp — mở bằng trình duyệt khi bàn giao.

---

## 9. Sai lầm đã mắc — đừng lặp lại

1. **Tạo tài liệu phụ** (`PROMPT_TIER2.md`) → vi phạm artifact model "một task, một contract" → đã xóa. Giao việc chỉ bằng `/code`.
2. **Ghi đè TASK.md bằng tóm tắt** thay vì edit có chủ đích → phải `git restore`. Luôn đọc trước khi sửa, dùng Edit, giữ nguyên phần không liên quan.
3. **Tách 1 phase thành 2 task** (tenant-scope-v2) → CANCELLED. Một phase = một contract.
4. **Thiếu traceability RQ→STEP→AC** ở bản đầu → viết lại cả contract. Dựng bảng traceability từ bản nháp đầu tiên.
5. **Muốn ACCEPT khi evidence chưa verify** → chặn đúng theo Iron Rule 4. Mọi kết luận phải có command + exit code + output thật (đã mask).
6. **Đóng task chỉ dựa trên xác nhận miệng mà không ghi nguồn** → luôn ghi "nguồn: sếp xác nhận ngày X" vào Revision Log khi dùng chứng cứ đó.

---

## 10. Checklist ngày đầu

- [ ] Đọc `.ai-pipeline/tier1.md` + `rules/01-planner-rules.md` + `templates/TASK.template.md`
- [ ] Đọc toàn bộ `docs/PHASE_KHOAHOC_V1.md`
- [ ] Đọc `docs/tasks/hrp-phase3-integrity/TASK.md` (contract đang chờ giao) + `hrp-phase2-tenant-scope/TASK.md` (mẫu ACCEPTED)
- [ ] Mở `docs/roadmap-hrp-v4.html` bằng trình duyệt (xem cấu trúc §8)
- [ ] `git log --oneline -12` + `git status` — lưu ý: `appBCC/*` đang modified là working tree song song của sếp — **không stage, không đụng**
- [ ] Hỏi sếp: Tier 2/3 hiện là ai? Có HANDOFF nào đang chờ audit không?
- [ ] Xác nhận lại 2 việc chờ: (1) giao `/code hrp-phase3-integrity`; (2) roadmap phải cập nhật sau mỗi task

---

*Tài liệu do Tier 1 Planner (Agent kế nhiệm trước) viết ngày 16/08/2026 — trạng thái chuẩn tại thời điểm chuyển giao. Mọi số liệu trong TASK.md hiện có và PHASE_KHOAHOC_V1.md là nguồn tin chính xác hơn tài liệu này nếu có mâu thuẫn.*
