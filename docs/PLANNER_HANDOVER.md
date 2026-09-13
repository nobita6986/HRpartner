# TIER 1 LIVING HANDOFF v2.11 — HRP V5/V6

> Tài liệu này là hợp đồng tiếp quản lâu dài cho **Tier 1 — Planner**. Khi bàn giao cho Agent Tier 1 khác, bình thường **chỉ cập nhật khối `ROADMAP_CURSOR` ở §0**. Không chép tiến độ task vào các section ổn định bên dưới.

## 0. ROADMAP_CURSOR — phần duy nhất cập nhật theo tiến độ

<!-- ROADMAP_CURSOR_START -->

```yaml
updated_at: 2026-09-13 10:55 Asia/Bangkok
roadmap_source: docs/AI_PROJECT_BRIEF.md; docs/V6/v6-roadmap.html; docs/V6/v6-admin-rebuild_ROADMAP.md; docs/prompts/TIER0_UI04_R3_CLOSEOUT_VERDICT.md; docs/prompts/TIER0_UI04_04C1_04C2_EXECUTE_AND_PUSH.md; docs/TIER0_HANDOVER.md
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
current_lane: V6 Admin vertical slice (post-N0)
current_task: **hrp-v6-admin-overview-dashboard v1** — 3 KPI cards trên `/admin` (vòng độc lập, READ-ONLY) (13/09/2026 10:55); Tier 0 directive 13/09/2026 10:33: vòng đầu 3 KPI, trạng thái thật trong schema (`CandidateSubmissionStatus.NEW`, `TicketStatus.PENDING`), ma trận quyền riêng từng KPI (KHÔNG tái dùng VIEWER_ROLES của AV2), KPI không có quyền ẩn/ghi "Không có quyền xem", số 0 = query hợp lệ (không giả), số liệu bị RLS giới hạn ghi "trong phạm vi của bạn", link chỉ tới route tồn tại, DB trong transaction có GUC, không cache chung. **STAGE: code DONE, gates PASS, build PASS, Tier 3 LIGHT audit PASS, push `a8517c7` PASS**. Scope: `src/domains/admin/overview-metrics.service.ts` (KPI1/2/3_ALLOWED theo từng RLS policy: KPI-1 m13, KPI-2 m14, KPI-3 m1_07a) + `overview-metrics.service.test.ts` (34 test: permission matrix cho 9 role × 3 KPI + scopeLabel + value semantics + Prisma throw bubble-up + empty permission case HR_STAFF/SALE/ACCOUNTANT) + `app/admin/page.tsx` (giữ 9 SECTION_CARDS điều hướng + thêm 3 KPI cards phía trên + footer note giải thích "trong phạm vi của bạn"). Gates: tsc PASS; vitest 34/34 PASS; eslint 0 errors; **next build PASS** `Compiled successfully in 15.7s`, route `/admin` 175 B Dynamic; **Tier 3 LIGHT audit round 1 PASS** (sub-agent `0d259610-ef8a-41fc-8372-b2f505e7c2eb`, 14/14 điểm: 7 read permission + 7 data display, 0 blockers, 0 debt, 0 coverage gaps); push `bbc81b9..a8517c7` (5 file changed, 762 insertions, 5 deletions). N1 Stage 3 vẫn BLOCKED-on-env (chưa có credential); AV6 vẫn defer; nếu credential đến trong lúc làm vòng sau → dừng tại điểm an toàn, quay lại Stage 3 theo runbook.
task_path: docs/tasks/hrp-v6-admin-overview-dashboard/{TASK.md v1.0, evidence/next-build-2026-09-13.txt}
worktree_branch: merged to main (worktree `tier1-n1-foundation` giữ lịch sử local; branch `tier1/n1-foundation` HEAD 9fe4da2)
current_gate: DASHBOARD_V1_BUILT_READY_FOR_DEPLOY (code DONE + build PASS + push `a8517c7` PASS 13/09/2026 10:53; Tier 3 LIGHT audit round 1 PASS; chờ Vercel deploy verification từ Tier 0/Owner) + AV2_BUILT_READY_FOR_DEPLOY (chờ Vercel deploy verification) + TIER_0_DEPLOY_PENDING_N1 (Stage 3 evidence prep ACCEPTED 13/09 00:02; Stage 3 thật vẫn BLOCKED-on-env)
previous_accepted: N1 PlacementCase/Placement foundation ACCEPTED v1.2 (12/09/2026 15:18; branch `tier1/n1-foundation`; deliver `f7f85bb` + docs `9fe4da2`; Tier 3 LIGHT audit round 2 verdict PASS; baseline `703193a`; HANDOFF.md + AUDIT.md round 2 PASS co-located; schema + 2 migrations ADD-only + static SQL gate 17/17 + full unit suite 2025/2025 PASS + typecheck PASS + design-tokens 12/12 PASS carry-forward; CHƯA apply lên hrp-live — Tier 0 deploy gate DEC-N1-06/07) + N0 contract audit v1.1 (12/09/2026) + AV1 admin-settings-form hotfix f2f3296 (12/09/2026 13:25; post-acceptance correction; revert 4 dòng `var(--warning-container)`/`--on-warning-container` do `c8c6321` không resolve trong `globals.css` về `--secondary-container`/`--on-secondary-container`; gate `src/shared/ui/design-tokens.static.test.ts` giờ PASS 12/12; full unit suite 2028/2028 PASS at hotfix commit; AV1 logic không đổi) [evidence: docs/tasks/hrp-v6-n0-contract-audit/evidence-v1.1/av1-design-token-regression.md] + AV4 Media Library ACCEPTED v1.0 (62cdfd9/3133db3) + UI04d detail D.A ACCEPTED v1.0 (165408f + 423e399 + production smoke 200) + UI04g carousel v3 ACCEPTED (6562aaa) + UI04g carousel v2 ACCEPTED (75d28d8) + UI04g carousel v1 ACCEPTED (e259eb6) + UI04f card monogram abbrev ACCEPTED (12a06da) + AV1 HomepageSettings ACCEPTED v1.1 (0f1cb99/ebc7058/01ef329) + projection consistency fix (ebc7058) + N0 contract audit v1.0 (documented)
blocking_owner: AFF §20 — 17/17 ô chưa tick (Founder+sep phải quyết; không mở task AFF nào); UI04d ACCEPTED v1.0 — Owner visual review pending trên production; AV1 Settings form v1.1 — Owner visual review pending theo 7-nhóm checklist (sau hotfix f2f3296 token name đã đúng; tone "warning" còn ở borderColor, badge đơn giản thành "AV1 · ACTIVE"); AV4 ACCEPTED v1.0 — Owner set BLOB_READ_WRITE_TOKEN env trên Vercel + visual review thư viện media; **N1 foundation ACCEPTED v1.2** (12/09/2026 15:18; Tier 3 LIGHT audit round 2 PASS) — Owner/Tier 0 deploy gate (apply migration lên hrp-live, DEC-N1-06/07) before task kế tiếp; N1 task kế tiếp (intake writer + createOrMatchLaborProfile) Tier 1 outline sau deploy
v6_foundation: job-opening-posting-split ACCEPTED R4 PASS (3a96b9c); labor-profile-schema ACCEPTED R2 + LIVE (f8bd761); p1c-new-ui-restyling ACCEPTED R4 + Tier 3 audit r1 PASS; credential-rotation-posture BLOCKED R2 (Owner defer); security-credential-rotation READY (Owner defer giữ nguyên)
ui04_status:
  composition/footer: ACCEPTED v1.4 (04b767e)
  R3 urgent live + minimal SaaS card: ACCEPTED v1.3 (8c6fd03)
  04c1 footer tweak r2: ACCEPTED round 1 v1.0 (10/09/2026 23:21; Tier 2 commit 9f593fa; 16 Owner decisions đã chốt; verify-task.ps1 + verify-handoff.ps1 PASS; 14 AC evidence files; gate FAST; source production: app/components/GlobalFooter.tsx + app/components/ContactForm.tsx; 25 file commit trong allowlist; KHONG revert R3/composition-footer/R2/correction R1)
  04c2 job-card color refinement v10: ACCEPTED round 1 v1.0 (10/09/2026 23:48; Tier 2 commit 1316ff4; 16 Owner decisions + 5 interaction invariants đã chốt tai evidence/owner-job-card-color-refinement-decisions.md; verify-task.ps1 + verify-handoff.ps1 PASS WITH WARNINGS cosmetic; 14 AC evidence files; 89/89 tests pass trong featured-job-card.test.ts, 0 new failure; gates typecheck/test:unit/build PASS; source production: src/domains/job-board/components/landing/featured-job-card.tsx + featured-job-card.test.ts)
  04c1-r3 footer text hotfix: ACCEPTED (Tier 1 commit 204f605 feat(ui) 11/09/2026 00:35; 4 chỗ text fix: address prefix + Kê→Kế + bỏ "Thuê" + email spelling `nhaluchrp@gmail.com` → `nhanluchrp@gmail.com`; source: app/components/GlobalFooter.tsx; gates local PASS typecheck/build, test:unit 13 pre-existing FAIL không phải do fix; committed to origin/main 81c7aeb)
  detail UI D.A: ACCEPTED v1.0 (12/09/2026) — Tier 1 commit 165408f (feat: richer sections) + 423e399 (fix: isolate related jobs public transaction, production 500/P2028 đã bắt và sửa); production smoke `/viec-lam/EXTRA-2026-010` HTTP 200; 12 file diff (1 modified + 11 added); gates typecheck/test:unit (in-scope 34/34)/build PASS; out-of-scope 1 pre-existing failure tại design-tokens.static.test.ts không do UI04d; source production: app/(jobs)/viec-lam/[slug]/page.tsx + 8 section components + 1 fixture + public-types.ts; detail editor D.B defer (AV2)
held_draft: hrp-v5-go-live-19-tracking-pii-db-mask — việc viết, chưa giao /code
queue_authority: Chi tiet UI04 o docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-overview.md; chi tiet V6 o docs/V6/v6-admin-rebuild_ROADMAP.md va docs/V6/aff_plan.md; dung dung task slug that, khong suy dien them phase/task; current_task = N1 PlacementCase/Placement foundation ACCEPTED v1.2 + MERGED main (merge a43baa1, 12/09/2026 15:35); queue stages tuần tự — stage_3 local test-DB proof (Tier 1) → stage_4 prod migration (Tier 0/Owner quyết; Tier 1 KHONG tu chay) → stage_5 mở N1 task kế tiếp hrp-v6-n1-intake-writer; AV6 HomepageSection CMS (N0 §5.2 #2) defer, KHONG mo song song (đụng schema/migration luồng với stage_3/4); AV2 JobPosting editor shell defer (publish gated by N3); evidence mới 12/09/2026 15:35 — merge commit a43baa1 (N1 foundation + audit round 2 PASS) + PLANNER stage tracker; Tier 1 nhớ thêm carry-forward check design-tokens gate khi accept task tương lai (gate file-level deterministic, dễ bị bỏ sót giống 04c1-r3)
n1_stage_tracker:
  stage_1_audit_pass_branch:
    status: COMPLETE
    state: "audit PASS trên branch"
    commit: "9fe4da2 (tier1/n1-foundation); audit_round_2"
    evidence: "docs/tasks/hrp-v6-n1-placement-case-foundation/AUDIT.md round 2 PASS; AUD-001..004 CLOSED"
    date: "12/09/2026 15:18"
  stage_2_merged_main:
    status: COMPLETE
    state: "đã merge main"
    commit: "a43baa1 (merge --no-ff); ff0731a..a43baa1"
    evidence: "prisma validate + typecheck + static SQL gate 17/17 + full unit suite 2025/2025 PASS at merge HEAD"
    date: "12/09/2026 15:35"
  stage_3_db_applied_local_test:
    status: EVIDENCE_PREP_ACCEPTED (BLOCKED-on-env for real hrp_mp2_test)
    state: "chuẩn bị evidence cho Stage 3 thật — Tier 0 đã ACCEPT (13/09/2026 00:02); Stage 3 thật vẫn chờ credential để chạy gate trên hrp_mp2_test"
    self_test_verdict: "25/25 PASS (early) → 28/28 PASS (batch 5) trên embedded PG 18.4 (local, isolated, no Neon); batch 6 (Tier 0 directive 12/09/2026 23:30) thêm neon_branch_gate 6/6 PASS + STEP 5a guard 5/5 PASS trên fake API; commit 03fecc2 push origin/main 12/09/2026 23:35, worktree sạch"
    self_test_pg_version: "PG 18.4 via @embedded-postgres/windows-x64@18.4.0-beta.17 (local, isolated, no Neon)"
    self_test_evidence: "docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/{README.md, embedded-pg18-ndjson-rerun-2026-09-12-23-00.txt, embedded-pg18-stderr-rerun-2026-09-12-23-00.txt, neon-branch-gate-rerun-2026-09-12-23-35.txt, step5a-gate-rerun-2026-09-12-23-35.txt, neon_branch_gate.ps1, write_ndjson_evidence.ps1, copy_stderr_trace.ps1, test-evidence-helpers.ps1, test-neon-branch-gate.ps1, test-step5a-gate.ps1}"
    batch6_evidence: "neon_branch_gate.ps1 → real Neon API call, exact endpoint-id match, refuse on substring, exit codes 10..15 fail-closed; test-neon-branch-gate.ps1 → System.Diagnostics.Process + ProcessStartInfo (UseShellExecute=$false, RedirectStandardOutput/Error=$true) + sync StandardOutput.ReadToEnd() trước WaitForExit() (tránh deadlock BeginOutputReadLine + STA PowerShell), 6/6 PASS với exit code thật (0, 12, 12, 13, 14, 15) trong 8.7s; test-step5a-gate.ps1 → strict-typed [bool] check cho stage3_real_pass, V0/V1 inversion proofs (case-A real PASS, case-B real FAIL), case-C missing, case-D string, case-E runbook file grep, 5/5 PASS"
    pending_actions:
      - "Tier 1 waiting for Owner/OP to set TEST_DATABASE_URL_ADMIN + TEST_DATABASE_URL_WRITER for hrp_mp2_test branch (Neon endpoint, NOT posted in chat per credential hygiene)"
      - "Owner/OP also sets NEON_API_KEY + NEON_PROJECT_ID for STEP 1.5 control-plane gate (mandatory on real run; probe refuses exit 71 nếu N1_STAGE3_REAL=true mà thiếu)"
      - "Tier 1 chạy gate STEP 1 → 5 trên đúng hrp_mp2_test: STEP 1 (URL/DB fingerprint), STEP 1.5 (neon_branch_gate.ps1), STEP 2 (migrate status), STEP 3 (migrate deploy), STEP 4 (probe.mjs), STEP 5a (gate summary 28/28 + stage3_real_pass=true), STEP 5b (write_ndjson_evidence + copy_stderr_trace + commit)"
      - "Tier 1 commits sanitized NDJSON + stderr evidence to docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-hrp-mp2-test-{ndjson-clean.txt, stderr-clean.txt, README.md}"
      - "Tier 1 reports kết quả Stage 3 cho Tier 0 để xét Stage 4"
    probes_covered: ["T1 concurrent INSERT same labor+active → exactly 1×00000 + 1×23505 (true 2-transaction concurrency, 10s deadline)", "T2.1 same-labor-second-active STRICT 23505", "T2.2 CLOSE active + T2.3 reopen succeeds", "T3.1 submission+full_name+phone+normalized_phone+placement_case_id → T3.2 DELETE parent case rejected (accepted states 23001 PG18+/23503 PG14-17, message mentions RESTRICT)", "T4 has_table_privilege GRANT sanity (sel+ins+upd+del) on placement_case", "T4 HR_MANAGER/HR_STAFF/ADMIN positive returns 200 rows>=1", "T4 PUBLIC/WORKER/SALE/CTV/ANON denies return 0 rows with sqlstate 00000 (RLS, NOT 42501)"]
    pg_version_note: "Embedded PG 18.4 returns SQLSTATE 23001 for ON DELETE RESTRICT; PG 14-17 returns 23503. Probe accepts both. On hrp_mp2_test (PG 18.6 Neon) expect 23001."
    failure_protocol: "On 42501 mid-probe → forward-only fix migration granting the EXACT missing privilege (no broad GRANT). On migration SQL error → forward-only fix migration, original 2 N1 migrations untouched. Tier 3 LIGHT delta re-audit required after any fix."
    date: "12/09/2026 16:35"
  stage_4_db_applied_prod:
    status: PENDING
    state: "đã áp dụng DB (hrp-live production)"
    gating: "Tier 0/Owner quyết (DEC-N1-06/07); Tier 1 KHÔNG tự chạy deploy prod"
    date: null
  stage_5_intake_writer_task:
    status: PENDING
    state: "mở hrp-v6-n1-intake-writer"
    gating: "Chỉ mở SAU stage_3 (local test PASS) + stage_4 (prod migration applied)"
    date: null
v6_foundation: job-opening-posting-split ACCEPTED R4 PASS (3a96b9c); labor-profile-schema ACCEPTED R2 + LIVE (f8bd761); p1c-new-ui-restyling ACCEPTED R4 + Tier 3 audit r1 PASS; credential-rotation-posture BLOCKED R2 (Owner defer); security-credential-rotation READY (Owner defer giữ nguyên)
ui04_status:
  composition/footer: ACCEPTED v1.4 (04b767e)
  R3 urgent live + minimal SaaS card: ACCEPTED v1.3 (8c6fd03)
  04c1 footer tweak r2: ACCEPTED round 1 v1.0 (10/09/2026 23:21; Tier 2 commit 9f593fa; 16 Owner decisions đã chốt; verify-task.ps1 + verify-handoff.ps1 PASS; 14 AC evidence files; gate FAST; source production: app/components/GlobalFooter.tsx + app/components/ContactForm.tsx; 25 file commit trong allowlist; KHONG revert R3/composition-footer/R2/correction R1)
  04c2 job-card color refinement v10: ACCEPTED round 1 v1.0 (10/09/2026 23:48; Tier 2 commit 1316ff4; 16 Owner decisions + 5 interaction invariants đã chốt tai evidence/owner-job-card-color-refinement-decisions.md; verify-task.ps1 + verify-handoff.ps1 PASS WITH WARNINGS cosmetic; 14 AC evidence files; 89/89 tests pass trong featured-job-card.test.ts, 0 new failure; gates typecheck/test:unit/build PASS; source production: src/domains/job-board/components/landing/featured-job-card.tsx + featured-job-card.test.ts)
  04c1-r3 footer text hotfix: ACCEPTED (Tier 1 commit 204f605 feat(ui) 11/09/2026 00:35; 4 chỗ text fix: address prefix + Kê→Kế + bỏ "Thuê" + email spelling `nhaluchrp@gmail.com` → `nhanluchrp@gmail.com`; source: app/components/GlobalFooter.tsx; gates local PASS typecheck/build, test:unit 13 pre-existing FAIL không phải do fix; committed to origin/main 81c7aeb)
  detail UI D.A: ACCEPTED v1.0 (12/09/2026)
  detail editor D.B: DRAFT (CRITICAL) — sau D.A
held_draft: hrp-v5-go-live-19-tracking-pii-db-mask — việc viết, chưa giao /code
queue_authority: Chi tiet UI04 o docs/tasks/hrp-v6-ui-04-homepage-huongb-refinement/evidence/plan-overview.md; chi tiet V6 o docs/V6/v6-admin-rebuild_ROADMAP.md va docs/V6/aff_plan.md; dung dung task slug that, khong suy dien them phase/task; current_task = N1 PlacementCase/Placement foundation READY + Tier 1 /deliver commit f7f85bb trên branch tier1/n1-foundation (12/09/2026 14:14); Tier 3 LIGHT audit + Tier 0 deploy gate; next candidates: N1 task kế tiếp `hrp-v6-n1-intake-writer` (Tier 1 đề xuất slug; build trên schema foundation: createOrMatchLaborProfile + intake writer + possible-match + state machine transition) sau khi foundation accepted; AV6 HomepageSection CMS (N0 §5.2 #2) KHONG mo song song voi N1 (cùng schema/migration luồng); AV2 JobPosting editor shell (N0 §5.3) defer (publish gated by N3); evidence mới 12/09/2026 — N1 /deliver logs evidence/ trong worktree tier1-n1-foundation + AV1 hotfix f2f3296 docs/tasks/hrp-v6-n0-contract-audit/evidence-v1.1/av1-design-token-regression.md; Tier 1 nhớ thêm carry-forward check design-tokens gate khi accept task tương lai (gate file-level deterministic, dễ bị bỏ sót giống 04c1-r3)
owner_boundary: AFF CHAN TUYET DOI (giữ nguyên); go-live-07 DEFERRED; credential-rotation-posture BLOCKED OP-gated; UI04 04c1+04c2 đã OWNER_DECIDED (16 lựa chọn + 5 interaction invariants) — KHÔNG escalate Owner lần 2; UI04d IMPLEMENTATION_COMPLETE — Owner visual review pending trên production; 04c1-r3 hotfix ACCEPTED (204f605); AV1 Settings form v1.1 — Owner visual review pending theo 7-nhóm checklist trong TASK.md (hotfix f2f3296 12/09/2026 đã sửa token không tồn tại — recommend Owner re-review sau khi f2f3296 vào production để confirm visual đạt); AV4 DEC-01..DEC-06 pending Owner decisions (max file size, image transformation, CDN, blob token, thumbnail, pagination)
protected_paths: README.md; docs/tasks/hrp-v6-security-credential-rotation/PROMPT_TIER2.md (per Tier 1 contract nếu có); Tier 1 KHÔNG sửa source production; Tier 1 KHÔNG revert R3 8 file dirty; Tier 1 KHÔNG revert composition/footer 04b767e; Tier 1 KHÔNG revert R2 9e51917 / correction R1; Tier 1 KHÔNG revert 04c1 (9f593fa) / 04c2 (1316ff4)
security_note: Khong lap lai credential lich su; moi gia tri nhay cam chi duoc ghi [REDACTED]. Rotate production thuoc OP Owner. §13 credential hygiene — lam CUOI CUNG truoc public. UI04 04c1 KHONG mo contact API, persistence, schema, permission, CMS, Admin. UI04 04c2 KHONG mo API, schema, persistence; KHONG hardcode màu hex (chỉ Tailwind utility); KHONG thêm package icon (chỉ lucide-react đã có). Tier 1 push production authority theo Tier 0 directive TIER0_UI04_04C1_04C2_EXECUTE_AND_PUSH.md.
phase1_live_evidence: commit f8bd761 trên origin/main; 2 migration files (20260908150000_v6_phase1a_labor_profile_schema + 20260908150001_v6_phase1a_labor_profile_rls) confirmed applied hrp-live bởi Owner 08/09; không có CI/CD auto-deploy migration (verified: vercel.json buildCommand không gọi prisma migrate deploy; .github/workflows/ci.yml không có deploy job)
ci_status_2026-09-11: CI workflow #146 (commit 918e2ee) FAIL pre-existing Prisma schema validate step (Node 22 + Prisma 5.22 binary engine mismatch); CI fail tu commit 8c6fd03 (R3 ACCEPTED) truoc - khong phai do Phase 1+2 round UI04 gay ra; Tier 1 tao DRAFT task hrp-v6-fix-ci-prisma-validate/TASK.md (v0.1; root cause PROPOSED = binaryTargets; DEC-01..05 chờ Tier 0); Tier 1 khong tu fix CI (Tier 1 owns plan/contract, CI infra fix thuoc Tier 0 hoac Tier 2 neu mo task rieng); Tier 0 quyet dinh: (a) thuc thi task fix-ci, (b) defer sang go-live hardening, (c) cancel DRAFT
vercel_deploy_2026-09-10: Vercel deployment #6376933011 SUCCESS cho commit 918e2ee (created 17:02:13 UTC, ngay sau push 17:00:31 UTC); production preview URL https://hrpartner-k2958oa8l-thuans-projects-0b7f4d74.vercel.app; Tier 1 verify visual review sau khi Owner confirm URL production alias (Tier 1 khong truy cap Vercel dashboard truc tiep); Tier 0 confirm production alias domain neu can cho review post-deploy
ui04_evidence:
  R3 ACCEPTED 8c6fd03: verify-task.ps1 PASS; verify-handoff.ps1 PASS WITH WARNINGS (H-15 control field Tier 1 sở hữu); Tier 3 FOCUSED audit PASS (0 finding release-blocking); verify-audit.ps1 PASS
  composition/footer ACCEPTED 04b767e: verify-task.ps1 + verify-handoff.ps1 + verify-audit.ps1 đều PASS; container 1080px; Footer 3 cột; ReferralStrip invariant
  04c1 ACCEPTED round 1 v1.0 10/09/2026 23:21 (Tier 2 commit 9f593fa): 16 Owner decisions tại docs/tasks/hrp-v6-ui-04c1-footer-tweak-r2/evidence/owner-footer-r2-decisions.md; verify-task.ps1 PASS (0 warning); RQ-00..RQ-16 (17 req) + AC-00..AC-14 (15 AC, 14 đo được) + STEP-03..STEP-08 (6 step thi công cụ thể); scope GlobalFooter.tsx + ContactForm.tsx; gates PASS; Tier 1 finalize TASK.md ACCEPTED tại 780bb75 [NOTE: Tier 1 204f605 hotfix commit trên main 81c7aeb; 9f593fa/780bb75 KHÔNG trên main hiện tại]
  04c2 ACCEPTED round 1 v1.0 10/09/2026 23:48 (Tier 2 commit 1316ff4): 16 Owner decisions + 5 interaction invariants tại docs/tasks/hrp-v6-ui-04c2-job-card-color-refinement-v10/evidence/owner-job-card-color-refinement-decisions.md; verify-task.ps1 PASS + verify-handoff.ps1 PASS WITH WARNINGS cosmetic (H-15 control field Tier 1 sở hữu); RQ-00..RQ-21 (22 req) + AC-00..AC-14 (15 AC) + STEP-01..STEP-12 (13 step thi công); scope featured-job-card.tsx + featured-job-card.test.ts; 89/89 tests PASS, 0 new failure; gates typecheck/test:unit/build PASS; Tier 1 finalize TASK.md ACCEPTED tại d7e6899 [NOTE: 1316ff4/d7e6899 KHÔNG trên main hiện tại — features đã được Owner thực hiện lại trong các commit UI04d mới trên main 81c7aeb]
  UI04d D.A detail sections: ACCEPTED v1.0 (12/09/2026); baseline `9596d8c` → implementation `165408f` → correction `423e399` (production 500/P2028 đã bắt và sửa) → production smoke `/viec-lam/EXTRA-2026-010` HTTP 200; 12 file diff (1 modified + 11 added); sections: summary (REAL), gallery (INTEGRATION_PENDING skeleton — chờ AV4 Media), introduction/salary/support/requirements/apply-instructions/ctv-info/footer-banner (DEMO fixture — chờ AV2 editorial), positions/apply-cta/related-jobs/employer-sidebar (REAL); gates typecheck/test:unit (in-scope 34/34)/build PASS; out-of-scope 1 pre-existing failure tại design-tokens.static.test.ts không do UI04d; components production: src/domains/job-board/components/detail/* (8 sections) + fixtures/detail-sections.fixture.ts + public-types.ts (StructuredContent union + BenefitItem + MediaItem + SalarySectionContent + SupportSectionContent + GallerySectionContent + ContentSectionContent + CtvInfoSectionContent + EmployerSidebarContent + FooterBannerContent); detail editor D.B defer (AV2)
  AV1 HomepageSettings: IMPLEMENTATION COMPLETE v1.1 (11/09/2026 15:30); Owner visual review pending theo 7-nhóm checklist tại docs/tasks/hrp-v6-admin-v6-av1-settings-editor/TASK.md; scope: schema + migration + permission + service + 2 API routes + admin form + homepage + listing integration; gates: prisma validate / vitest 1925/1925 / build / lint 0 errors / api-boundary PASS; commits: 0f1cb99 (initial), ebc7058 (projection boundary-aware refactor), 01ef329 (v1.1 UX polish + checklist); **post-acceptance hotfix f2f3296** (12/09/2026 13:25): revert 4 dòng `var(--warning-container)`/`--on-warning-container` không tồn tại trong `globals.css` (do `c8c6321`) về `--secondary-container`/`--on-secondary-container`; gate `design-tokens.static.test.ts` PASS 12/12 (đã fail liên tục từ `c8c6321` 11/09 15:48); full unit suite sau hotfix PASS (đếm tại thời điểm chạy); AV1 logic không đổi; tone "warning" còn ở `borderColor` của block `unavailableReason`; badge đơn giản thành "AV1 · ACTIVE"; evidence docs/tasks/hrp-v6-n0-contract-audit/evidence-v1.1/av1-design-token-regression.md
  AV4 Media Library: TASK v0.1 (11/09/2026); Tier 1 delivery in-progress (worktree `worktree-04v-media-r1`); DEC-01..DEC-06 — Tier 1 tự quyết theo RECOMMENDATION trong TASK.md (max 5MB, không transform, Vercel CDN, manual token, không thumbnail, offset pagination); scope: Media model + MediaAssignment junction + Vercel Blob presigned URL upload + asset library + safe render allowlist + Admin UI; không triển khai AV2/AV6 trong lượt này; migration safety: ADD-only, không phá huỷ dữ liệu; Tier 1 push trực tiếp origin/main sau khi gates PASS; AV2 và AV6 phụ thuộc AV4 cho media assignment
  N1 PlacementCase/Placement foundation: ACCEPTED v1.2 (12/09/2026 15:18); Tier 3 LIGHT audit round 2 verdict PASS (commit 9fe4da2); baseline 703193a, deliver f7f85bb, docs 9fe4da2; scope: schema PlacementCase (cuid + laborProfileId NOT NULL + enum PlacementCaseStatus + timestamps) + enum OPEN/IN_PROGRESS/READY_TO_PLACE/CLOSED + partial unique index `(labor_profile_id) WHERE status IN (3 ACTIVE_STATUSES)` (DEC-N1-02 concurrency-safe invariant) + CandidateSubmission.placementCaseId nullable FK ON DELETE RESTRICT (DEC-N1-03) + LaborProfile 1→N PlacementCase back-relation (DEC-N1-04) + 2 migrations (ADD-only) + RLS forward-only (ADMIN/HR_MANAGER/HR_STAFF, no public/anon) + static SQL gate 17/17 PASS; gates: prisma validate / prisma generate (PlacementCase + PlacementCaseStatus in client) / migration preview (1305 bytes, no DROP/RENAME/ALTER COLUMN TYPE) / static SQL gate 17/17 / full unit suite 2025/2025 PASS (123 test files) at /deliver commit / npm run typecheck PASS / design-tokens 12/12 PASS carry-forward; HANDOFF.md 13815 bytes (4-file scope, AE-01..AE-10 inline evidence, READY_FOR_AUDIT); AUDIT.md round 2 PASS (4 findings closed); AUD-002 P3 + AUD-004 P2 reconciled at TASK v1.2 wording (no semantic change); AUD-003 P3 closed by inline evidence + evidence/ committed to taskDir; CHƯA apply lên hrp-live (Tier 1 không apply; Owner deploy gate sau khi Tier 3 LIGHT audit PASS); N1 foundation chỉ hoàn thành lớp schema — createOrMatchLaborProfile + intake writer + state machine transition + possible-match policy thuộc task kế tiếp `hrp-v6-n1-intake-writer` (Tier 1 đề xuất slug); static SQL gate limitation ghi rõ: KHÔNG chứng minh runtime concurrency — cần integration test 2 transaction thật trên DB thử nghiệm riêng (Tier 0/Owner quyết)
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
  ui04d_owner_decided: |
    UI04d detail D.A Tier 1 tự quyết theo Tier 0 directive 12/09/2026 (no Owner gate chặn).
    Sections phụ thuộc AV2 (editorial fields) dùng DEMO fixture thay skeleton — không phải INTEGRATION_PENDING.
    Gallery section giữ INTEGRATION_PENDING skeleton cho AV4 Media (chính task hiện tại).
    Tier 1 commit trực tiếp origin/main sau khi gates PASS (Tier 1 = Planner + Engineer).
    Production smoke test `/viec-lam/EXTRA-2026-010` HTTP 200 ngay sau deploy.
  tier1_push_authority_av4: |
    Tier 0 directive 12/09/2026 — Tier 1 mới (Planner + Engineer gộp) được push trực tiếp origin/main cho AV4 Media Library.
    AV4 là schema ADD-only + service + API + Admin UI + tests; không có destructive migration; gates: prisma validate, typecheck, test:unit (in-scope), build.
    Không hardcode secret (BLOB_READ_WRITE_TOKEN qua env); nếu credential chưa có, deploy vẫn build PASS nhưng upload runtime sẽ fail đúng — báo đúng phần deployment bị chặn.
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
| 2.8 | 12/09/2026 | UI04d D.A ACCEPTED v1.0 (165408f + 423e399 + production smoke 200); cursor chuyển sang AV4 Media Library DRAFT v0.1 → Tier 1 delivery in-progress (worktree-04v-media-r1); Tier 1 mới = Planner + Engineer gộp theo docs/TIER0_HANDOVER.md 11/09/2026; Tier 1 push authority mở rộng cho AV4 (ADD-only schema, không destructive migration); UI04d D.B detail editor defer (AV2 editorial CMS) |
| 2.9 | 12/09/2026 | AV4 Media Library ACCEPTED v1.0 (commits a5de2c4 schema + 8edf1ac impl + 62cdfd9 task finalize); pushed to origin/main; 7 API routes + /admin/media page + 49 unit tests + safe-render allowlist; 2007/2008 vitest (1 pre-existing fail design-tokens không do AV4); build PASS; DEC-01..06 self-resolved theo RECOMMENDATION; deployment blocker: BLOB_READ_WRITE_TOKEN env chưa set trên Vercel → upload runtime trả 503 cho đến khi Owner cấu hình env (không cần re-deploy); cursor chờ Owner set env + visual review, sau đó mở N0 contract audit / AV2 shell / AV6 CMS theo priority |
| 2.10 | 12/09/2026 13:35 | N0 contract audit v1.1 + AV1 admin-settings-form hotfix f2f3296 (post-acceptance correction: revert 4 dòng `var(--warning-container)` không resolve về `--secondary-container`; design-tokens gate PASS 12/12; full unit suite 2008/2008 PASS at hotfix commit; AV1 logic không đổi); evidence `docs/tasks/hrp-v6-n0-contract-audit/evidence-v1.1/av1-design-token-regression.md` + 7 vitest logs; flag for Tier 1 carry-forward design-tokens check mỗi task mới. Cursor chờ Tier 1 draft TASK N1 foundation. |
| 2.11 | 12/09/2026 14:15 | N1 PlacementCase/Placement foundation READY + Tier 1 `/deliver` branch `tier1/n1-foundation` commit `f7f85bb` (baseline `703193a`); schema `PlacementCase` (cuid + enum `PlacementCaseStatus` = OPEN/IN_PROGRESS/READY_TO_PLACE/CLOSED + laborProfileId NOT NULL FK) + LaborProfile 1→N back-relation + CandidateSubmission.placementCaseId nullable FK ON DELETE RESTRICT (DEC-N1-03); 2 migrations ADD-only (no DROP/RENAME/ALTER COLUMN TYPE); partial unique index `(labor_profile_id) WHERE status IN ('OPEN','IN_PROGRESS','READY_TO_PLACE')` (DEC-N1-02 concurrency-safe invariant); RLS forward-only ENABLE/FORCE + 1 policy ADMIN/HR_MANAGER/HR_STAFF (no public/anon); static SQL gate 17/17 PASS; full unit suite **2025/2025 PASS at /deliver commit** (đếm tại runtime; KHÔNG fix cứng); typecheck PASS; design-tokens carry-forward 12/12 PASS; CHƯA apply lên hrp-live (Tier 1 không apply; Tier 0 deploy gate sau khi Tier 3 LIGHT audit PASS); N1 foundation chỉ là lớp schema — `createOrMatchLaborProfile` + intake writer + state machine transition + possible-match policy thuộc task kế tiếp `hrp-v6-n1-intake-writer` (Tier 1 đề xuất slug); AV6 KHÔNG mở song song (cùng schema/migration luồng); verify-task.ps1 fix: gate A-04 whitelist approach — angle-brackets enum literal (e.g. `<OPEN \| IN_PROGRESS \| CLOSED>`) valid, non-PascalCase angle brackets flagged as placeholder; Bổ sung TASK.md v1.1 chốt 4 DEC (01/02/03/05) Tier 0 12/09/2026 |
| 2.12 | 12/09/2026 15:18 | N1 foundation Tier 3 LIGHT audit round 2 **verdict PASS** (commit 9fe4da2, docs only). Tier 1 added HANDOFF.md (13815 bytes; 4-file scope: schema.prisma + 2 migrations + static SQL gate test; §2 inline evidence AE-01..AE-10; §3 evidence registry; §4 deviations; status READY_FOR_AUDIT) and reconciled TASK v1.1 → v1.2 (AC-05(e) wording for DEC-N1-02/03/04 overrides closes AUD-002; AC-06 wording for 1 PERMISSIVE ALL policy closes AUD-004; §9 Planner Resolution ghi decision; §10 Revision Log có v1.2 entry). evidence/ baseline.txt + migration-preview.sql committed to taskDir (was previously gitignored at root; closes AUD-003 reproducibility). verify-task.ps1 PASS (T-07 detect Spec version change justified by §9/10). verify-handoff.ps1 PASS WITH WARNINGS (H-01 not staged + H-15 spec version differs HEAD — both expected pre-commit). verify-audit.ps1 PASS. Tier 3 sub-agent re-ran 3 spot-checks (AE-02 prisma validate, AE-07 static SQL gate 17/17, AE-08 full suite 2025/2025) — all reproduced. AUDIT.md updated to verdict PASS, all 4 findings CLOSED. cursor = chờ Tier 0 deploy gate (DEC-N1-06/07) trước khi mở N1 intake-writer task. |
| 2.13 | 12/09/2026 15:35 | N1 foundation **merged into main** (commit a43baa1, merge --no-ff tier1/n1-foundation; ff0731a..a43baa1). Conflicted-free merge (main chỉ có PLANNER.md docs commit, branch chỉ có N1 docs + 4 file impl). Merge HEAD gates: prisma validate PASS; typecheck PASS; static SQL gate 17/17 + design-tokens 12/12 = 29/29 PASS; full unit suite 2025/2025 PASS (75s, no regression). Push origin/main ✅. **Cursor stage tracker** added (`n1_stage_tracker` block in PLANNER §0) — phân biệt 5 states: stage_1 audit PASS branch (DONE 9fe4da2) / stage_2 merged main (DONE a43baa1) / stage_3 DB applied local test (PENDING — Tier 1 phải chạy cả 2 migration trên DB thử nghiệm riêng + 2-transaction concurrency proof + FK RESTRICT proof + RLS role isolation proof) / stage_4 DB applied prod (PENDING — Tier 0/Owner quyết, Tier 1 KHÔNG tự chạy prod) / stage_5 mở N1 intake-writer task (PENDING, gated by stage_3+4). Owner visual review AV1 + BLOB env AV4 là việc độc lập, không chặn stage 1-2 (đã xong) hoặc stage_3. |
| 2.14 | 12/09/2026 16:05 | N1 stage_3 probe READY (env-blocked). Tier 1 wrote scratch/n1-stage3-db-proof/probe.mjs (122 lines, NDJSON output, refuses to start when URL fingerprints hrp-live, uses two physically separate pg.Client for the concurrent INSERT txns) + scratch/n1-stage3-db-proof/README.md (operator runbook). Probe covers: T1 concurrency 23505; T2.1 same-labor-second-active 23505 + T2.2 CLOSED→reopen; T3 FK RESTRICT 23503; T4 RLS isolation distinguishing GRANT-denied 42501 from RLS-denied 0 rows with role probes PUBLIC/HMR/HRST/ADMIN/WORKER/SALE/CTV/ANON using SET LOCAL app.role per user correction (NOT hrp.session_role; hrp_session_role() reads current_setting('app.role')). Operator runbook: Owner/OP provides TEST_DATABASE_URL_ADMIN + TEST_DATABASE_URL_WRITER for hrp_mp2_test branch (currently Tier 1 has no test DB URL — `hrp_mp2_test` URL không có trong repo theo credential hygiene; local machine không có Docker daemon / PG binary nên không thể spin local test DB). Forward-only fix migration protocol: nếu probe phát hiện GRANT thiếu (42501) hoặc migration SQL lỗi → viết migration bổ sung + Tier 3 LIGHT re-audit delta (KHÔNG sửa 2 N1 source migration). KHÔNG tự chạy probe (URL chưa được cấp); KHÔNG tự chạy prod migration; KHÔNG mở AV6 song song (cùng schema luồng); AV1/AV4 indep. |
| 2.15 | 12/09/2026 16:35 | N1 stage_3 probe SELF-TEST PASS on local PG 18.4 (embedded). User raised 6 accuracy issues: (1) LaborProfile has no `status` column → fixed labor_profile INSERT; (2) `pg_policy` catalog column names wrong → switch to `pg_policies` view; (3) concurrent INSERT design had lock-blocking race → redo with two physically separate `pg.Client` + 10s deadline + commit-first-then-second-inserts; (4) candidate_submissions needs `full_name + phone` (NOT NULL) → added to fixture; (5) "second active denied" STRICT `23505` (no other failures accepted); (6) RLS positive probe retains one committed case, asserts HR_MANAGER ≥ 1, PUBLIC = 0, GRANT-missing (42501) is a SEPARATE probe via `has_table_privilege` (never conflated with RLS). Tier 1 installed `@embedded-postgres/windows-x64@18.4.0-beta.17` + `pg` in C:\Users\Admin\pg-probe (out-of-repo, no package.json pollution). Driver applies all 36 migrations up to `20260912140412_n1_placement_case_rls`; SKIPS `20260831160000_public_rpc_residual_grant_revoke` (FAIL-CLOSED on fresh state, out of N1 scope; applied on hrp_mp2_test via Neon SQL Editor per DEC-07), `20260911002_av1_homepage_settings` + `20260912001_av4_media_library` (out of N1 scope; AV1/AV4 have their own cutovers). Self-test result: **25/25 PASS, exit 0** — full NDJSON + caveats in `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/{README.md, embedded-pg18-ndjson.txt}`. Discovered: PG 18 returns SQLSTATE 23001 for ON DELETE RESTRICT (vs PG 14-17 23503); probe accepts BOTH. Forward-only fix migration: NOT NEEDED — g0_schema_reconcile grants landed correctly. **hrp_mp2_test branch run remains BLOCKED-on-env**: Owner/OP sets 2 URLs in secure channel (NOT chat per credential hygiene); Tier 1 then runs probe against the actual Neon endpoint. AV6 still deferred (cùng schema luồng); AV1/AV4 indep; AV6 NOT open. Did NOT touch hrp-live. |
| 2.16 | 12/09/2026 21:30 | N1 stage_3 probe audit fix batch 2 (post-Tier-0-block). User caught 5 inaccuracy items on the runbook + probe combination: (a) `endpointIdOf()` regex `^ep-([^.-]+)` returned `'shy'` on a pooler host instead of `'shy-tree-az32as2c'` — fixed to split on `.` and strip `ep-` prefix + optional `-pooler` suffix; covers both direct and pooler routes. Unit-tested against 8 hostnames (direct, pooler, short ids, 127.0.0.1) — all PASS. (b) Prod block: probe already refused based on endpoint-id alone regardless of db name (audit fix 21:00 was correct on this point). Runbook §0/STEP 1 wording clarified to remove the `db=neondb` ambiguity. (c) Neon control-plane branch check: tightened from "non-primary branch of NEON_PROJECT_ID" to "branch whose name equals `hrp_mp2_test` (case-insensitive)" via `EXPECTED_BRANCH_NAME` env (default `hrp_mp2_test`); non-primary branches with a different name now REFUSE. Runbook STEP 1 + boot guard + commit-message template updated to match. (d) T1 true 2-tx concurrency: probe already implements c2 INSERT while A is OPEN with 800ms wall-time probe → `c2_blocked_while_a_open: true`. The `c2_blocked_while_a_open` field is an ATTRIBUTE of the T1 row, not a separate test row — confirmed count math: 26 (prior self-test) + 1 (cleanup-needed) + 1 (neon-control-plane-branch-membership) = 28 tests, not 29. (e) Cleanup: probe pushes each created ID into module-scoped `idsCreatedThisRun` BEFORE attempting INSERT and pops it only after successful DELETE; emits `cleanup-needed` row in BOTH a `catch{}` and a `finally{}` block (idempotent guard) so the exact list of uncleaned IDs is always present in NDJSON — even on uncaught exception. Runbook STEP 4 added a fallback LIKE-by-run-id-suffix query for the pathological case where NDJSON itself is missing. Also: probe.mjs relocated from `scratch/n1-stage3-db-proof/` (gitignored per hrp-v5-go-live-21) to `docs/tasks/.../evidence/stage3-self-test/probe.mjs` (Git-tracked); runbook + self-test README + PLANNER_ROADMAP_CURSOR pending-action updated to the new path. Self-test re-run: **28/28 PASS, exit 0**, `c2_blocked_while_a_open: true`, `sqlstate_c2: 23505`, `cleanup-needed: pass=true, n_ids=0`, `abnormal_exit: false`. NDJSON evidence: `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/embedded-pg18-ndjson-rerun-2026-09-12-21-30.txt`. **Important Stage-3-real-vs-self-test distinction added to runbook decision matrix**: a `passed=28` with `neon-control-plane-branch-membership.skipped=true` on a `hrp_mp2_test` run is NOT a real PASS — the check was SKIPPED, not performed. Only the local embedded-PG self-test is allowed to have `skipped=true`. **hrp_mp2_test branch run remains BLOCKED-on-env**: Owner/OP sets credentials via secure channel; control-plane branch check MUST run (not skip) on the real Stage 3 run. Tier 1 did NOT touch hrp-live, did NOT run migration on prod, did NOT open AV6. |
| 2.17 | 12/09/2026 22:15 | N1 stage_3 probe audit fix batch 3 (post-Tier-0-block round 2). Tier 0 found 3 issues on the 21:30 evidence file: (1) NDJSON file `embedded-pg18-ndjson-rerun-2026-09-12-21-30.txt` was malformed — JSON objects split across multiple lines because PowerShell `Out-File -Encoding utf8` wraps at console width (Tier-0's `ConvertFrom-Json` per-line parse found only 10 valid lines). Fix: the self-test runner (`run-embedded-pg.js`) now tees the probe's stdout to `probe-stdout.ndjson` and stderr to `probe-stderr.log` via Node `fs` directly (NOT via PowerShell pipes). The evidence file is copied via `[System.IO.File]::Copy` (raw bytes, no console transformation). The new evidence file `embedded-pg18-ndjson-rerun-2026-09-12-22-12.txt` parses cleanly: **30 lines, 30 valid JSON objects**. (2) Neon control-plane check already runs BEFORE any DB write query (it's in the boot guard before the `try { T1... }` block) — that's verified by code inspection. To make the Stage-3-real-vs-self-test distinction enforceable programmatically, the boot row now carries an explicit `stage3_real_pass` flag (false whenever skipped=true, regardless of the `pass` field). The summary row now reports `stage3_real_pass` and a `strict_stage3` flag controlled by `STRICT_STAGE3` env (when `STRICT_STAGE3=true`, any skipped=true anywhere fails the summary; the self-test does NOT set this). Probe comment now spells out: "skipped=true on hrp_mp2_test is NOT a real Stage 3 PASS". (3) Cleanup contract hardened in two places: (a) probe `idsCreatedThisRun` now wrapped by `trackCreated(id)` / `trackDeleted(id)` helpers. Each push emits `n1-trace: created <id>` to stderr; each successful delete emits `n1-trace: deleted <id>`. Operator can diff created-vs-deleted on stderr to recover uncleaned IDs even if the NDJSON file is lost. (b) DELETE-from-tracking is now guarded by `pgCall.ok && rowCount > 0` via `DELETE ... RETURNING id`; a silent DELETE failure keeps the ID in `idsCreatedThisRun` so the operator can retry. (c) Runbook's LIKE-by-run-id-suffix fallback was REMOVED — it could match another run's rows in the same time window. The new fallback is the stderr trace channel. (d) A developer-time `DB-cleanliness verifier` was added to `run-embedded-pg.js`: after probe exit, while PG is still up, it queries n1lp-*, n1c*, n1sub-* row counts. This run's verifier reports `leftover_rows=0,0,0` and prints `DB-cleanliness verifier: PASS (0 leftover rows)`. This is a developer sanity check, NOT part of the Stage 3 runbook. Self-test re-run: **28/28 PASS, exit 0**, `c2_blocked_while_a_open: true`, `sqlstate_c2: 23505`, `cleanup-needed: pass=true, n_ids=0`, `abnormal_exit: false`, `stage3_real_pass: true`. NDJSON evidence: `docs/tasks/hrp-v6-n1-placement-case-foundation/evidence/stage3-self-test/embedded-pg18-ndjson-rerun-2026-09-12-22-12.txt` (30 lines, 30 parseable). **hrp_mp2_test branch run remains BLOCKED-on-env**. Tier 1 did NOT touch hrp-live, did NOT run migration on prod, did NOT open AV6. |
| 2.18 | 12/09/2026 22:35 | N1 stage_3 probe audit fix batch 4 (post-Tier-0-block round 3). Tier 0 found 3 more issues on the v2.17 diff: (1) **Neon control-plane gate moved to STEP 1.5 (BEFORE STEP 3)**. Added `neon_branch_gate.ps1` (Git-tracked) that calls Neon API directly to confirm both endpoint-ids resolve to the SAME branch of NEON_PROJECT_ID whose name equals `hrp_mp2_test`, refuses with non-zero exit before STEP 2/STEP 3. Exit codes 10..15 cover missing-env, HTTP error, endpoint-not-found, different-branches, primary-branch, branch-name-mismatch. Probe.mjs additionally refuses with exit code 71 BEFORE any DB write when `N1_STAGE3_REAL=true` (real-run signal) but `NEON_API_KEY`/`NEON_PROJECT_ID` are missing. (2) **`stage3_real_pass` semantics re-fixed**. Previous code had `STRICT_STAGE3=false` on local self-test, so summary `stage3_real_pass=true` even when control-plane row had `stage3_real_pass=false`. Summary now ALWAYS computes `stage3_real_pass = (passed === total) && !anyRealFail` (no STRICT_STAGE3 toggle). A local self-test run therefore reports `summary.stage3_real_pass=false` by design — that signals the run is a self-test, NOT a Stage 3 PASS. Runbook STEP 5a is now a TWO-MODE gate (real run vs self-test), with the gate values table in STEP 4 explicitly distinguishing them. The `N1_STAGE3_REAL` env var is the explicit signal that replaces `STRICT_STAGE3`. (3) **NDJSON stdout/stderr captured separately; STEP 5b no longer uses `Out-File`**. New helper `write_ndjson_evidence.ps1` reads NDJSON via `[System.IO.File]::ReadAllText`, parses each line with `ConvertFrom-Json` in a per-line try/catch, refuses to commit if any line is unparseable, writes sanitized file via `[System.IO.File]::WriteAllText` (raw bytes, no console transformation). STEP 4 redirects 1> stdout.ndjson / 2> stderr.log; STEP 5b copies both files via the helper. The stderr `n1-trace:` channel is now end-to-end — operator can diff created-vs-deleted to recover uncleaned IDs even if NDJSON is truncated. Corrupt-NDJSON self-test: helper exits 1 on broken file. Self-test re-run: **28/28 row-level pass, summary.stage3_real_pass=false** (SELF-TEST MODE — `N1_STAGE3_REAL` unset on local embedded PG, by design), probe exit 1, `abnormal_exit=false`, T1 `c2_blocked_while_a_open=true`, `sqlstate_c2=23505`, `cleanup-needed pass=true, n_ids=0`, DB-cleanliness verifier `leftover_rows=0,0,0`, stderr trace 6 created / 6 deleted parity. Captured to `embedded-pg18-ndjson-rerun-2026-09-12-22-25.txt` (30 lines, 30 parseable) + `embedded-pg18-stderr-rerun-2026-09-12-22-25.txt` (separate stderr channel). N1_STAGE3_REAL=true refuses exit 71 when NEON creds missing (verified). **hrp_mp2_test branch run remains BLOCKED-on-env**. Tier 1 did NOT touch hrp-live, did NOT run migration on prod, did NOT open AV6. |
| 2.19 | 12/09/2026 23:00 | N1 stage_3 probe audit fix batch 5 (post-Tier-0-block round 4). Tier 0 caught 3 issues on the v2.18 diff: (1) **STEP 5a self-test gate counter was wrong.** It required `lines.Count -ne 28`, but the NDJSON file actually carries **30 JSON lines** (1 URL-side boot log via `console.log` + 28 `row()` calls + 1 summary via `console.log`). Fix: STEP 5a now parses the `summary` row with `ConvertFrom-Json` and requires `summary.total == 28` directly (the probe's authoritative row count). Additionally it verifies the file shape: exactly 1 URL-side boot log (kind:'boot' with no `test` field and `admin_fp` present), plus 28 data rows, plus 1 summary = 30 JSON lines. Real-run branch uses the same ConvertFrom-Json-based verification for both modes. (2) **`write_ndjson_evidence.ps1` was used for both stdout and stderr** — its filter `if ($l[0] -eq '{')` silently DROPPED every `n1-trace:` line on stderr, leaving an empty trace evidence file exactly when Tier 0 needed it. Fix: a NEW `copy_stderr_trace.ps1` is the dedicated companion for stderr. `write_ndjson_evidence.ps1` (NDJSON helper) refuses if any `{`-line is unparseable (exit 21), zero `{`-lines (exit 22), or if the source contains `n1-trace:` lines (exit 23 — channel-mix safety). `copy_stderr_trace.ps1` refuses if zero `n1-trace:` lines (exit 31 — empty-trace safety) or if the source has `{`-lines (exit 32 — channel-mix safety), and emits a header explaining the recovery channel. STEP 5b uses both helpers and adds a sanity assertion `created >= 1 && deleted >= 1`. Both helpers use `Continue` + `[Console]::Error.WriteLine` so a refusal preserves the intended `exit N` (the old `Stop` + `Write-Error` combo turned refusal into a terminating exception that PowerShell translated to exit code 1 regardless of our `exit N`). (3) **`neon_branch_gate.ps1` correctness bugs**: `host.Contains(endpointId)` was a SUBSTRING match (would falsely accept `shrub` against `ep-shrub-extended...`); fixed to normalize the API-returned host via `endpointIdOf` and require EXACT equality. Property access on `$adminBranch.id` / `$writerBranch.id` could throw if either was `$null`, blocking the documented exit 12; fixed with explicit null-check BEFORE any property access. Same `Stop` + `Write-Error` exit-code issue was also present in this gate — fixed with `Continue` + `Refuse(N, msg)` helper that uses `[Console]::Error.WriteLine`. New `NEON_API_BASE` env var allows offline testing against `fake_neon_api.js` stub. New test scripts: `test-neon-branch-gate.ps1` exercises every exit (0, 12, 13, 14, 15) including a substring-false-match case; `test-evidence-helpers.ps1` exercises every exit of both helpers with fake data (PASS, 8/8 assertions, 6/6 scenarios). Self-test runner (`run-embedded-pg.js`) was also updated to strip NEON_API_KEY / NEON_PROJECT_ID / N1_STAGE3_REAL from the parent shell env before `spawn(node)` so the self-test can NEVER accidentally run in real-run mode. Self-test re-run: **28/28 row-level pass, summary.stage3_real_pass=false** (self-test mode by design), probe exit 1, `abnormal_exit=false`, T1 `c2_blocked_while_a_open=true`, T1 `sqlstate_c2=23505`, `cleanup-needed pass=true, n_ids=0`. DB-cleanliness verifier `leftover_rows=0,0,0` PASS. stderr trace 6 created / 6 deleted parity. Captured to `embedded-pg18-ndjson-rerun-2026-09-12-23-00.txt` (30 JSON lines, ALL 30 parseable via ConvertFrom-Json) + `embedded-pg18-stderr-rerun-2026-09-12-23-00.txt` (12 n1-trace lines preserved: 6 created + 6 deleted, header explains recovery channel). **hrp_mp2_test branch run remains BLOCKED-on-env**. Tier 1 did NOT touch hrp-live, did NOT run migration on prod, did NOT open AV6. |
| 2.20 | 12/09/2026 23:35 | N1 stage_3 evidence-rigor batch 6 (post-Tier-0-block round 5+6). Tier 0 caught 2 critical accuracy bugs blocking push: (A) **STEP 5a real-run guard inverted truth table**. Old guard `if (-not (field-present) -or $summary.stage3_real_pass) { throw }` threw when the value was TRUE (rejecting real PASS) and accepted when the value was FALSE (letting real FAIL through). Fix: guard now requires the field to be PRESENT AND a strict-typed `[bool] $true` (verified empirically that `$x -eq $true` is NOT strict enough — string "true" compares equal). Replaced with `if (($srp -isnot [bool]) -or (-not $srp)) { throw }`. New test `test-step5a-gate.ps1` exercises 5 cases — V0 (buggy) vs V1 (fixed) inversion proofs for case-A (real PASS) and case-B (real FAIL), plus case-C (missing), case-D (string "true"), and case-E (runbook file contains fixed guard, no buggy guard). **5/5 PASS.** (B) **Harness deadlock in `test-neon-branch-gate.ps1`**. Old harness used `Start-Process powershell -NoNewWindow -PassThru -Wait` + stderr file redirect, which combined with PowerShell's nested-host `RemoteException` framing produced exit_code=4294967295 on the prior task. Rewritten with `System.Diagnostics.Process` + `ProcessStartInfo { UseShellExecute=$false; RedirectStandardOutput=$true; RedirectStandardError=$true; CreateNoWindow=$true }` and synchronous `StandardOutput.ReadToEnd()` + `StandardError.ReadToEnd()` BEFORE `WaitForExit()` (avoids the documented BeginOutputReadLine + STA deadlock). Endpoint-id in PASS scenario changed from prod-shaped `shy-tree-az32as2c` to test-only `mp2-test-ep-001` so the offline harness does not accidentally look like it's pointing at production. Re-run **6/6 PASS** with the gate's actual exit codes (0, 12, 12, 13, 14, 15) in 8.7s wall time. Evidence: `neon-branch-gate-rerun-2026-09-12-23-35.log` (gate) + `step5a-gate-rerun-2026-09-12-23-35.log` (STEP 5a). Tier 0 directive 12/09/2026 23:30 grants push authority for this batch. **hrp_mp2_test branch run remains BLOCKED-on-env**; no prod migration; AV6 still deferred; AV1/AV4 indep. |
| 2.21 | 13/09/2026 09:35 | **AV2 JobPosting editor shell (read-only) — vòng độc lập với Stage 3 N1**. Tier 0 quyết định 13/09/2026 09:20 (hoãn Stage 3 N1 trên `hrp_mp2_test` đến khi có credential, KHÔNG hủy gate; chưa áp migration N1 lên hrp-live; chưa mở N1 intake writer hoặc AV6 CMS). Tier 1 triển khai tiếp lộ trình V6 với AV2 editor shell như phần việc độc lập. Khảo sát code trước khi chốt phạm vi: model `JobPosting` chỉ có id/slug/revision/status/publishedAt/archivedAt + FK `jobOpeningId` (không có field editorial); section content đang là fixture local (`src/domains/job-board/fixtures/detail-sections.fixture.ts`); KHÔNG có API ghi JobPosting/section content; UI04d public detail vẫn đọc từ `Project` (qua `getPublicJobDetail`). Phạm vi đã chốt: (1) `src/domains/staffing/job-posting-list.service.ts` (read-only, Prisma, DTO đã serialize Date → ISO); (2) `app/admin/jobs/job-postings/page.tsx` (list view với filter status + pagination, cùng tập VIEWER_ROLES với `/api/admin/job-opening-status`); (3) `app/admin/jobs/job-postings/[id]/page.tsx` (detail view + preview pane render bằng component UI04d đã có + fixture DEMO); (4) `app/admin/jobs/page.tsx` thêm 1 link nhỏ tới AV2. **KHÔNG** có nút Lưu/Publish (instruction: không mở API ghi mới; publish chờ contract N3). **KHÔNG** thêm schema/migration. Gates PASS: typecheck PASS, `design-tokens.static.test.ts` 12/12 PASS, `job-posting-list.service.test.ts` 18/18 PASS (12 cho listJobPostingsForAdmin: default take/skip/status + clamp take âm/lớn/NaN/0 + serialize Date + orphan handling + Prisma throw bubble-up; 6 cho getJobPostingForAdmin: id empty/null guard + not-found + Date mapping + orphan + Prisma throw), full staffing+job-board suite 223/223 PASS (job-opening-status 5/5, job-opening-status-card 2/2, public-board-architecture 17/17, detail-sections-policy 34/34, ...), 0 lint errors (22 warnings `any` theo pattern cũ trong mock). Audit theo rủi ro: chỉ scope đọc, đã có gate `job-opening-status` để tham chiếu; không cần audit nặng. Tính năng dùng được: xem danh sách JobPosting (slug/status/revision/jobOpeningId/staffingOrderCode) + xem trước bản nháp (preview pane dùng fixture DEMO). Phần bị khóa ghi rõ trong UI footer: lưu section content → AV2 backend (Postgres persistence + API ghi), publish JobPosting → contract N3, section content thật (REAL) thay vì DEMO → AV2 backend + AV6 CMS, gallery media → AV4 integration. N1 Stage 3 evidence chuẩn bị (commit 03fecc2) vẫn on origin/main, Stage 3 thật vẫn BLOCKED-on-env. Chờ Tier 0 duyệt push. |
| 2.24 | 13/09/2026 10:55 | **hrp-v6-admin-overview-dashboard v1 — CODE DONE + PUSHED**. Tier 0 directive 13/09/2026 10:33: mở ngay (không cần xin duyệt lại) + triển khai vòng đầu 3 KPI cards theo đúng 6 ràng buộc: (1) trạng thái thật trong schema — `JobOpening.status='OPEN'`, `CandidateSubmissionStatus.NEW`, `TicketStatus.PENDING`; (2) ma trận quyền RIÊNG từng KPI — `KPI1_ALLOWED` (m13 hrp_project_visible_for: ADMIN/HR_MANAGER/DIRECTOR/SALE/PM), `KPI2_ALLOWED` (m14 hrp_candidate_submission_scope: thêm ACCOUNTANT + PM, HR_STAFF vẫn deny), `KPI3_ALLOWED` (m1_07a hrp_ticket_visible: root + HR_STAFF + PM; ACCOUNTANT PENDING ngoài quyền; SALE deny); (3) `hasPermission=false` KHÔNG query DB (spy test verify) → fallback "Không có quyền xem", `href: null`; (4) value=0 hiển thị "0" + scopeLabel (KHÔNG giả fallback); (5) ScopeLabel "toàn hệ thống" cho root + "trong phạm vi của bạn" cho PM; (6) Prisma throw bubble-up → page bắt "Chưa tải được số liệu". Link chỉ tới `/admin/jobs`, `/admin/applications`, `/admin/tickets`. Giữ nguyên 9 SECTION_CARDS điều hướng. Gates: `npx tsc --noEmit` PASS; `npx vitest run src/domains/admin/` **34/34 PASS**; `npx eslint` 0 errors; **`npx next build` PASS** `Compiled successfully in 15.7s`, route `/admin` 175 B Dynamic; **Tier 3 LIGHT audit round 1 PASS** (sub-agent `0d259610-ef8a-41fc-8372-b2f505e7c2eb`, 14/14 điểm: 7 read permission + 7 data display, 0 blockers, 0 debt, 0 coverage gaps); `git push origin main` PASS `bbc81b9..a8517c7` (5 file changed, 762 insertions, 5 deletions). Cursor chuyển `current_gate` sang `DASHBOARD_V1_BUILT_READY_FOR_DEPLOY`; AV2 cũ vẫn ở `AV2_EDITOR_SHELL_BUILT_READY_FOR_DEPLOY` (chờ Vercel deploy); N1 Stage 3 vẫn BLOCKED-on-env; AV6 defer. Nếu credential N1 đến trong lúc vòng sau → dừng an toàn, quay lại Stage 3 theo runbook. |

---

*Cập nhật lần cuối: 13/09/2026 10:55 +07:00 bởi Tier 1 Agent*
