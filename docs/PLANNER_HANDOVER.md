# TIER 1 LIVING HANDOFF v2.4 — HRP V5/V6

> Tài liệu này là hợp đồng tiếp quản lâu dài cho **Tier 1 — Planner**. Khi bàn giao cho Agent Tier 1 khác, bình thường **chỉ cập nhật khối `ROADMAP_CURSOR` ở §0**. Không chép tiến độ task vào các section ổn định bên dưới.

## 0. ROADMAP_CURSOR — phần duy nhất cập nhật theo tiến độ

<!-- ROADMAP_CURSOR_START -->

```yaml
updated_at: 2026-09-11 00:35 Asia/Bangkok
roadmap_source: docs/AI_PROJECT_BRIEF.md; docs/V6/v6-roadmap.html; docs/V6/v6-admin-rebuild_ROADMAP.md; docs/prompts/TIER0_UI04_R3_CLOSEOUT_VERDICT.md; docs/prompts/TIER0_UI04_04C1_04C2_EXECUTE_AND_PUSH.md
PHASE_MAP: |
  Phase 0: V5 Close — DA DONG 55/63 ACCEPTED (không thay đổi)
    -> gate-01/02/03: ACCEPTED
    -> test-01: ACCEPTED v1.4
    -> ui-01: ACCEPTED v1.1, deployed 06/09
    -> go-live-20: ACCEPTED v1.5, audit R1 PASS
    -> go-live-06: ACCEPTED R3 PASS
    -> go-live-07: DEFERRED (chờ end of V6 Phase 1 dev)
    -> go-live-19: DRAFT (việc viết, Tier 1)
  Phase 1: V6 Phase 1 Foundation — 3/3 core task ACCEPTED; UI restyling đã audit PASS
    -> hrp-v6-p1-job-opening-posting-split: ACCEPTED R4 PASS 08/09 (3a96b9c)
    -> hrp-v6-p1-labor-profile-schema: ACCEPTED R2 + Tier 3 audit r1 PASS + LIVE APPLIED hrp-live 08/09 (Owner xác nhận, f8bd761)
    -> hrp-v6-p1c-new-ui-restyling: ACCEPTED R4 — Tier 3 audit r1 PASS 08/09 (0 P0/P1/P2); ready merge commit
    -> hrp-v6-security-credential-rotation: READY_FOR_EXECUTION (Owner defer giữ nguyên)
    -> hrp-v6-credential-rotation-posture: BLOCKED R2 (OP-gated; Owner defer giữ nguyên)
  Phase 2: AFF Gate — CHAN HOAN TOAN (17/17 ô §20 chưa tick)
  Phase 3+: V6 Admin || AFF Track — CHUA MO
current_lane: UI04 public homepage completion
current_task: hrp-v6-ui-04c1-r3-footer-text-hotfix (DRAFT v0.1)
task_path: docs/tasks/hrp-v6-ui-04c1-r3-footer-text-hotfix/TASK.md
spec_version: v0.1 DRAFT (Owner visual review post-deploy 10/09/2026 phat hien 4 cho text sai trong GlobalFooter.tsx; commit 204f605 feat(ui) footer text hotfix da apply local)
task_status: DRAFT -> READY_FOR_EXECUTION (Tier 1 commit 204f605 + ready push len origin/main sau khi Tier 0 confirm; gates local PASS typecheck/build, test:unit 13 pre-existing FAIL khong phai do fix)
worktree_branch: main (Tier 0 directive TIER0_UI04_04C1_04C2_EXECUTE_AND_PUSH.md cho phep Tier 1 push production; Tier 1 commit 204f605 + can push them 1 commit docs(task) finalize)
current_gate: TIER_0_CONFIRM (Tier 0 xem fix diff + confirm push len origin/main hay chi staged)
next_command: Tier 1 push commit 204f605 + finalize TASK.md ACCEPTED len origin/main. Tier 0 xem xet CI pre-existing fail va quyet dinh co mo task fix-ci-prisma-validate rieng khong (Tier 1 da tao DRAFT task fix-ci-prisma-validate/TASK.md nhung CHUA push, cho Tier 0 review). Tier 1 khong tu fix CI (Tier 1 owns plan/contract, CI infra fix thuoc Tier 0 hoac Tier 2 neu mo task rieng). Sau Owner visual review ACCEPTED final: Tier 1 closeout UI04 round Phase 1+2 -> mo hrp-v6-ui-04d-section-render (van BLOCKED v1.5). Neu Owner yeu cau chinh them visual footer: mo 04c1-r4 (hoac 04c3 cho Job Card).
previous_accepted: 04c1 ACCEPTED round 1 (9f593fa + Tier 1 TASK.md finalize 780bb75) + 04c2 ACCEPTED round 1 (1316ff4 + Tier 1 TASK.md finalize d7e6899) + R3 v1.3 ACCEPTED (8c6fd03 — feat(ui04): live urgent jobs and minimal job cards) + composition/footer v1.4 ACCEPTED (04b767e) + interaction R2 ACCEPTED + VIS-01..03 correction R1 ACCEPTED (284e46c) + B pagination-admin ACCEPTED (18919da) + A visual-polish ACCEPTED
next_planner_candidate: hrp-v6-ui-04d-section-render (BLOCKED v1.5 — sau 04c1+04c2 push production + Owner live visual review ACCEPTED); sau đó hrp-v6-ui-04d-detail-ui (D.A); sau đó Admin V6 theo dependency (AV1 → AV4 → AV2 → AV6 → AV5)
blocking_owner: AFF §20 — 17/17 ô chưa tick (Founder+sep phải quyết; không mở task AFF nào); UI04 04c1+04c2 đã OWNER_DECIDED (16 lựa chọn chốt 10/09/2026) — gate đã mở sang TIER2_EXECUTION; Owner live visual review pending post-deploy (Tier 1 monitor Vercel/CI); section-render chờ Tier 1 review V6 stacking sau push production
v6_foundation: job-opening-posting-split ACCEPTED R4 PASS (3a96b9c); labor-profile-schema ACCEPTED R2 + LIVE (f8bd761); p1c-new-ui-restyling ACCEPTED R4 + Tier 3 audit r1 PASS; credential-rotation-posture BLOCKED R2 (Owner defer); security-credential-rotation READY (Owner defer giữ nguyên)
ui04_status:
  composition/footer: ACCEPTED v1.4 (04b767e)
  R3 urgent live + minimal SaaS card: ACCEPTED v1.3 (8c6fd03)
  04c1 footer tweak r2: ACCEPTED round 1 v1.0 (10/09/2026 23:21; Tier 2 commit 9f593fa; 16 Owner decisions đã chốt; verify-task.ps1 + verify-handoff.ps1 PASS; 14 AC evidence files; gate FAST; source production: app/components/GlobalFooter.tsx + app/components/ContactForm.tsx; 25 file commit trong allowlist; KHONG revert R3/composition-footer/R2/correction R1)
  04c2 job-card color refinement v10: ACCEPTED round 1 v1.0 (10/09/2026 23:48; Tier 2 commit 1316ff4; 16 Owner decisions + 5 interaction invariants đã chốt tai evidence/owner-job-card-color-refinement-decisions.md; verify-task.ps1 + verify-handoff.ps1 PASS WITH WARNINGS cosmetic; 14 AC evidence files; 89/89 tests pass trong featured-job-card.test.ts, 0 new failure; gates typecheck/test:unit/build PASS; source production: src/domains/job-board/components/landing/featured-job-card.tsx + featured-job-card.test.ts)
  04c1-r3 footer text hotfix: DRAFT v0.1 (11/09/2026 00:35; Tier 1 commit 204f605 feat(ui) footer text hotfix; 4 chỗ text fix: address prefix + Kê→Kế + bỏ "Thuê" + email spelling từ `nhaluchrp@gmail.com` → `nhanluchrp@gmail.com`; source: app/components/GlobalFooter.tsx; gates local PASS typecheck/build, test:unit 13 pre-existing FAIL không phải do fix; chờ Tier 0 confirm push lên origin/main)
  detail UI D.A: DRAFT — sau section-render ACCEPTED
  detail editor D.B: DRAFT (CRITICAL) — sau D.A
held_draft: hrp-v5-go-live-19-tracking-pii-db-mask — việc viết, chưa giao /code
queue_authority: Chi tiet UI04 o docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-overview.md; chi tiet V6 o docs/V6/v6-admin-rebuild_ROADMAP.md va docs/V6/aff_plan.md; dung dung task slug that, khong suy dien them phase/task; current_task = hrp-v6-ui-04c1-footer-tweak-r2 ACCEPTED round 1 v1.0 (song song 04c2-job-card-color-refinement-v10 ACCEPTED round 1 v1.0); Tier 1 se push 4 commit local 9f593fa + 1316ff4 + d7e6899 + 780bb75 len origin/main 1 lan o commit tiep theo; section-render BLOCKED v1.5 cho push production + Owner live visual review
owner_boundary: AFF CHAN TUYET DOI (giữ nguyên); go-live-07 DEFERRED; credential-rotation-posture BLOCKED OP-gated; UI04 04c1+04c2 đã OWNER_DECIDED (16 lựa chọn + 5 interaction invariants) — KHÔNG escalate Owner lần 2; Owner live visual review pending post-deploy (Tier 1 monitor Vercel/CI); UI04 section-render BLOCKED chờ round Phase 1+2 push production xong
protected_paths: README.md; docs/tasks/hrp-v6-security-credential-rotation/PROMPT_TIER2.md (per Tier 1 contract nếu có); Tier 1 KHÔNG sửa source production; Tier 1 KHÔNG revert R3 8 file dirty; Tier 1 KHÔNG revert composition/footer 04b767e; Tier 1 KHÔNG revert R2 9e51917 / correction R1; Tier 1 KHÔNG revert 04c1 (9f593fa) / 04c2 (1316ff4)
security_note: Khong lap lai credential lich su; moi gia tri nhay cam chi duoc ghi [REDACTED]. Rotate production thuoc OP Owner. §13 credential hygiene — lam CUOI CUNG truoc public. UI04 04c1 KHONG mo contact API, persistence, schema, permission, CMS, Admin. UI04 04c2 KHONG mo API, schema, persistence; KHONG hardcode màu hex (chỉ Tailwind utility); KHONG thêm package icon (chỉ lucide-react đã có). Tier 1 push production authority theo Tier 0 directive TIER0_UI04_04C1_04C2_EXECUTE_AND_PUSH.md.
phase1_live_evidence: commit f8bd761 trên origin/main; 2 migration files (20260908150000_v6_phase1a_labor_profile_schema + 20260908150001_v6_phase1a_labor_profile_rls) confirmed applied hrp-live bởi Owner 08/09; không có CI/CD auto-deploy migration (verified: vercel.json buildCommand không gọi prisma migrate deploy; .github/workflows/ci.yml không có deploy job)
ci_status_2026-09-11: CI workflow #146 (commit 918e2ee) FAIL pre-existing Prisma schema validate step (Node 22 + Prisma 5.22 binary engine mismatch); CI fail tu commit 8c6fd03 (R3 ACCEPTED) truoc - khong phai do Phase 1+2 round UI04 gay ra; Tier 1 tao DRAFT task hrp-v6-fix-ci-prisma-validate/TASK.md (v0.1; root cause PROPOSED = binaryTargets; DEC-01..05 chờ Tier 0); Tier 1 khong tu fix CI (Tier 1 owns plan/contract, CI infra fix thuoc Tier 0 hoac Tier 2 neu mo task rieng); Tier 0 quyet dinh: (a) thuc thi task fix-ci, (b) defer sang go-live hardening, (c) cancel DRAFT
vercel_deploy_2026-09-10: Vercel deployment #6376933011 SUCCESS cho commit 918e2ee (created 17:02:13 UTC, ngay sau push 17:00:31 UTC); production preview URL https://hrpartner-k2958oa8l-thuans-projects-0b7f4d74.vercel.app; Tier 1 verify visual review sau khi Owner confirm URL production alias (Tier 1 khong truy cap Vercel dashboard truc tiep); Tier 0 confirm production alias domain neu can cho review post-deploy
ui04_evidence:
  R3 ACCEPTED 8c6fd03: verify-task.ps1 PASS; verify-handoff.ps1 PASS WITH WARNINGS (H-15 control field Tier 1 sở hữu); Tier 3 FOCUSED audit PASS (0 finding release-blocking); verify-audit.ps1 PASS
  composition/footer ACCEPTED 04b767e: verify-task.ps1 + verify-handoff.ps1 + verify-audit.ps1 đều PASS; container 1080px; Footer 3 cột; ReferralStrip invariant
  04c1 ACCEPTED round 1 v1.0 10/09/2026 23:21 (Tier 2 commit 9f593fa): 16 Owner decisions tại docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/owner-footer-r2-decisions.md; verify-task.ps1 PASS (0 warning); RQ-00..RQ-16 (17 req) + AC-00..AC-14 (15 AC, 14 đo được) + STEP-03..STEP-08 (6 step thi công cụ thể); scope GlobalFooter.tsx + ContactForm.tsx; gates PASS; Tier 1 finalize TASK.md ACCEPTED tại 780bb75
  04c2 ACCEPTED round 1 v1.0 10/09/2026 23:48 (Tier 2 commit 1316ff4): 16 Owner decisions + 5 interaction invariants tại docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/evidence/owner-job-card-color-refinement-decisions.md; verify-task.ps1 PASS + verify-handoff.ps1 PASS WITH WARNINGS cosmetic (H-15 control field Tier 1 sở hữu); RQ-00..RQ-21 (22 req) + AC-00..AC-14 (15 AC) + STEP-01..STEP-12 (13 step thi công); scope featured-job-card.tsx + featured-job-card.test.ts; 89/89 tests PASS, 0 new failure; gates typecheck/test:unit/build PASS; Tier 1 finalize TASK.md ACCEPTED tại d7e6899
owner_defer:
  decision: "Deferred by Owner until target production stack and go-live hardening phase are confirmed."
  scope:
    - hrp-v6-security-credential-rotation (BLOCKED) -> dừng tại trạng thái hiện tại; không mở Tier 2 round mới; không yêu cầu Tier 3 re-audit; không tạo task deferral mới
    - hrp-v6-credential-rotation-posture (BLOCKED R2 OP-gated) -> dừng tại trạng thái hiện tại; không mở round mới
    - Neon-specific RLS/policy hardening tasks -> đưa ra khỏi critical path
    - Production secret setup, infra security audit chưa phục vụ feature đang code
    - Auth/infra redesign khi target stack chưa được quyết định
  release_checkpoint:
    description: "Một checkpoint duy nhất trước go-live, không phải task thực thi ngay."
    trigger_when: ["target production stack đã được Owner xác nhận", "đã bước vào release hardening / go-live"]
    contents: ["credential rotation", "secret ownership", "RLS/auth", "migration", "backup/rollback", "production configuration"]
    pre_trigger: "Không tiếp tục giục hoặc mở vòng audit cho Neon hygiene."
  exception: "Có bằng chứng credential đang bị lộ hoặc bị sử dụng trái phép -> xử lý như incident ngay. Không suy diễn 'có khả năng rủi ro' thành 'đã xảy ra incident'."
  tier1_focus_shift:
    - feature người dùng dùng/demo được
    - UI và business flow còn thiếu
    - API/domain logic cần cho vertical slice
    - test trọng yếu bảo vệ behavior vừa code
    - schema/domain work chỉ khi thực sự cần cho feature và không khóa cứng vào Neon
  task_size_policy:
    - FAST: thay đổi nhỏ, ít rủi ro
    - STANDARD/FOCUSED: feature thông thường
    - CRITICAL/DEEP: chỉ khi diff hiện tại thực sự chạm critical surface, không phải vì rủi ro hạ tầng tương lai
  ui04_04c1_owner_decided: |
    Footer tweak r2 OWNER_DECIDED (10/09/2026) — 16 lựa chọn đã chốt tại evidence/owner-footer-r2-decisions.md.
    Lane FAST, scope chỉ app/components/GlobalFooter.tsx + app/components/ContactForm.tsx.
    Tier 2 thi công theo TASK.md v1.0 (RQ-00..RQ-16, STEP-03..STEP-08, AC-00..AC-14).
    Baseline HEAD đầu round (Tier 2 đo tại STEP-01); expected-failure-set-before.txt capture trước khi sửa.
    Không amend R3 8 file dirty; không revert 04b767e; không phục hồi "Phiên bản 6.0".
    Tier 2 thi công xong tại 9f593fa + Tier 1 finalize TASK.md ACCEPTED tại 780bb75 (10/09/2026 23:21).
    Tier 1 push production cuối round Phase 1+2.
  ui04_04c2_owner_decided: |
    04c2 job-card color refinement v10 OWNER_DECIDED (10/09/2026) — 16 lựa chọn + 5 interaction invariants đã chốt tại evidence/owner-job-card-color-refinement-decisions.md.
    Lane FAST, scope src/domains/job-board/components/landing/featured-job-card.tsx + featured-job-card.test.ts (Tier 1 bổ sung test file vào allowlist).
    Tier 2 thi công theo TASK.md v1.0 (RQ-00..RQ-21, STEP-01..STEP-12, AC-00..AC-14).
    Baseline HEAD đầu round (Tier 2 đo tại STEP-01 = 9f593fa); expected-failure-set-before.txt capture trước khi sửa.
    Không revert R3 8c6fd03 / R2 9e51917 / correction R1 / composition/footer 04b767e / 04c1 9f593fa.
    Tier 2 thi công xong tại 1316ff4 + Tier 1 finalize TASK.md ACCEPTED tại d7e6899 (10/09/2026 23:48).
    Tier 1 push production cuối round Phase 1+2.
  tier1_push_authority: |
    Tier 0 directive TIER0_UI04_04C1_04C2_EXECUTE_AND_PUSH.md (10/09/2026) — Tier 1 được phép push HEAD len origin/main 1 lan cho ca 2 task (04c1 + 04c2).
    4 commit local ahead origin/main: 9f593fa (feat ui 04c1) + 1316ff4 (feat ui 04c2) + d7e6899 (docs 04c2 finalize) + 780bb75 (docs 04c1 finalize).
    Tier 1 push HEAD 780bb75 len origin/main sau do monitor Vercel/CI deploy status + Owner live visual review post-deploy.
  no_new_adr: "Không viết ADR dài. Không mở task rationalization mới."
```

<!-- ROADMAP_CURSOR_END -->

<!-- PRE_UI04_LANE_SNAPSHOT_2026-09-10_22-30 -->
<!-- Bản ROADMAP_CURSOR trước khi Tier 1 mở task 04c2 (2026-09-10 22:40):
     current_task = hrp-v6-ui-04c1-footer-tweak-r2 v1.0 READY_FOR_EXECUTION;
     Tier 2 đã có HANDOFF skeleton + tier1-directive-handoff.md;
     04c2 chưa mở (BLOCKED_OWNER chưa có skeleton).

     Bản hiện tại (2026-09-10 22:40) — bổ sung task 04c2 job-card color refinement
     theo directive Owner mới (đổi 2 CTA color, salary saturation, title size,
     footer layout); current_task vẫn là 04c1; 04c2 = BLOCKED_OWNER DRAFT v0.1.
     Xem archive section 0A bên dưới cho snapshot đầy đủ ngày 2026-09-08 và 2026-09-10 trước đó. -->

<!-- PRE_UI04_LANE_SNAPSHOT_2026-09-10 -->
<!-- Bản ROADMAP_CURSOR trước khi Tier 0 chốt UI04 là global delivery lane tại TIER0_UI04_R3_CLOSEOUT_VERDICT.md (2026-09-10).
     current_lane: Phase 1 V6 Foundation — vertical slice tiếp theo (post Tier 0 deferral 09/09)
     current_task: hrp-v6-p1-job-opening-status-card
     spec_version: v1.0 ACCEPTED 09/09
     task_status: ACCEPTED_PENDING_MERGE
     current_gate: OWNER_MERGE_TO_MAIN
     worktree_branch: tier1/job-opening-status-card-worktree

     Bản tiếp theo (DRAFT v0.1 / BLOCKED_OWNER) trước khi Owner đối 16 lựa chọn — chỉ snapshot ở archive section 0A.
     current_lane: UI04 public homepage completion
     current_task: hrp-v6-ui-04c1-footer-tweak-r2
     spec_version: v0.1 DRAFT
     task_status: DRAFT
     current_gate: BLOCKED_OWNER

     Bản hiện tại (2026-09-10 22:30) — 16 Owner decisions đã chốt → v1.0 READY_FOR_EXECUTION → TIER2_EXECUTION.
     Xem archive section 0A bên dưới cho snapshot đầy đủ ngày 2026-09-08 và 2026-09-10 trước đó. -->

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
    -> Security credential rotation BLOCKED v1.3 (audit round 1: AUD-001 ESCALATE_FIX contract DELTA + AUD-002 Owner rotation pending; Owner/OP rotate credential trong window 09:00-09:30 08/09 → Tier 3 re-audit round 2 → ACCEPTED)
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

Chỉ sửa khối `ROADMAP_CURSOR` ở §0 (phần nằm trong marker `<!-- ROADMAP_CURSOR_START -->` và `<!-- ROADMAP_CURSOR_END -->`). Toàn file phải luôn chỉ có đúng một cặp marker cho khối mutable; archive giữ riêng với marker ARCHIVE riêng.

## 12. Revision log

| Version | Ngày | Thay đổi |
|---|---|---|
| 2.0 | 25/08/2026 | Chuyển sang Living Handoff với ROADMAP_CURSOR mutable |
| 2.1 | 27/08/2026 | Quyết định Owner: một Tier 2/một stream |
| 2.2 | 01/09/2026 | Thêm §13 — credential hygiene hoãn đến Phase 5 |
| 2.3 | 07/09/2026 | Chuyển cursor sang TEST-01 round 4 |
| 2.4 | 08/09/2026 | V6 Phase 1: 1/2 done, job-opening-split R4 PASS, labor-profile-schema READY, AFF §20 17/17 chưa tick |
| 2.5 | 08/09/2026 | V6 Phase 1: 2/2 schema task ACCEPTED + LIVE APPLIED hrp-live (f8bd761); cursor chuyển sang p1c-new-ui-restyling R4 (READY); thêm phase1_live_evidence note (verified no auto-deploy migration) |
| 2.6 | 08/09/2026 | V6 Phase 1: 3/3 core task ACCEPTED — p1c-new-ui-restyling AUDIT R1 PASS (0 P0/P1/P2); cursor chuyển sang security-credential-rotation (READY_FOR_EXECUTION); thêm phase1c_audit_evidence note (gate fingerprint + frozen test hashes) |
| 2.7 | 08/09/2026 23:57 | Task `hrp-v6-security-credential-rotation` Tier 3 audit round 1 BLOCKED (AUD-001: canary contract vs reality mismatch; AUD-002: Owner rotation pending). Tier 1 verify audit claims: AC-02 PASS (git check-ignore exit 0); AC-09 2/4 canary tồn tại + 2 OUT_OF_SCOPE. DELTA: sửa AC-02/AC-09/AC-10. bump v1.2 → v1.3. §9 Planner Resolution ghi nhận. verify-task.ps1 DRAFT-VALID exit 0 (BLOCKED = non-READY_FOR_EXECUTION). Commit `13f3e40` (AUDIT.md + TASK.md v1.3). Chờ Owner/OP rotate credential → Tier 3 re-audit round 2 → ACCEPTED. |

---

*Cập nhật lần cuối: 08/09/2026 14:00 +07:00 bởi Tier 1 Agent*
