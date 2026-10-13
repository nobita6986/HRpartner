# EXECUTION REALIGNMENT DISCOVERY

**Refreshed baseline SHA:** `a87784229e8f06369082cfcd0e36ec63352dadb7` (origin/main HEAD verified 2026-10-13 sau PR #134).
**Supersede baseline cũ:** `1059f6669482efac5b7956ef25d43996ca59d515` (2026-09-21).
**Authority:** `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §1, §17–§45, §46–§53.

Báo cáo này là khảo sát trạng thái toàn bộ Realignment Plan (P0 → P5, M0 → M5) đối chiếu với `origin/main` hiện hành. Báo cáo READ-ONLY; mọi kết luận phải có file/SHA/PR/run evidence. Status milestones dùng đúng taxonomy §15.2.

## 1. Trạng thái các phase P0 (Safety Foundations — Realignment Plan §17–§22)

### P0-A Evidence Gateway (§17)

Trạng thái hiện tại đối chiếu `origin/main @ a8778422`:

- **P0-A01 Audit current file/evidence handling:** `ACCEPTED_HISTORICAL_AUDIT_NEEDS_REFRESH`. Audit doc tồn tại tại `docs/discovery/realignment/EVIDENCE_STORAGE_AUDIT.md` (đang được refresh đồng thời trong lane này).
- **P0-A02 Add EvidenceStorage port:** `ACCEPTED_IMPLEMENTATION_VERIFIED`. File `src/domains/evidence/evidence-storage.port.ts` định nghĩa provider-neutral port, `StorageKey` brand, `EvidenceStorage` interface (write/read/delete/exists/stat). Có test tại `evidence-storage.port.test.ts`. KHÔNG có production call site wire port này ở production flow.
- **P0-A03 Add LocalVpsEvidenceStorageAdapter:** `ACCEPTED_IMPLEMENTATION_VERIFIED`. File `src/domains/evidence/local-vps-evidence-storage.adapter.ts` implement Node fs + symlink rejection + realpath containment + atomic `'wx'` write + streaming read 64 KiB + safe-message error sanitization. Có test tại `local-vps-evidence-storage.adapter.test.ts`. KHÔNG có production call site.
- **P0-A04 Add EvidenceRecord metadata:** `ACCEPTED_PRODUCTION_VERIFIED` nếu coi migration đã apply production DB. `prisma/schema.prisma` có `model EvidenceRecord`; migration `prisma/migrations/20260924120000_er003_evidence_record_metadata/migration.sql` (CHECK constraints: owner_type, evidence_type, status, checksum SHA-256, sizeBytes, storage_key, original_filename, deleted_at_invariant; RLS enabled + forced; REVOKE all). Migration chạy thành công 2026-09-24.
- **P0-A05 storeEvidence command:** `INSUFFICIENT_EVIDENCE`. Không tìm thấy EvidenceGateway implementation wire port + adapter + record.
- **P0-A06 protected evidence read:** `INSUFFICIENT_EVIDENCE`. Không tìm thấy `readEvidence` command.
- **P0-A07 delete/quarantine commands:** `INSUFFICIENT_EVIDENCE`. Không tìm thấy `quarantine` implementation.
- **P0-A08 evidence access audit:** `INSUFFICIENT_EVIDENCE`. Không có model `evidence_access_log`; grep `evidenceAccessLog` không khớp.
- **P0-A09 production/test environment guard:** `INSUFFICIENT_EVIDENCE`. Adapter có `defaultEvidencePathResolver` fail-closed nếu `HRP_EVIDENCE_ROOT` missing/blank/not absolute. NHƯNG không thấy logic chặn "Vercel/test" dùng adapter này (chưa có `REAL_EVIDENCE_STORAGE_ENABLED` integration-level).
- **P0-A10 backup/restore runbook + restore test:** `NOT_STARTED`. File `EVIDENCE_BACKUP_RESTORE_RUNBOOK.md` chưa tồn tại ở main.

Tổng P0-A: 4/10 ACCEPTED (A01 audit doc cần refresh, A02 port, A03 adapter, A04 metadata); 5/10 INSUFFICIENT_EVIDENCE; 1/10 NOT_STARTED.

### P0-B Deployment Boundary (§19)

- **P0-B01 environment matrix:** `NOT_STARTED`. `docs/ops/ENVIRONMENT_MATRIX.md` không tồn tại ở main. Branch `codex/hrp-vps-go-live-docs` (02/10) chưa merge.
- **P0-B02 production filesystem setup:** `IN_PROGRESS`. PR #93 (VPS public GHCR fix) merge 2026-10-04. Branch `vps-image-retention-hotfix` (12/10) chưa merge. VPS deploy workflow chạy thành công (xem §5).
- **P0-B03 environment validation on boot:** `INSUFFICIENT_EVIDENCE`. Chưa thấy code fail-closed ở application boot; storage-layer fail-closed có ở `LocalVpsEvidenceStorageAdapter` nhưng chưa wire integration-level.
- **P0-B04 Vercel safety guard:** `INSUFFICIENT_EVIDENCE`. Chưa thấy Vercel-specific guard.

Tổng P0-B: 0/4 ACCEPTED; 1/4 IN_PROGRESS; 2/4 INSUFFICIENT_EVIDENCE; 1/4 NOT_STARTED.

### P0-C HRP↔CRM Contract Source of Truth (§20)

- **P0-C01 inventory existing HRP/CRM contracts:** `IN_PROGRESS` (chỉ có discovery `CRM_CONTRACT_GAP_REPORT.md` một chiều từ HRP; CRM repo không thể truy cập từ workspace).
- **P0-C02 create contract authority:** `NOT_STARTED`. Chưa thấy `hrp-contracts` repo / NPM package / OpenAPI repo.
- **P0-C03 define IntegrationEventEnvelope:** `NOT_STARTED`.
- **P0-C04 define idempotency semantics:** `INSUFFICIENT_EVIDENCE` (internal idempotency ở `src/shared/integrity/idempotency.ts` dùng cho placement routes; chưa có shared S2S contract).
- **P0-C05 define error taxonomy:** `INSUFFICIENT_EVIDENCE` (placement routes có `SAFE_CODE_MESSAGES` ở `recruiter-workbench.placement-actions.states.ts`; chỉ local).
- **P0-C06 pin initial shared DTOs:** `INSUFFICIENT_EVIDENCE` (HRP internal DTOs ở `src/shared/types`; chưa shared với CRM).

Tổng P0-C: 0/6 ACCEPTED; 1/6 IN_PROGRESS; 4/6 INSUFFICIENT_EVIDENCE; 1/6 NOT_STARTED.

### P0-D S2S / Outbox (§21)

- **P0-D01 S2S authentication proof:** `INSUFFICIENT_EVIDENCE`.
- **P0-D02 one idempotent mutation proof:** `INSUFFICIENT_EVIDENCE`.
- **P0-D03 outbox contract/proof:** `NOT_STARTED`.
- **P0-D04 retry/dedupe test:** `NOT_STARTED`.

Tổng P0-D: 0/4 ACCEPTED; 2/4 INSUFFICIENT_EVIDENCE; 2/4 NOT_STARTED.

### P0-E CI / Governance Simplification (§22)

- **P0-E02 define Direct Fix class:** `INSUFFICIENT_EVIDENCE`. Chưa thấy classification rule tài liệu chính thức; PR #131 `t1d-business-code-standard` (merge 12/10) là style/lint, không phải Direct Fix class.
- **P0-E03 document test matrix by task risk:** `INSUFFICIENT_EVIDENCE`. Có `.ai-pipeline/scripts/verify-encoding.mjs` + `verify-encoding-range.mjs` nhưng chưa phải test matrix per task risk.

Tổng P0-E: 0/2 ACCEPTED; 2/2 INSUFFICIENT_EVIDENCE. (P0-E01 không tồn tại trong plan §22.)

## 2. Trạng thái P1 đến P5 (Realignment Plan §23–§45)

### P1 Thin Recruitment Value Slice (§23)

- **P1-A JobPosting public slice (§24):** `CODE_COMPLETE_DEPLOYED_AWAITING_REAL_USER_PILOT`. P1-A0, A0-1, A0-2, A0-3, A0-4, A0-5, A1; PR #55, #57, #65, #67, #68, #69, #73 đã merge. Test + ×3 zero-residue E2E (P1-Final closeout). VPS deploy success.
- **P1-B Public Apply (§25):** `CODE_COMPLETE_DEPLOYED_AWAITING_REAL_USER_PILOT`. `docs/tasks/hrp-p1-b-public-apply/`. Test + VPS deploy.
- **P1-C LaborProfile create-or-match (§26):** `CODE_COMPLETE_DEPLOYED_AWAITING_REAL_USER_PILOT`. EXACT/POSSIBLE/NEW. `intake-writer.service.ts`. Test + VPS deploy.
- **P1-D PlacementCase + NextAction (§27):** `CODE_COMPLETE_DEPLOYED_AWAITING_REAL_USER_PILOT`. **NextAction = `IMPLEMENTED_CANONICAL`** — closed enum 7 giá trị (`OPEN_INTAKE`, `REQUEST_DOCS`, `SCREEN_SUBMISSION`, `SCHEDULE_SCREEN`, `AWAITING_RESULT`, `REVIEW_PLACEMENT`, `NONE`) ở `src/domains/talent/recruiter-workbench.types.ts`; `deriveNextAction` ở `recruiter-workbench.read-service.ts`; F-06 gate `isPlacementReadyRow` ở `recruiter-workbench.placement-actions.states.ts`; field `nextAction` trong `RecruiterWorkbenchRow` DTO; test `recruiter-workbench.derive.test.ts`. NextAction không lưu DB (server-derived).
- **P1-E Simple Recruiter Workbench (§28):** `CODE_COMPLETE_DEPLOYED_AWAITING_REAL_USER_PILOT`. P1-E0 (read model) + P1-E1 (UI); PR #61, #62.
- **P1-F Placement (§29):** `CODE_COMPLETE_DEPLOYED_AWAITING_REAL_USER_PILOT`. SELECTED/CONFIRMED/EFFECTIVE/FAILED/CANCELLED + CLIENT_MANAGED/HRP_MANAGED. P1-F0 + P1-F1; PR #58, #59, #63, #64; P1-Final closeout PR #73.

Tổng P1: 6/6 `CODE_COMPLETE_DEPLOYED_AWAITING_REAL_USER_PILOT`.

### P2 V8.0 Workspace Shell + V8.2 Recruiter Microsite (§32–§35)

- **P2-A V8.0 Workspace Shell:** `NOT_STARTED`. Không có task docs; không có V8 doc ở main. Pre-P2 hotfix (PR #104 menu cleanup, #108 staffing order, #112 sidebar, #113/#115/#117/#120 worker ops, #126 staffing order slot, #114 project mgmt) là technical debt cho admin shell, KHÔNG tạo P2 value slice.
- **P2-B V8.2 Recruiter Microsite:** `NOT_STARTED`. Không có microsite route ở main. PR #87 `t1c-p2-execution-split-decision` chỉ là decision docs, không tạo code.

Tổng P2: 0/2 NOT_STARTED.

### P3 Recruiter Growth Slice (§36–§42)

- **P3-A Verified Profile:** `NOT_STARTED`.
- **P3-B Appearance Lite:** `FOUNDATION_ONLY`. Theme foundation (PR #133, T1C) + theme picker + contrast (PR #134, T1B) + apply CTA tone (PR #132) + paging tone (PR #130) chỉ là **public portal style foundation** (5 brand palette, soft contrast, HRP Orange cho admin). KHÔNG đóng P3-B Recruiter Appearance Lite — thiếu: accent color picker per-recruiter, layout preset, cover/avatar, section ordering, desktop/mobile preview cho recruiter.
- **P3-C Featured Jobs:** `NOT_STARTED`.
- **P3-D Share Kit Lite:** `NOT_STARTED`.
- **P3-E Universal AFF enablement (5-recruiter usage):** `INSUFFICIENT_EVIDENCE`.

Tổng P3: 0/5 ACCEPTED, 1/5 FOUNDATION_ONLY.

### P4 Workspace / V8.1 Kanban (§43)

- `NOT_STARTED`. Không có task docs; không có V8.1 Kanban code.

### P5 V9 Expansion (§44–§45)

- `NOT_STARTED`. Chỉ có V9 docs (deferred). Chưa có evidence real data.

## 3. Universal AFF (theo `docs/V6/aff_plan.md` §0.2, §14.1, §15.1)

Denominator: 7 (AFF-01..AFF-07).

| ID | Trạng thái | Source evidence | Production evidence |
|---|---|---|---|
| **AFF-01** Universal identity + data foundation | `ACCEPTED_PRODUCTION_VERIFIED` | `tier1/hrp-v6-n2-aff-02-link-capture` (18/09); `prisma/schema.prisma` `User.affCode` | production verified |
| **AFF-02** Link capture + shared self-service | `ACCEPTED_PRODUCTION_VERIFIED` | `tier1/hrp-v6-n2-aff-02-link-capture`; CTV dashboard live | production verified |
| **AFF-03** Public apply attribution boundary | `ACCEPTED_PRODUCTION_VERIFIED` | `tier1/hrp-v6-n2-aff-03-apply-attribution` (21/09); `-03b-rls-runtime-fix` (RLS 42501 fix); `-03c-cs-labor-profile-fix` (21/09) | production verified |
| **AFF-04** Conversion + SourceClaim + ProjectAssignment propagation | `ACCEPTED_PRODUCTION_VERIFIED` | `t1b-aff04-conversion-propagation` 24/09; main `8b8e39b` (PR #35); `docs/tasks/hrp-v6-n2-aff-04-conversion-propagation/HANDOFF.md` | production verified |
| **AFF-05A** LaborProfile handling + Company Pool + dispute (residual) | `PARTIAL` — R1+R2 ACCEPTED; residual Company Pool/dispute CHƯA | `t1b-aff05a-r1-canonical-initial-handling` 23/09; `t1b-aff05a-r2-bounded-manager-assignment` 24/09; PR #43 (24/09); W5 (`tier1/hrp-v6-w5-handling-assignment-safety`). W5 chỉ chứng minh RLS + elapsed assignment sweep + REVOKED semantics — KHÔNG chứng minh toàn bộ Company Pool/dispute của AFF-05A (`aff_plan.md` §0.2) | R1+R2 ACCEPTED; residual Company Pool/dispute chưa production verify |
| **AFF-05B** Universal commission beneficiary | `NOT_STARTED` | chưa có task | n/a |
| **AFF-06** Analytics + dashboard + abuse hardening | `NOT_STARTED` | chưa có task; chờ AFF-OQ-11 (retention) | n/a |
| **AFF-07** Rollout + operations + cleanup | `NOT_STARTED` | chưa có task | n/a |

Tổng AFF: 4 ACCEPTED_PRODUCTION_VERIFIED; 1 PARTIAL; 2 NOT_STARTED (05B, 06); 1 NOT_STARTED (07).

Lưu ý từ `aff_plan.md` §0.2: "Full feature Definition of Done tại §23 chưa đạt; `ACCEPTED` của AFF-03C không phải `ACCEPTED` cho Universal AFF." → KHÔNG tuyên bố "AFF hoàn tất" dù 4/7 sub-items production-verified.

## 4. Milestones M0 → M5 (Realignment Plan §46)

| M | Tên | Trạng thái | Bằng chứng |
|---|---|---|---|
| **M0** | Production Safety Ready | `PARTIAL` | P0-A 4/10 ACCEPTED; P0-B 0/4; P0-C 0/6; P0-D 0/4; P0-E 0/2. Thiếu ENVIRONMENT_MATRIX, audit, restore drill, fail-closed integration, contract authority, S2S proof. |
| **M1** | One Recruiter End-to-End | `CODE_COMPLETE_DEPLOYED_AWAITING_REAL_USER_PILOT` | P1 chain 6/6 code-complete; CI `38372807924` + VPS `38373171674` success sau PR #134; ×3 zero-residue E2E. Pilot recruiter thật chưa chạy. |
| **M2** | Recruiter Public Distribution | `NOT_STARTED` | Microsite route chưa tồn tại. |
| **M3** | CRM Integration Proof | `INSUFFICIENT_EVIDENCE` | Contract authority + S2S proof chưa có. |
| **M4** | 5 Recruiters Repeated Usage | `INSUFFICIENT_EVIDENCE` | Pilot chưa chạy. |
| **M5** | V9 Expansion Decision | `NOT_STARTED` | Chưa có evidence real data. |

Ghi chú: P0-A KHÔNG chặn M1 pilot vì P1 flow không yêu cầu upload CCCD/file nhạy cảm thật ở production. P0-A chỉ chặn `REAL_EVIDENCE_STORAGE_ENABLED=true`. Pilot phải tối thiểu hóa PII: synthetic data, không CCCD, mask screenshot, không thêm dependency mới.

## 5. Deployment evidence hiện tại

Từ `gh run list` (verified 2026-10-13):

```
Deploy HRP to VPS   38373171674  main  workflow_run  4m9s   2026-10-13T09:00:00Z   (sau PR #134)
CI                  38372807924  main  push          3m0s   2026-10-13T08:56:58Z   (PR #134 merge)
Deploy HRP to VPS   38279395808  main  workflow_run  3m46s  2026-10-12T16:43:31Z   (sau PR #133)
CI                  38279052656  main  push          2m58s  2026-10-12T16:40:31Z   (PR #133 merge)
Deploy HRP to VPS   38256227331  main  workflow_run  3m57s  2026-10-12T13:31:03Z   (sau PR #132)
CI                  38255822673  main  push          3m32s  2026-10-12T13:27:28Z   (PR #132 merge)
```

- CI Quality job (schema · typecheck · lint · unit · build) trong Quality workflow: pass.
- CI Integration job (DB tests · fail-closed) trong Integration workflow: pass.
- Deploy HRP to VPS workflow: pass (sau mỗi merge main).

## 6. Code vs Tài liệu & Trình tự

- **Code đã deploy production:** P1-A..P1-F (6/6), AFF-01..AFF-04, AFF-05A-R1+R2 (ACCEPTED, R2 chờ T0 production preflight), W5 (handling assignment safety).
- **Code chỉ có implementation/test chưa wire production:** P0-A02 port, P0-A03 adapter.
- **Code có migration production:** P0-A04 `evidence_records` (24/09).
- **Chỉ có tài liệu:** V8, V9, HRP↔CRM contract, P0-B deployment matrix, P0-A05..A10 lifecycle/audit/guard/runbook.
- **Trình tự plan:** P0 trước, P1 sau, P2+. P0 chưa hoàn tất, nhưng P1 đã chạy được vì P1 flow không yêu cầu evidence thật.

## 7. Dependencies & Next Safe Action

### Dependency thực sự

- **P0-A05..A10 chỉ chặn:** `REAL_EVIDENCE_STORAGE_ENABLED=true` (production nhận CCCD/evidence thật).
- **P0-B01..B04 chỉ chặn:** production deploy preflight chính thức (hiện tại VPS đã chạy nhưng thiếu tài liệu + fail-closed integration).
- **P0-C/D chỉ chặn:** CRM integration-dependent capability (M3, M5).
- **P2-A cần:** ActorContext, permissions, workspace navigation ổn định.
- **P2-B cần:** recruiter public profile, public JobPosting, public Apply, public security boundary.

P0-A và P0-B là 2 workstream độc lập, có thể chạy song song sau khi discovery refresh xong.

### Next safe action (theo thứ tự T0 chốt 2026-10-13)

1. **Refresh 6 discovery file** (lane này, `codex/t1b-realignment-discovery-refresh-20261013`).
2. **M1 pilot readiness** — chạy pilot 1 recruiter thật + synthetic data + không CCCD. Phải đạt `M1_PILOT_READY` trước, sau đó `M1_ACCEPTED_PRODUCTION_VERIFIED` (T0 corrections C-04).
3. **P0-A lifecycle/security** (A05..A10) — song song với M1 pilot (không chặn pilot).
4. **P0-B deployment boundary** (B01..B04) — song song với M1 pilot.
5. **P0-C/P0-D contract decision** — T0 chốt mechanism + S2S auth.
6. **P2 decision** — T0 quyết mở P2-A (V8 Shell) hay P2-B (V8.2 Microsite) trước.
7. **P3** chỉ sau khi M1 pilot xong.
8. **P4/P5** chỉ sau khi có evidence real data.

### KHÔNG mở P2/P3 dựa trên discovery package cũ

Phát hiện từ vòng T1B: discovery matrix §49 cũ ghi NextAction = `NOT_IMPLEMENTED` trong khi source trên main chứng minh `IMPLEMENTED_CANONICAL`. Mọi quyết định P2+ phải dùng discovery đã refresh.

## 8. Artifact Liên kết

- [EVIDENCE_STORAGE_AUDIT.md](./EVIDENCE_STORAGE_AUDIT.md) — refreshed
- [CRM_CONTRACT_GAP_REPORT.md](./CRM_CONTRACT_GAP_REPORT.md) — refreshed
- [THIN_SLICE_CAPABILITY_MATRIX.md](./THIN_SLICE_CAPABILITY_MATRIX.md) — refreshed (NextAction = IMPLEMENTED_CANONICAL)
- [CURRENT_CI_COST_REPORT.md](./CURRENT_CI_COST_REPORT.md) — refreshed (CI run hiện tại)
- [BLOCKER_REGISTER.md](./BLOCKER_REGISTER.md) — refreshed (đóng BLK-01, BLK-06; thêm BLK-07..09)
