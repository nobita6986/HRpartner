# EVIDENCE STORAGE AUDIT

Dựa trên nguyên tắc quyền ưu tiên tại [`docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`](../../../docs/HRP_EXECUTION_REALIGNMENT_PLAN.md) §17 (P0-A Evidence Gateway) và §50 (Evidence Storage Audit Questions).

**Refreshed baseline SHA:** `a87784229e8f06369082cfcd0e36ec63352dadb7` (origin/main HEAD verified 2026-10-13).
**Supersede baseline cũ:** `1059f6669482efac5b7956ef25d43996ca59d515` (2026-09-21).
Báo cáo cũ ghi "chưa có VPS filesystem, chưa có audit" — đã lỗi thời vì ER-001/002/003 đã merge. Báo cáo này refresh.

Báo cáo READ-ONLY. Mỗi kết luận có file/SHA/run evidence. Status theo taxonomy §15.2.

## 1. Vị trí lưu trữ Upload & Media (cập nhật)

- **Media phi-evidence (AV4 Media Library):** [`../../src/domains/media/media.service.ts`](../../../src/domains/media/media.service.ts) dùng Vercel Blob (`@vercel/blob` qua `put`) cho tài nguyên truyền thông. Đây là media library, KHÔNG dùng cho evidence nhạy cảm (CCCD).
- **Evidence (CCCD/PII):** Hiện chưa có call site production wire `EvidenceStorage` port. Port ([`../../src/domains/evidence/evidence-storage.port.ts`](../../../src/domains/evidence/evidence-storage.port.ts)) + adapter ([`../../src/domains/evidence/local-vps-evidence-storage.adapter.ts`](../../../src/domains/evidence/local-vps-evidence-storage.adapter.ts)) + metadata (model `EvidenceRecord` ở [`../../prisma/schema.prisma`](../../../prisma/schema.prisma) + migration [`../../prisma/migrations/20260924120000_er003_evidence_record_metadata/migration.sql`](../../../prisma/migrations/20260924120000_er003_evidence_record_metadata/migration.sql)) đã merge vào main, NHƯNG command `storeEvidence` (P0-A05) chưa tồn tại. Vì vậy evidence chưa được route qua EvidenceStorage ở production; các cột `cccdImageUrl` (nếu có) vẫn dùng Vercel Blob URL public — vi phạm nguyên tắc §17.
- **Vercel có nhận evidence không?** Có thể (qua Media Service), nhưng đây là vi phạm nguyên tắc nếu dùng cho CCCD thật.
- **Lưu file/base64 trong DB?** Không. Prisma schema chỉ lưu URL của file (cột `cccdImageUrl` ở `LaborProfile`/`Worker`) hoặc metadata text (`cccdNumber`, `cccdChipData` JSON) trong Neon Database.
- **CRM/Chatwoot có giữ bản sao?** Tài liệu đính kèm qua Chatwoot nằm trên storage riêng của Chatwoot (third-party), chưa đồng bộ về HRP Evidence Storage.

## 2. Thông tin nhạy cảm trong Database (cập nhật)

- `Worker`, `LaborProfile`, `CandidateSubmission` đều có `cccdNumber` + `cccdImageUrl`. `cccdNumber` dùng làm index mềm để dedup.
- **`EvidenceRecord` table (mới):** [`prisma/schema.prisma`](../../../prisma/schema.prisma) line 1873 có `model EvidenceRecord` với metadata fields: `storageKey` (UNIQUE), `contentType`, `sizeBytes`, `checksum` (lowercase 64-char SHA-256 hex), `originalFilename` (basename only), `evidenceType` (6 giá trị), `status` (4 lifecycle values), `ownerType` (`LABOR_PROFILE`), `createdByUserId`. Migration [`prisma/migrations/20260924120000_er003_evidence_record_metadata/migration.sql`](../../../prisma/migrations/20260924120000_er003_evidence_record_metadata/migration.sql) apply CHECK constraints + RLS enabled + forced + REVOKE all. **Production application evidence: `INSUFFICIENT_EVIDENCE`** — chưa có run/log/postcheck truy vết được xác nhận trên đúng production DB.

## 3. Public Route & Khảo sát khả năng truy cập

- **Public file route:** Vercel Blob mặc định có public presigned URL nếu cấu hình `public`. `Media` service có `safe-render.ts` nhưng chưa có hàng rào RLS cho file vật lý.
- **`EvidenceStorage` port (mới):** cấm URL-shaped key và absolute path ở port boundary (`asStorageKey` ở [`../../src/domains/evidence/evidence-storage.port.ts`](../../../src/domains/evidence/evidence-storage.port.ts) line 187-242). Đây là phòng thủ application-level; cần thêm gateway/authorization layer.
- **File path persist?** Có — `cccdImageUrl` ở `LaborProfile` (legacy) hoặc `EvidenceRecord.storageKey` (mới, UNIQUE).

## 4. Quản trị vòng đời (Lifecycle) — cập nhật theo Realignment Plan §17

| Sub-item (P0-A) | Trạng thái | Bằng chứng |
|---|---|---|
| **A01** Audit current file/evidence handling | `REFRESHED_CURRENT_BASELINE_AWAITING_LIGHT_AUDIT` | file này (refresh lần này); đang chờ T0 LIGHT audit |
| **A02** EvidenceStorage port | `ACCEPTED_IMPLEMENTATION_VERIFIED` | [`../../src/domains/evidence/evidence-storage.port.ts`](../../../src/domains/evidence/evidence-storage.port.ts) + test |
| **A03** LocalVpsEvidenceStorageAdapter | `ACCEPTED_IMPLEMENTATION_VERIFIED` | [`../../src/domains/evidence/local-vps-evidence-storage.adapter.ts`](../../../src/domains/evidence/local-vps-evidence-storage.adapter.ts) + test |
| **A04** EvidenceRecord metadata | `ACCEPTED_IMPLEMENTATION_VERIFIED` (production application: `INSUFFICIENT_EVIDENCE`) | migration source tồn tại; schema/constraints/RLS đã review; chưa có run/log/postcheck truy vết trên production DB |
| **A05** `storeEvidence` command | `INSUFFICIENT_EVIDENCE` | grep `storeEvidence` không tìm thấy EvidenceGateway implementation |
| **A06** protected evidence read | `INSUFFICIENT_EVIDENCE` | grep `evidenceRecords` chỉ thấy Prisma relation; không thấy `readEvidence` command |
| **A07** delete/quarantine commands | `INSUFFICIENT_EVIDENCE` | grep `quarantine` không tìm thấy |
| **A08** evidence access audit | `INSUFFICIENT_EVIDENCE` | không có `evidence_access_log` table; grep `evidenceAccessLog` không khớp |
| **A09** production/test environment guard | `INSUFFICIENT_EVIDENCE` (port-level fail-closed có; integration-level guard CHƯA) | `LocalVpsEvidenceStorageAdapter` dùng `defaultEvidencePathResolver` đọc `HRP_EVIDENCE_ROOT`; chưa thấy `REAL_EVIDENCE_STORAGE_ENABLED` integration gate |
| **A10** backup/restore runbook + restore test | `NOT_STARTED` | `EVIDENCE_BACKUP_RESTORE_RUNBOOK.md` chưa tồn tại ở main |

## 5. Trạng thái mới vs cũ (delta)

| Hạng mục | Baseline cũ (2026-09-21) | Refreshed (2026-10-13) |
|---|---|---|
| VPS filesystem | "chưa có" | Adapter có (`A03`); chưa wire production call site |
| Audit access | "không có" | `EvidenceRecord` table có metadata + RLS; `evidence_access_log` chưa có (A08) |
| Backup/restore | "không có" | chưa có (A10 NOT_STARTED) |
| Quarantine | "không có" | chưa có (A07) |
| Vercel safety guard | chưa đề cập | chưa có (P0-B04) |
| Test | chưa đề cập | port + adapter có test (`evidence-storage.port.test.ts`, `local-vps-evidence-storage.adapter.test.ts`) |

## Kết luận

- **Đã có infrastructure (port + adapter + metadata) nhưng chưa wire production call site.** P0-A02/P0-A03 ở trạng thái `ACCEPTED_IMPLEMENTATION_VERIFIED`, không phải `PRODUCTION_VERIFIED` vì chưa có EvidenceGateway command.
- **Cần đóng P0-A05..A10** trước khi bật `REAL_EVIDENCE_STORAGE_ENABLED=true` ở production.
- **P0-A KHÔNG chặn M1 pilot** vì P1 flow không yêu cầu upload CCCD/file nhạy cảm thật. Pilot phải dùng synthetic data.
- **Tài liệu cũ (2026-09-21) đã lỗi thời** vì không reflect P0-A02/A03/A04 đã merge.

## Liên kết

- Realignment Plan: [`docs/HRP_EXECUTION_REALIGNMENT_PLAN.md`](../../../docs/HRP_EXECUTION_REALIGNMENT_PLAN.md) §17 (P0-A), §50 (Evidence Storage Audit Questions)
- Source evidence:
  - [`../../src/domains/evidence/evidence-storage.port.ts`](../../../src/domains/evidence/evidence-storage.port.ts)
  - [`../../src/domains/evidence/local-vps-evidence-storage.adapter.ts`](../../../src/domains/evidence/local-vps-evidence-storage.adapter.ts)
  - [`../../prisma/schema.prisma`](../../../prisma/schema.prisma) (line 1873 `model EvidenceRecord`)
  - [`../../prisma/migrations/20260924120000_er003_evidence_record_metadata/migration.sql`](../../../prisma/migrations/20260924120000_er003_evidence_record_metadata/migration.sql)
  - [`docs/tasks/hrp-p0-a02-er001-evidence-storage-port/`](../../tasks/hrp-p0-a02-er001-evidence-storage-port/)
  - [`docs/tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/`](../../tasks/hrp-p0-a03-er002-local-vps-evidence-storage-adapter/)
  - [`docs/tasks/hrp-p0-a04-er003-evidence-record-metadata/`](../../tasks/hrp-p0-a04-er003-evidence-record-metadata/)
- Discovery đồng hành: [`./EXECUTION_REALIGNMENT_DISCOVERY.md`](./EXECUTION_REALIGNMENT_DISCOVERY.md), [`./BLOCKER_REGISTER.md`](./BLOCKER_REGISTER.md)
