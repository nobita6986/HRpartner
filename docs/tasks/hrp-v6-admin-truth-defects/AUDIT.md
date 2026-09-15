# Tier 3 LIGHT Audit Report - Round 1

**Date**: 2026-09-15
**Task**: hrp-v6-admin-truth-defects (AD2 & AD3)
**Auditor Identity**: Tier 3 Agent (Session: 52463e87-6010-4b92-90da-8594a1f83ce4)
**Base**: `b91a33f`
**Target HEAD**: `015fe83`
**Scope**: Permission & Data-scope boundaries for AD2 and AD3 (AD1, AD4, AD5 out of audit scope).

## 1. Audit AD2 (Workers Route)
**Target**: `app/api/workers/route.ts`
- **Validation & Precedence**: Tham số `employmentStatus` (mới) được ưu tiên ghi đè `status` (cũ). Có mảng whitelist cố định `['NONE', 'ACTIVE', 'SUSPENDED', 'TERMINATED']`.
- **Prisma Call Guard**: Nếu input không nằm trong whitelist, code trả về HTTP 400 lập tức. Luồng thực thi không đi tới các hàm `findMany` hoặc `count` của Prisma, triệt tiêu mọi khả năng query database với tham số không xác định.
- **Verdict**: **PASS**. Không phát hiện rò rỉ dữ liệu hoặc lỗi cấu trúc validation.

## 2. Audit AD3 (Ledger Service)
**Target**: `src/domains/commission/ledger.service.ts`
- **GUC & RLS Transaction**: Hàm `listLedger` thực thi một transaction nội bộ (`LedgerTx`). Việc truy vấn bảng `Worker` và `User` được gọi từ `tx.worker.findMany`, thừa hưởng nguyên vẹn JWT claims thiết lập bởi hàm bọc `withDbContext`. Bảng `Worker` có `FORCE RLS`, sẽ tự động lọc dữ liệu an toàn dựa trên context của user hiện tại.
- **PII & Fallback Semantics**: Khi render, nếu user không có quyền xem Worker (RLS ẩn data), logic array `.find` sẽ trả về `undefined`, giá trị `workerName` gán bằng `null`. UI fallback render chuỗi "Không có quyền xem" theo đúng thiết kế, đảm bảo PII không lộ ra ngoài vùng quyền hạn.
- **Verdict**: **PASS**. RLS boundaries và Fallback semantics được giữ toàn vẹn.

## 3. Conclusion
- **Status**: **PASS**
- Xác nhận các giới hạn RLS và Validation an toàn tại HEAD `015fe83`. Đủ điều kiện chuyển giao cho Tier 1 resolve.
