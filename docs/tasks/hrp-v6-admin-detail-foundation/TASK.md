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
| In-scope roots | `src/shared/ui/data-display/**`; `src/shared/ui/navigation/**`; `docs/tasks/hrp-v6-admin-detail-foundation/**`; `app/admin/jobs/job-postings/page.tsx`; `app/admin/jobs/job-postings/[id]/page.tsx` |
| Forbidden paths | `prisma/**` (schema + migrations); `src/domains/talent/**`; `src/domains/staffing/**`; `app/(jobs)/**` |
| Required gates | `npx tsc --noEmit`; `npm run lint`; `npm run test:unit`; `npm run build`; `powershell -NoProfile -File .ai-pipeline/scripts/verify-task.ps1 -TaskPath docs/tasks/hrp-v6-admin-detail-foundation/TASK.md` |
| Current execution round | `2` |
| Current audit round | `0` |
| Next gate | T0 review |

## 1. Outcome

### 1.1 User-visible outcome
- Cung cấp các nền tảng UI tái sử dụng cho các trang chi tiết admin: Breadcrumb, `<RelatedObjects>`, Row deep-link, Empty-state.
- Chuẩn hóa pattern: Server Component gọi thẳng domain service.

### 1.2 Non-goals
- Không can thiệp DB Schema hay Migration.
- Không sửa luồng public/job board.

## 2. Evidence
| ID | Evidence | Why it matters |
|---|---|---|
| `EV-01` | `src/shared/ui/admin-detail-foundation.test.ts` | 4 bài test UI focused. |
| `EV-02` | Pipeline CI pass (tsc, lint, unit test). | Contract cơ sở. |

## 3. Decisions
| ID | Decision | Status |
|---|---|---|
| `DEC-01` | Dùng Server Component + trực tiếp gọi read service. | `CHOSEN` |
| `DEC-02` | `RelatedObjects` sinh `aria-labelledby` bằng `React.useId()`. | `CHOSEN` |
| `DEC-03` | `EmptyState` loại bỏ prop `onClick`, chỉ hỗ trợ `href` để tuân thủ RSC (Server Component). | `CHOSEN` |

## 4. Contract
- **RQ-01**: Cung cấp các nền tảng UI tái sử dụng cho các trang chi tiết admin: Breadcrumb, `<RelatedObjects>`, Row deep-link, Empty-state.

## 5. Execution Plan
- **STEP-01**: Implement `Breadcrumb`, `RelatedObjects`, `EmptyState`, and `RowLink` components. Áp dụng lên `/admin/jobs/job-postings` (list và detail).

## 6. Acceptance

### 6.1 Acceptance criteria
- **AC-01**: `/admin/jobs/job-postings` page implements `RowLink` and `EmptyState`.
- **AC-02**: `/admin/jobs/job-postings/[id]` page implements `Breadcrumb` and `RelatedObjects`.

### 6.2 Traceability
| Requirement | Step | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-01` | `AC-01`, `AC-02` |

## 7. Risk
| ID | Risk | Mitigation |
|---|---|---|
| `RISK-01` | Lỗi click control trên table khi dùng RowLink | Yêu cầu `tr relative` và control `relative z-10`. Cần manual smoke test khi có session. |

## 8. Open Questions
| ID | Question | Status |
|---|---|---|
| `OQ-01` | Không có. | `CLOSED` |

## 9. Planner Resolution
- Tier 1 chấp nhận T0 feedback, thêm focused tests, dọn dẹp N2 artifacts, sửa hook `useId()`, update tài liệu trung thực.
- (Round 2 Correction) Xóa support `onClick` trong `EmptyState` để tuân thủ RSC.

## 10. Revision Log
| Spec version | Date | Author | Change | Reason |
|---|---|---|---|---|
| `v1.0` | 2026-09-15 | Tier 1 | Khởi tạo TASK W2 | Tiếp nối sau W1 |
| `v1.1` | 2026-09-16 | Tier 1 | Round 2 revision | Fix issues theo chỉ đạo T0 |
| `v1.2` | 2026-09-16 | Tier 1 | Round 2 correction | Loại bỏ onClick khỏi EmptyState (RSC constraint) |
