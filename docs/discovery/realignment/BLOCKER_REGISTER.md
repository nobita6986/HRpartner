# BLOCKER REGISTER

**Refreshed baseline SHA:** `a87784229e8f06369082cfcd0e36ec63352dadb7` (origin/main HEAD verified 2026-10-13).
**Supersede baseline cũ:** `1059f6669482efac5b7956ef25d43996ca59d515` (2026-09-21).

Báo cáo READ-ONLY. Theo [`docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`](../../../docs/HRP_EXECUTION_REALIGNMENT_PLAN.md) §48 (Blocker Register) taxonomy.

## 1. Trạng thái Blocker hiện tại (canonical)

| ID | Mô tả | Loại | Trạng thái | Liên kết |
|---|---|---|---|---|
| **BLK-01** | P1-A thin slice deploy VPS path | `DEPLOY_RISK` | **CLOSED 2026-10-13** (P1-Final closeout PR #73; 6 run sau PR đều PASS) | [`./CURRENT_CI_COST_REPORT.md`](./CURRENT_CI_COST_REPORT.md) |
| **BLK-02** | Evidence Gateway lifecycle/security chưa hoàn tất (P0-A05..A10 — A05 storeEvidence, A06 readEvidence, A07 quarantine, A08 evidence_access_log, A09 integration-level guard, A10 backup/restore runbook). Port + adapter + metadata đã có (A02..A04 ACCEPTED_IMPLEMENTATION_VERIFIED) | `SAFETY_P0` | **ACTIVE** (gate cho `REAL_EVIDENCE_STORAGE_ENABLED=true`) | [`./EVIDENCE_STORAGE_AUDIT.md`](./EVIDENCE_STORAGE_AUDIT.md) |
| **BLK-03** | LaborProfile RLS 42501 runtime fix | `INTEGRATION_RUNTIME` | **CLOSED 2026-09-21** (`tier1/hrp-v6-n2-aff-03b-rls-runtime-fix`) | [`./THIN_SLICE_CAPABILITY_MATRIX.md`](./THIN_SLICE_CAPABILITY_MATRIX.md) Public Apply row |
| **BLK-04** | M0 Production Safety Ready | `GOVERNANCE` | **PARTIAL** (xem chi tiết ở §3 dưới đây) | [`./EXECUTION_REALIGNMENT_DISCOVERY.md`](./EXECUTION_REALIGNMENT_DISCOVERY.md) §1 P0 tổng hợp |
| **BLK-05** | NextAction capability matrix cũ ghi sai (`NOT_IMPLEMENTED`) | `DISCOVERY_DRIFT` | `REFRESH_READY_FOR_LIGHT_AUDIT` (đã refresh tại [`./THIN_SLICE_CAPABILITY_MATRIX.md`](./THIN_SLICE_CAPABILITY_MATRIX.md); chờ T0 LIGHT audit) | [`./THIN_SLICE_CAPABILITY_MATRIX.md`](./THIN_SLICE_CAPABILITY_MATRIX.md) |
| **BLK-06** | AFF-03B RLS 42501 block | `INTEGRATION_RUNTIME` | **CLOSED 2026-09-21** (cùng task với BLK-03) | [`./THIN_SLICE_CAPABILITY_MATRIX.md`](./THIN_SLICE_CAPABILITY_MATRIX.md) |
| **BLK-07** | CRM contract authority + S2S chưa có (P0-C/P0-D) | `INTEGRATION_P0` | **ACTIVE** (P0-C02..C06 + P0-D01..D04 NOT_STARTED/INSUFFICIENT_EVIDENCE; chờ T0 chốt contract distribution + S2S auth) | [`./CRM_CONTRACT_GAP_REPORT.md`](./CRM_CONTRACT_GAP_REPORT.md) |
| **BLK-08** | P0-A và P0-B là 2 workstream chưa tách decision | `COORDINATION_PREREQUISITE` | **NON_BLOCKING_PLANNING** (coordination prerequisite, không phải product blocker; có thể chạy song song sau discovery refresh) | [`./EXECUTION_REALIGNMENT_DISCOVERY.md`](./EXECUTION_REALIGNMENT_DISCOVERY.md) §8 |
| **BLK-09** | P3-B Recruiter Appearance Lite (V8.2 microsite) | `DEFERRED_BY_OWNER_WITH_TRIGGER` | **DEFERRED** (trigger mở: M1 pilot evidence + T0 quyết định mở P3; P3 chưa được mở) | [`./EXECUTION_REALIGNMENT_DISCOVERY.md`](./EXECUTION_REALIGNMENT_DISCOVERY.md) §2 P3 |

Tổng: 9 blockers tracked, 4 CLOSED (BLK-01, BLK-03, BLK-06, plus BLK-05 chờ audit), 1 PARTIAL (BLK-04), 2 ACTIVE (BLK-02, BLK-07), 1 DEFERRED (BLK-09), 1 NON_BLOCKING_PLANNING (BLK-08).

## 2. M0 Production Safety Ready (BLK-04) chi tiết

M0 trạng thái = `PARTIAL` (1 `REFRESHED_CURRENT_BASELINE_AWAITING_LIGHT_AUDIT` + 3 `ACCEPTED_IMPLEMENTATION_VERIFIED` + 5 `INSUFFICIENT_EVIDENCE` + 1 `NOT_STARTED` trong P0-A; P0-B/C/D/E còn nhiều mục `NOT_STARTED`/`INSUFFICIENT_EVIDENCE`).

Chi tiết (xem [`./EXECUTION_REALIGNMENT_DISCOVERY.md`](./EXECUTION_REALIGNMENT_DISCOVERY.md) §1):

- **P0-A (Evidence Gateway):** 1/10 REFRESHED, 3/10 ACCEPTED_IMPLEMENTATION, 5/10 INSUFFICIENT_EVIDENCE, 1/10 NOT_STARTED.
- **P0-B (Deployment Boundary):** 0/4 ACCEPTED, 1/4 IN_PROGRESS, 2/4 INSUFFICIENT_EVIDENCE, 1/4 NOT_STARTED.
- **P0-C (HRP↔CRM Contract):** 0/6 ACCEPTED, 1/6 IN_PROGRESS, 2/6 NOT_STARTED, 3/6 INSUFFICIENT_EVIDENCE.
- **P0-D (S2S/Outbox):** 0/4 ACCEPTED, 0/4 IN_PROGRESS, 2/4 INSUFFICIENT_EVIDENCE, 2/4 NOT_STARTED.
- **P0-E (CI/Governance):** 1/2 ACCEPTED_IMPLEMENTATION_VERIFIED (E02 Direct Fix class), 1/2 PARTIAL_IMPLEMENTATION_VERIFIED (E03 matrix thiếu).

M0 KHÔNG đóng được cho đến khi:

1. BLK-02 lifecycle/security hoàn tất (P0-A05..A10).
2. BLK-07 CRM contract authority + S2S có (P0-C02..C06, P0-D01..D04).
3. ENVIRONMENT_MATRIX.md publish (P0-B01).
4. Vercel safety guard verified (P0-B04).
5. P0-E03 matrix đầy đủ.

## 3. M1 hai cấp evidence (theo T0 brief 2026-10-13 C-09)

| Cấp | Trạng thái | Điều kiện | Ràng buộc |
|---|---|---|---|
| **`M1_PILOT_READY`** | `INSUFFICIENT_EVIDENCE` (chưa chạy pilot) | Recruiter thật thao tác; dữ liệu synthetic; KHÔNG có CCCD; workflow vận hành | Pilot phải tối thiểu hóa PII; KHÔNG bật `REAL_EVIDENCE_STORAGE_ENABLED`; KHÔNG thêm dependency mới; KHÔNG thay đổi schema/migration |
| **`M1_ACCEPTED_PRODUCTION_VERIFIED`** | `INSUFFICIENT_EVIDENCE` (chưa đạt) | Một real controlled candidate/application flow; consent + PII tối thiểu; KHÔNG có CCCD; hoàn tất Placement không cần developer can thiệp | Cần pilot thật + placement lifecycle tự chạy + observation logs xác minh |

Synthetic-only pilot KHÔNG tự đóng M1.

## 4. P2/P3 unlock conditions (theo T0 brief 2026-10-13 C-10)

Theo Realignment Plan, P2/P3 có unlock conditions **riêng** chứ không bị P0 blanket-block:

- **P2-A (V8.0 Workspace Shell):** cần ActorContext, permissions, workspace navigation ổn định.
- **P2-B (V8.2 Recruiter Microsite):** cần recruiter public profile, public JobPosting, public Apply, public security boundary.
- **P3 (Recruiter Growth Slice):** mở bằng quyết định T0 + dependency riêng; M1 evidence là sequencing ưu tiên, KHÔNG phải blanket architecture dependency.
- **P0-A** chỉ chặn phần sử dụng evidence thật (`REAL_EVIDENCE_STORAGE_ENABLED=true`).
- **P0-C/D** chỉ chặn integration/CRM-dependent capability (M3, M5).

## 5. Trình tự ưu tiên (theo T0 chốt 2026-10-13)

1. Discovery refresh (lane này, `codex/t1b-realignment-discovery-refresh-20261013`) — chờ LIGHT audit.
2. M1 pilot readiness — chạy pilot 1 recruiter thật + synthetic data + không CCCD.
3. BLK-02 lifecycle/security (A05..A10) — song song với M1 pilot (không chặn pilot).
4. BLK-07 contract + S2S — T0 chốt 2 cơ chế TBD; implementation sau.
5. BLK-04 M0 — gom từ (3) + (4) + ENVIRONMENT_MATRIX + Vercel safety guard + P0-E03 matrix.
6. P2-A/P2-B — T0 quyết mở cái nào trước; theo unlock conditions §4.
7. P3-B — DEFERRED, chỉ mở sau khi M1 pilot xong + T0 quyết định.
8. P4/P5 — chờ evidence real data.

## 6. Delta so với baseline cũ

| ID | Baseline cũ (2026-09-21) | Refreshed (2026-10-13) | Lý do |
|---|---|---|---|
| BLK-01 | ACTIVE (P1-A deploy risk) | CLOSED 2026-10-13 | P1-Final closeout PR #73 + 6 run PASS |
| BLK-02 | "Thiếu Storage Adapter" | Evidence Gateway lifecycle/security chưa hoàn tất (A05..A10) | Adapter đã có (A03 ACCEPTED_IMPLEMENTATION_VERIFIED); chỉ thiếu lifecycle commands + audit + runbook |
| BLK-03 | ACTIVE (RLS 42501 block AFF) | CLOSED 2026-09-21 | `tier1/hrp-v6-n2-aff-03b-rls-runtime-fix` merged |
| BLK-04 | NOT_MEASURED | PARTIAL | P0-A/B/C/D/E đã đo đếm chi tiết |
| BLK-05 | REFRESH_IN_PROGRESS | REFRESH_READY_FOR_LIGHT_AUDIT | 6 file refresh xong; chờ T0 LIGHT audit |
| BLK-06 | ACTIVE (AFF-03B RLS) | CLOSED 2026-09-21 | cùng task với BLK-03 |
| BLK-07 | — (chưa tồn tại) | ACTIVE (P0-C/D contract + S2S) | tách khỏi BLK-02 để theo dõi riêng |
| BLK-08 | ACTIVE (workstream separation) | NON_BLOCKING_PLANNING (coordination prerequisite) | không phải product blocker; có thể chạy song song |
| BLK-09 | ACTIVE (Appearance Lite chưa làm) | DEFERRED_BY_OWNER_WITH_TRIGGER | P3 chưa mở; trigger = M1 pilot evidence + T0 quyết định |

## Kết luận

- **Production blocker thật còn ACTIVE:** BLK-02 (Evidence Gateway lifecycle/security), BLK-07 (CRM contract + S2S).
- **BLK-05** đã refresh xong, chờ T0 LIGHT audit chốt ACCEPTED.
- **M1 pilot** không bị BLK-02 chặn vì P1 flow không yêu cầu evidence thật.
- **P2/P3** không bị P0 blanket-block; unlock conditions riêng theo plan.

## Liên kết

- Realignment Plan: [`docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`](../../../docs/HRP_EXECUTION_REALIGNMENT_PLAN.md) §48 (Blocker Register), §17 (P0-A), §19 (P0-B), §20 (P0-C), §21 (P0-D), §22 (P0-E), §10 (Architectural authority), §59 (Owner Decision Log)
- Source evidence:
  - [`src/domains/evidence/evidence-storage.port.ts`](../../../src/domains/evidence/evidence-storage.port.ts)
  - [`src/domains/evidence/local-vps-evidence-storage.adapter.ts`](../../../src/domains/evidence/local-vps-evidence-storage.adapter.ts)
  - [`prisma/schema.prisma`](../../../prisma/schema.prisma) (line 1873 `model EvidenceRecord`)
  - [`prisma/migrations/20260924120000_er003_evidence_record_metadata/migration.sql`](../../../prisma/migrations/20260924120000_er003_evidence_record_metadata/migration.sql)
  - [`src/shared/integrity/idempotency.ts`](../../../src/shared/integrity/idempotency.ts)
- Discovery đồng hành: [`EXECUTION_REALIGNMENT_DISCOVERY.md`](./EXECUTION_REALIGNMENT_DISCOVERY.md), [`EVIDENCE_STORAGE_AUDIT.md`](./EVIDENCE_STORAGE_AUDIT.md), [`CRM_CONTRACT_GAP_REPORT.md`](./CRM_CONTRACT_GAP_REPORT.md), [`THIN_SLICE_CAPABILITY_MATRIX.md`](./THIN_SLICE_CAPABILITY_MATRIX.md), [`CURRENT_CI_COST_REPORT.md`](./CURRENT_CI_COST_REPORT.md)
