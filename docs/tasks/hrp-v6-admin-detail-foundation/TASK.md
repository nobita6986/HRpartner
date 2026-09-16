# TASK — `hrp-v6-admin-detail-foundation`

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v6-admin-detail-foundation` |
| Work type | `CODE` |
| Assurance lane | `STANDARD` |
| Audit mode | `NONE` |
| Audit reason | Thuần UI components, reversible (theo định hướng plan) |
| Spec version | `v1.0` |
| Status | `COMPLETE` |
| Planner | `Tier 1` |
| Baseline | `436bbcb` (origin/main) |
| In-scope roots | `src/shared/ui/data-display/**`; `src/shared/ui/navigation/**`; `docs/tasks/hrp-v6-admin-detail-foundation/**` |
| Forbidden paths | `prisma/**` (schema + migrations); `src/domains/talent/**`; `src/domains/staffing/**`; `app/(jobs)/**` |
| Required gates | `npx tsc --noEmit`; `npm run test:unit`; `powershell -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-admin-detail-foundation/TASK.md` |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | T0 review |

## 1. Outcome

### 1.1 User-visible outcome
- Cung cấp các nền tảng UI tái sử dụng cho các trang chi tiết admin: Breadcrumb, `<RelatedObjects>`, Row deep-link, Empty-state.
- Chuẩn hóa pattern: Server Component gọi thẳng domain service.

### 1.2 Non-goals
- Không can thiệp DB Schema hay Migration.
- Không sửa luồng public/job board.

## 2. Evidence
*(Pending)*

## 3. Decisions
*(Pending)*

## 4. Contract
- **RQ-01**: Cung cấp các nền tảng UI tái sử dụng cho các trang chi tiết admin: Breadcrumb, `<RelatedObjects>`, Row deep-link, Empty-state.

## 5. Execution Plan
- **STEP-01**: Implement `Breadcrumb`, `RelatedObjects`, `EmptyState`, and `RowLink` components. Áp dụng lên `/admin/jobs/job-postings` (list và detail).

## 6. Acceptance
- **AC-01**: `/admin/jobs/job-postings` page implements `RowLink` and `EmptyState`.
- **AC-02**: `/admin/jobs/job-postings/[id]` page implements `Breadcrumb` and `RelatedObjects`.

## 7. Risk
*(Pending)*

## 8. Open Questions
*(Pending)*

## 9. Planner Resolution
*(Pending)*

## 10. Revision Log
| Spec version | Date | Author | Change | Reason |
|---|---|---|---|---|
| `v1.0` | 2026-09-15 | Tier 1 | Khởi tạo TASK W2 | Tiếp nối sau W1 |
