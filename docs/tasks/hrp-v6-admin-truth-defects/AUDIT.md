# Tier 3 LIGHT Audit Report

**Date**: 2026-09-15
**Task**: hrp-v6-admin-truth-defects (AD2 & AD3)
**Auditor**: Tier 3 (System/Agent)
**Scope**: Permission & Data-scope boundaries for AD2 and AD3. AD1, AD4, AD5 are excluded (NONE) per Tier 0 instruction.

## 1. Audit AD2 (Workers Route)
**Target**: `app/api/workers/route.ts`
- **Data Scope**: API query logic was changed from `where.status = status` to `where.employmentStatus = status`. The surrounding logic `withAuthorizedDbReadOnly` and `resolveEffectivePermissions` remains untouched.
- **Permission**: Row-Level Security (RLS) and L1/L2 matrix logic for `Worker` retrieval are strictly preserved.
- **Verdict**: **PASS**. Không có dấu hiệu mở rộng data scope hay bypass permission.

## 2. Audit AD3 (Ledger Service)
**Target**: `src/domains/commission/ledger.service.ts`
- **Data Scope**: Hàm `listLedger` thực hiện enrich `ctvName` và `workerName` bằng tay (manual join) thay vì query Prisma `@relation` do thiếu Foreign Key. Các queries `findMany` cho `User` và `Worker` được gọi trên tham số `prisma: LedgerTx`.
- **Permission**: `LedgerTx` được pass từ route handler, vốn đã được wrap bên trong `withDbContext` (thiết lập GUC transaction-local). Do bảng `Worker` có FORCE RLS, việc gọi `prisma.worker.findMany` sẽ tự động tuân thủ context của user hiện tại. Các worker bị RLS che sẽ không được trả về, map query sẽ thiếu key, và `workerName` trở thành `null` đúng như ý đồ thiết kế (Không rò rỉ dữ liệu ngoài scope).
- **Verdict**: **PASS**. Cách thiết kế manual join tuân thủ tuyệt đối RLS boundaries.

## 3. Conclusion
- **Status**: **PASS**
- Các giới hạn phân quyền và data scope được bảo đảm an toàn. Đủ điều kiện để tiến hành merge PR vào nhánh chính.
