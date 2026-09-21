# THIN SLICE CAPABILITY MATRIX

Theo §49 của `HRP_EXECUTION_REALIGNMENT_PLAN.md`, đây là ma trận đánh giá năng lực của luồng nghiệp vụ mỏng (Thin Recruitment Slice) từ góc nhìn đầu cuối (end-to-end).

| Capability | Status | Evidence (Source/Test) | Blocker | Dependency | Next Proposed Task |
|---|---|---|---|---|---|
| **Public JobPosting Projection** | `IMPLEMENTED` | `job-opening-posting-split`, `public-detail.service.ts` | None | None | Giám sát |
| **Public Apply** | `PARTIAL` | `app/api/public/intake/route.ts` (AFF-03) | **RLS 42501** trên `submitPublicIntake` (bare writer role) | VPS Boundary, Evidence Storage (CCCD) | `hrp-v6-n2-aff-03b-rls-runtime-fix` (AFF-03B) đang fix lỗi RLS 42501 |
| **LaborProfile create-or-match** | `IMPLEMENTED` | `intake-writer.service.ts`, test suite | None | Public Apply | Giám sát |
| **Application** | `IMPLEMENTED` | `application.service.ts`, `candidate_submissions` | None | LaborProfile | Giám sát |
| **PlacementCase** | `IMPLEMENTED` | `placement-case.service.ts`, test suite N3/N1 | None | Application | Giám sát |
| **NextAction** | `NOT_IMPLEMENTED` | N/A | Chưa có HRP↔CRM contract cho NextActionDTO | HRP/CRM Contract | Phân định CRM Contract |
| **HandlingAssignment** | `IMPLEMENTED` | `handling-assignment.service.ts`, W5 | F-1 (Thiếu RLS), F-2 (Lỗi Sweep hết hạn) | Cron job hết hạn, RLS cho assignment | Fix F-1, F-2 cho HandlingAssignment |
| **Simple Workbench Query** | `PARTIAL` | `labor-profile.read-service.ts`, API routes | Thiếu giao diện hoàn chỉnh và filter động nâng cao | HandlingAssignment data | Build UI cho Simple Workbench |
| **Placement** | `IMPLEMENTED` | `placement.service.ts`, `placement.lifecycle.ts` | None | PlacementCase | Giám sát |
| **Public Recruiter Profile** | `NOT_IMPLEMENTED` | N/A | Chờ V9 Social Distribution | V9 Roadmap | Hold (Phụ thuộc V9) |
| **Universal AFF** | `PARTIAL` | `aff03-public-intake.service.ts` | Thiếu S2S API cho hệ thống thứ 3, đang fix RLS (AFF-03B) | Idempotency S2S, Auth | Chờ AFF-03B hoàn tất và P0-D S2S auth |

## Ghi chú về AFF-03 / AFF-03B
- Trạng thái của **Public Apply** và **Universal AFF** là `PARTIAL` (không phải green) do đang gặp blocker RLS `42501` khi dùng `$transaction` trần (không GUC) được T0 xác nhận.
- Tier 1B đang chạy lane `AFF-03B` để fix regression này. Tuyệt đối không mở các phase theo sau cho tới khi T1B bàn giao bằng chứng ACCEPTED.
