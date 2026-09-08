# TIER 1 LIVING HANDOFF v2.4 — HRP V5/V6

> Tài liệu này là hợp đồng tiếp quản lâu dài cho **Tier 1 — Planner**. Khi bàn giao cho Agent Tier 1 khác, bình thường **chỉ cập nhật khối `ROADMAP_CURSOR` ở §0**. Không chép tiến độ task vào các section ổn định bên dưới.

## 0. ROADMAP_CURSOR — phần duy nhất cập nhật theo tiến độ

<!-- ROADMAP_CURSOR_START -->

```yaml
updated_at: 2026-09-08 18:35 Asia/Bangkok
roadmap_source: docs/V6/v6-roadmap.html; docs/V6/v6-admin-rebuild_ROADMAP.md; docs/UNIFIED_PLAN_v5.md chi con la nguon cho V5/go-live debt
PHASE_MAP: |
  Phase 0: V5 Close — DA DONG 55/63 ACCEPTED
    -> gate-01/02/03: ACCEPTED
    -> test-01: ACCEPTED v1.4
    -> ui-01: ACCEPTED v1.1, deployed 06/09
    -> go-live-20: ACCEPTED v1.5, audit R1 PASS
    -> go-live-06: ACCEPTED R3 PASS
    -> go-live-07: DEFERRED (chờ end of V6 Phase 1 dev)
    -> go-live-19: DRAFT (việc viết, Tier 1)
  Phase 1: V6 Phase 1 Foundation Schema — ĐANG CHẠY 1C TIER_2_R4 SONG SONG
    -> hrp-v6-p1-job-opening-posting-split: ACCEPTED R4 PASS 08/09 (3a96b9c)
    -> hrp-v6-p1-labor-profile-schema: ACCEPTED R2 — Tier 3 audit r1 PASS 08/09 18:31 (0 P0/P1/P2)
    -> hrp-v6-p1c-new-ui-restyling: READY_FOR_EXECUTION R4 — Tier 1 bump b025f3d; Owner keeps existing H1; Tier 2 đang chạy
    -> hrp-v6-security-credential-rotation: READY_FOR_EXECUTION
    -> hrp-v6-credential-rotation-posture: BLOCKED R2 (OP-gated)
  Phase 2: AFF Gate — CHAN HOAN TOAN (17/17 ô §20 chưa tick)
  Phase 3+: V6 Admin || AFF Track — CHUA MO
current_lane: Phase 1 V6 Foundation Schema — 1/2 ACCEPTED; đang chờ Tier 2 R2 labor-profile-schema
current_task: hrp-v6-p1-labor-profile-schema
task_path: docs/tasks/hrp-v6-p1-labor-profile-schema/TASK.md
spec_version: v1.0 READY_FOR_EXECUTION (R2 committed 664efc3)
task_status: READY_FOR_EXECUTION
current_gate: TIER_2_EXECUTION
next_command: /code hrp-v6-p1-labor-profile-schema
previous_accepted: job-opening-posting-split ACCEPTED R4 PASS 08/09 (3a96b9c); go-live-20 ACCEPTED; ui-01 ACCEPTED v1.1; gate-01/02/03 ACCEPTED; test-01 ACCEPTED v1.4
next_planner_candidate: hrp-v6-p1c-new-ui-restyling (READY v1.2); security-credential-rotation (READY); credential-rotation-posture (READY)
blocking_owner: AFF §20 — 17/17 ô chưa tick, Founder+sep phải quyết; không mở task AFF nào
v6_foundation: job-opening-posting-split ACCEPTED R4 PASS (3a96b9c); labor-profile-schema READY R2 (664efc3); p1c-new-ui-restyling READY v1.2; credential-rotation-posture READY; security-credential-rotation READY
held_draft: hrp-v5-go-live-19-tracking-pii-db-mask — việc viết, chưa giao /code
queue_authority: Chi tiet V6 o docs/V6/v6-admin-rebuild_ROADMAP.md va docs/V6/aff_plan.md; dung dung task slug that, khong suy dien them phase/task; labor-profile-schema R2 dang cho Tier 2
owner_boundary: AFF CHAN TUYET DOI; go-live-07 DEFERRED (Owner defer to end of V6 Phase 1 dev cycle)
protected_paths: README.md; docs/tasks/hrp-v6-p1-labor-profile-schema/PROMPT_TIER2.md
security_note: Khong lap lai credential lich su; moi gia tri nhay cam chi duoc ghi [REDACTED]. Rotate production thuoc OP Owner. §13 credential hygiene — lam CUOI CUNG truoc public.
```

<!-- ROADMAP_CURSOR_END -->

## 0A. ROADMAP_CURSOR archive — snapshot 2026-09-08 09:15, chỉ để truy vết

<!-- ROADMAP_CURSOR_ARCHIVE_START -->

```yaml
updated_at: 2026-09-08 09:15 Asia/Bangkok
roadmap_source: docs/V6/v6-roadmap.html; docs/V6/v6-admin-rebuild_ROADMAP.md; docs/UNIFIED_PLAN_v5.md chi con la nguon cho V5/go-live debt
PHASE_MAP: |
  Phase 7: Post-Launch Debt (hien tai)
    -> GO-LIVE-20 public listing ACCEPTED v1.6
    -> TEST-01 browser lane ACCEPTED v1.5
    -> GO-LIVE-21 credential hygiene CLOSED v1.5
    -> Security credential rotation ACCEPTED v1.3
    -> GO-LIVE-07 marketplace launch proof DONG GO_LIVE_BLOCKED v1.6 ngay 08/09
    -> hrp-v6-credential-rotation-posture READY_FOR_EXECUTION v1.2
    -> GO-LIVE-19 PII DB mask DRAFT
  Phase 8: V6 Admin Rebuild
    -> hrp-v6-p1-labor-profile-schema ACCEPTED v1.1 (a4ab9f0)
    -> hrp-v6-p1-job-opening-posting-split ACCEPTED v1.1 (cf887c0)
    -> hrp-v6-p1c-new-ui-restyling READY_FOR_EXECUTION v1.2
    -> V6 Phase 2/3/4/5 chi mo theo roadmap va decision gate tuong ung
  Phase 9+: AFF -> M7/M8 -> M6 policy/slices -> PAY theo authority ben duoi
current_lane: Phase 8 V6 Phase 1 (1C + credential-rotation ACCEPTED) — Tier 2 running 1A R1
current_task: hrp-v6-p1-job-opening-posting-split — Tier 2 RUNNING R1
task_path: docs/tasks/hrp-v6-p1-job-opening-posting-split/TASK.md
spec_version: v1.2 RESOLVING_R2
task_status: RESOLVING_R2
current_gate: TIER_3_AUDIT_R2
next_action: Tier 3 audit R2 cho 1A
```

<!-- ROADMAP_CURSOR_ARCHIVE_END -->

### Quy tắc của cursor

- Cursor chỉ trả lời: **đang ở đâu, gate nào, artifact nào, lệnh gì tiếp theo**.
- `current_task` tối đa một task. Không mở nhiều task chỉ vì chúng cùng phase.
- Không ghi HEAD, số commit ahead, danh sách file dirty hoặc test count vào cursor; Agent nhận việc phải kiểm tra Git/artifact mới nhất.
- Chi tiết scope, baseline, dependency, AC và quyết định nằm trong `TASK.md`; không nhân bản vào handoff.
- Nếu cursor mâu thuẫn với TASK/HANDOFF/AUDIT, dừng và đối chiếu source of truth theo §2 trước khi làm.

## 1. Vai trò cố định của Tier 1

Tier 1 biến yêu cầu của sếp thành contract đủ chặt để Tier 2 thực thi và Tier 3 audit. Tier 1 sở hữu quyết định product/architecture, scope, acceptance và audit resolution; **không sửa source code**.

| Tier | Artifact sở hữu | Trách nhiệm | Không được làm |
|---|---|---|---|
| Tier 1 — Planner | `TASK.md` | Contract, decision, status, resolution | Không implement; không viết thay HANDOFF/AUDIT |
| Tier 2 — Engineer | `HANDOFF.md` | Implement, test, evidence thực thi | Không đổi contract; không tự audit/ACCEPTED |
| Tier 3 — Auditor | `AUDIT.md` | Audit độc lập, C-01..C-10, verdict | Không sửa source/TASK/HANDOFF |

**Owner process decision 2026-08-27:** sau khi task OPS-04a được audit/resolve, chỉ duy trì **một Tier 2** và một execution stream tại một thời điểm. Tier 1 không tự mở thêm parallel Tier 2/worktree.

## 2. Source of truth và thứ tự đọc khi nhận bàn giao

1. Khối `ROADMAP_CURSOR` ở §0 để biết điểm vào.
2. `.ai-pipeline/tier1.md`.
3. `.ai-pipeline/rules/00-global-rules.md` và `01-planner-rules.md`.
4. `.ai-pipeline/templates/TASK.template.md`.
5. `docs/V6/v6-roadmap.html` — bản đồ phase/task mới nhất.
6. `docs/V6/v6-admin-rebuild.md` §11 — 31 quyết định V6-DEC Chốt.
7. `docs/V6/aff_plan.md` §20 — AFF readiness gate.
8. `TASK.md`, rồi `HANDOFF.md`/`AUDIT.md` của task trong cursor.
9. Git và source/schema/test ở chế độ read-only để xác minh baseline.

## 3. State machine và current gate

Giá trị hợp lệ cho `current_gate`:

| Gate | Điều kiện | Tier 1 làm gì |
|---|---|---|
| `PLANNER_CONTRACT` | Chưa có TASK READY | Viết TASK, verify-task |
| `TIER_2_EXECUTION` | TASK `READY_FOR_EXECUTION` | Báo `/code <slug>` |
| `TIER_3_AUDIT` | HANDOFF kết `READY_FOR_AUDIT` | Báo `/audit <slug>` |
| `TIER_1_RESOLVE` | AUDIT đã bàn giao | Chạy resolve protocol §6 |
| `BLOCKED_OWNER` | Cần secret/DB/ADR/quyền OP từ sếp | Ghi owner + điều kiện mở khóa |

## 4. Vòng lặp vận hành chuẩn

```text
Cursor
  → đọc artifact tại current gate
  → thực hiện đúng quyền Tier 1
  → verify cơ học tương ứng
  → chuyển đúng tier/gate
  → chỉ khi gate thay đổi: cập nhật ROADMAP_CURSOR
```

## 5. Contract quality gate

TASK chỉ được `READY_FOR_EXECUTION` khi:
- Outcome/non-goal và scope đủ rõ; không có quyết định nghiệp vụ bị đẩy cho Tier 2/3.
- Baseline, dependency và destructive/OP action đã xác định owner.
- Mọi RQ có STEP và AC đo được; evidence yêu cầu LIVE thì không mock.
- Interface/data/state/permission/idempotency/concurrency được khóa đúng mức rủi ro.
- Không vi mô hóa private implementation nếu public contract và invariant đã đủ rõ.

## 6. Resolve Protocol — Tier 1 gate nhẹ

1. Chạy `.ai-pipeline/scripts/verify-audit.ps1 -TaskPath docs/tasks/<slug>/TASK.md`.
2. FAIL: yêu cầu Tier 3 chuẩn hóa/bổ sung AUDIT.
3. PASS: đọc findings P0→P3, Mandatory Checks và verdict.
4. Evidence nhất quán + PASS/CONDITIONAL: ghi resolution; spot-check tối đa ba điểm rủi ro cao.
5. Evidence thiếu/mâu thuẫn hoặc P0/P1 chưa đóng: `REVISION_REQUIRED` và directive.
6. Chỉ đặt `ACCEPTED` sau audit hợp lệ và resolution đầy đủ.

## 7. V6 Phase 1 — dependency và merge order

Hai hợp đồng V6 Phase 1 cùng ghi `prisma/schema.prisma` và cùng thứ tự migration. **Thứ tự merge bắt buộc:**

1. `hrp-v6-p1-job-opening-posting-split` **trước** — tạo `JobOpening` + `JobPosting` mà labor-profile phụ thuộc FK.
2. `hrp-v6-p1-labor-profile-schema` **sau** — tạo `LaborProfile` + `LaborProfileIntake` + `EmploymentEpisode`.

**Hai hàng rào đang sống (Phase 1 sẽ chạm):**
1. Slug publish sẽ đổi — tách JobPosting đổi chỗ publish → phải kèm redirect map.
2. `where` công khai bị đóng băng — `public-card-truth.test.ts:293` ghim `['isPublic','staffingOrders','status']`.

## 8. AFF Track — bị chặn hoàn toàn

§0 của `aff_plan.md` ghi `Status: DESIGN_REVIEW` và **"Current implementation gate: Chưa mở; phải đạt Definition of Ready §20"**. §20 có **17/17 ô chưa tick**. **Tuyệt đối không mở task AFF nào** cho đến khi §20 đủ.

Hai làn gặp lại ở `AFF-03` (không phải `AFF-05A`): Exit gate của 03 đòi LaborProfile + LaborProfileHandlingAssignment.

## 9. Git safety

- **Cấm `git add -A` và `git add .`** — dùng `git commit -- <pathspec>`
- **Cấm `git gc --prune`, `git reflog expire`** — giữ blob bản giao
- **Cấm chạy migration trên `neondb`** (production)
- **Cấm chạy lại sáu migration RLS cũ trên `hrp-live`** — `CREATE OR REPLACE` hạ cấp `*_visible_for`
- `neondb` (branch `hrp-live`) = **PRODUCTION**
- `hrp_mp2_test` = branch test **duy nhất** đủ ma trận RLS

## 10. Credential hygiene — §13, LÀM CUỐI CÙNG trước public

Owner quyết định 01/09: hoãn toàn bộ rotate. Không task nào bị chặn vì mục nào trong bảng này. Dồn vào **một cửa duy nhất** trước khi public.

| # | Việc | Ngày vào |
|---|---|---|
| 1 | Rotate `neondb_owner` | 29/08 + 01/09 |
| 2 | Rotate `cloud_admin` | 01/09 |
| 3 | Rotate `app_user_writer` | 01/09 |
| 4 | Phân loại local env | 01/09 |
| 5 | Cập nhật `DATABASE_URL_ADMIN` sau rotate | 29/08 |
| 6 | Xoá `DB_DIAG_TOKEN` | 29/08 |
| 7 | Xoá residual password literal trong `prisma/seed.mjs` | 29/08 |
| 8 | Dọn `scratch/*` | 29/08 |
| 9 | Xoá Neon branch `pre-mp2-remediation-2026-08-28` | 28/08 |
| 10 | Xoá dữ liệu DEMO | 31/08 |
| 11 | Chỉ `.env.example` tracked, chỉ placeholder value | 01/09 |

## 11. Cách cập nhật Living Handoff

Chỉ sửa khối `ROADMAP_CURSOR` ở §0 (từ `<!-- ROADMAP_CURSOR_START -->` đến `<!-- ROADMAP_CURSOR_END -->`). Toàn file phải luôn chỉ có đúng một cặp marker.

## 12. Revision log

| Version | Ngày | Thay đổi |
|---|---|---|
| 2.0 | 25/08/2026 | Chuyển sang Living Handoff với ROADMAP_CURSOR mutable |
| 2.1 | 27/08/2026 | Quyết định Owner: một Tier 2/một stream |
| 2.2 | 01/09/2026 | Thêm §13 — credential hygiene hoãn đến Phase 5 |
| 2.3 | 07/09/2026 | Chuyển cursor sang TEST-01 round 4 |
| 2.4 | 08/09/2026 | V6 Phase 1: 1/2 done, job-opening-split R4 PASS, labor-profile-schema READY, AFF §20 17/17 chưa tick |

---

*Cập nhật lần cuối: 08/09/2026 14:00 +07:00 bởi Tier 1 Agent*
