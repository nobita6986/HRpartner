# BLOCKER REGISTER

Tài liệu quản lý và theo dõi các điểm nghẽn (Blockers) hiện tại dựa trên `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`, đối chiếu với `origin/main @ a87784229e8f06369082cfcd0e36ec63352dadb7` (verified 2026-10-13 sau PR #134).

Refresh baseline: `a87784229e8f06369082cfcd0e36ec63352dadb7` (supersede baseline cũ `1059f6669482efac5b7956ef25d43996ca59d515` từ 2026-09-21).
Authority: `docs/HRP_EXECUTION_REALIGNMENT_PLAN.md` §1, §17–§22, §46–§51.
Báo cáo khảo sát song hành: vòng T1B (REALIGNMENT_PARTIAL).

## Trạng thái các blocker cũ

| ID | Severity | Affected Phase | Description (cập nhật) | Evidence (current main) | Owner | Status | Exit Condition | Task/Lane |
|---|---|---|---|---|---|---|---|---|
| **BLK-01** | `P0/HIGH` | P1 (Thin Recruitment Slice) | Lỗi RLS 42501 trên bare writer path. | Fixed 2026-09-21 bởi `tier1/hrp-v6-n2-aff-03b-rls-runtime-fix` (RLS + GUC). AFF-03B CLOSED. | Tier 1B | `CLOSED` (2026-09-21) | Đã PASS — `submitPublicIntake` không còn lỗi 42501. | `tier1/hrp-v6-n2-aff-03b-rls-runtime-fix` (AFF-03B) |
| **BLK-02** | `P0/HIGH` | P0-A (Evidence Gateway) | Thiếu Storage Adapter cho tệp nhạy cảm (CCCD). | P0-A02 `EvidenceStorage` port (file `src/domains/evidence/evidence-storage.port.ts`) đã ACCEPTED_IMPLEMENTATION_VERIFIED. P0-A03 `LocalVpsEvidenceStorageAdapter` (file `src/domains/evidence/local-vps-evidence-storage.adapter.ts`) đã ACCEPTED_IMPLEMENTATION_VERIFIED. CHƯA có `storeEvidence` command (P0-A05), protected read (P0-A06), delete/quarantine (P0-A07), access audit (P0-A08), production/test environment guard integration-level (P0-A09), backup/restore runbook (P0-A10). | Tier 1B | `PARTIAL — IMPLEMENTED_NOT_PRODUCTION_WIRED` | Hoàn tất P0-A05..A10 + wire call site production + restore drill PASS. | `hrp-p0-a02-er001-evidence-storage-port/`, `hrp-p0-a03-er002-local-vps-evidence-storage-adapter/`, `hrp-p0-a04-er003-evidence-record-metadata/` (đã merge). Còn lại A05..A10 chưa có task docs. |
| **BLK-03** | `P0/HIGH` | P0-B (VPS Boundary) — Realignment Plan §19 | Chưa có Production VPS Boundary. | VPS deploy workflow (`Deploy HRP to VPS`) đã chạy thành công nhiều lần (CI `38372807924` + VPS `38373171674` sau PR #134; `38279395808` sau PR #133; `38256227331` sau PR #132). Tuy nhiên `docs/ops/ENVIRONMENT_MATRIX.md` chưa tồn tại; boot-time fail-closed validation chưa thấy code (B03); Vercel safety guard chưa thấy (B04). | Owner / OP | `PARTIAL — DEPLOYED_NOT_DOCUMENTED` | Hoàn tất P0-B01..B04 + merge `ENVIRONMENT_MATRIX.md`. | Chưa có task docs chính thức. Branch `codex/hrp-vps-go-live-docs` (02/10) và `vps-image-retention-hotfix` (12/10) chưa merge. PR #93 (VPS public GHCR fix) đã merge 04/10. |
| **BLK-04** | `P0/MEDIUM` | P0-C (HRP↔CRM Contract) — Realignment Plan §20 | Chưa có HRP↔CRM Contract Authority. | Internal idempotency ở `src/shared/integrity/idempotency.ts` (chỉ local). HRP internal DTOs ở `src/shared/types`. CHƯA có `IntegrationEventEnvelope`, `ActorRef/ConversationRef/ClientContactRef`, outbox table, shared contract authority. CRM repo không thể truy cập từ workspace HRP (gap report chỉ một chiều). | Owner | `OPEN` | T0 chốt contract mechanism (NPM package / OpenAPI / monorepo) + S2S auth (mTLS / JWT / Preshared). | Chưa có task docs. |
| **BLK-05** | `P0/MEDIUM` | All | Thiếu Discovery Phase (0/6 Artifacts). | 6 file đã sinh tại `docs/discovery/realignment/` từ 2026-09-21 nhưng đã drift. Vòng T1B hiện refresh 6 file về baseline `a8778422`. | Tier 1B (refresh) | `REFRESH_IN_PROGRESS` (T1B, branch `codex/t1b-realignment-discovery-refresh-20261013`) | Commit + push + light audit. 6 file khớp `origin/main @ a8778422`. | `t1b-realignment-discovery-refresh-20261013` (lane hiện tại) |
| **BLK-06** | `P2/MEDIUM` | V8/V9 | V8/V9 chưa được phép tự động thực thi. | Hierarchy đã chốt tại `HRP_EXECUTION_REALIGNMENT_PLAN.md` §1 + `PLANNER_HANDOVER.md`. T0 đã chốt 10 quyết định 13/10/2026 giữ nguyên boundary này. | Tier 0 | `CLOSED` | Đã chốt hierarchy; T0 vẫn giữ nguyên. | (none) |

## Blocker mới phát hiện từ vòng T1B refresh

| ID | Severity | Affected Phase | Description | Evidence | Owner | Status | Exit Condition | Task/Lane |
|---|---|---|---|---|---|---|---|---|
| **BLK-07** | `P1/MEDIUM` | P1 (M1 pilot) | M1 hiện ở trạng thái `CODE_COMPLETE_DEPLOYED_AWAITING_REAL_USER_PILOT`. Pilot chưa chạy. Pilot PHẢI tối thiểu hóa PII: synthetic data, không upload CCCD, mask screenshot, không thêm dependency mới. | T0 corrections COR-08; `docs/tasks/hrp-p1-final-release-safety-closeout/TASK.md` | Tier 1B + Owner | `OPEN` | Pilot M1 chạy với 1 recruiter thật + synthetic data + không CCCD. Pilot evidence gồm API timeline, screenshot masked, recruiter xác nhận bằng văn bản. | TBD (`hrp-m1-pilot-readiness/`) |
| **BLK-08** | `P0/HIGH` | P0-A + P0-B | P0-A và P0-B chưa tách thành 2 workstream độc lập trong repo. T0 chốt 13/10/2026 cần tách. | T0 corrections COR-07 | Tier 1A + Tier 1B | `OPEN` | Mở `hrp-p0-b-vps-boundary/` (P0-B) và `hrp-p0-a-lifecycle-security/` (P0-A05..A10) như 2 task docs tách biệt. | TBD |
| **BLK-09** | `P3/MEDIUM` | P3-B (Recruiter Appearance Lite) | Theme foundation (PR #133) + theme picker (PR #134) + contrast (PR #132) chỉ là public portal style foundation. KHÔNG đóng P3-B Recruiter Appearance Lite. | `docs/tasks/hrp-t1c-theme-foundation/`, `docs/tasks/hrp-t2-public-portal-theme-picker/`, PR #133 + #134 | Tier 1A (planning) | `OPEN` | Mở task docs Recruiter Appearance Lite riêng: accent color picker, layout preset, cover/avatar, section ordering, desktop/mobile preview. | TBD |

## Quy tắc cập nhật

- Status chỉ dùng các giá trị: `OPEN`, `IN_PROGRESS`, `PARTIAL — <note>`, `REFRESH_IN_PROGRESS`, `CLOSED`, `SUPERSEDED`.
- Khi một blocker đã hết hiệu lực nhưng thiếu evidence, KHÔNG tự đóng mà chuyển sang `PARTIAL` với ghi chú evidence còn thiếu.
- Mỗi `PARTIAL` phải có evidence tham chiếu đến file/SHA/PR/run.
- Khi thêm blocker mới, severity phải gán `P0/P1/P2/P3/P4/P5/M0..M5` theo phase ảnh hưởng.
