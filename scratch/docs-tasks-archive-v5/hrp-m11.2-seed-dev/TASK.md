# TASK: hrp-m11.2-seed-dev

## 1. Context & Objective
- **Context:** Môi trường Database Dev (Neon DB) vừa được xóa trắng và đồng bộ lại schema từ đầu trong task `hrp-m11.1-db-baseline`. Do DB đang rỗng hoàn toàn, các tính năng API (như M11 và M12) không thể test được ở runtime (lỗi 403 Forbidden do không có User/Worker, hoặc query ra rỗng).
- **Objective:** Bơm dữ liệu mẫu (Seed) vào Database, bao gồm cả dữ liệu chung của hệ thống và dữ liệu đặc thù cho User test (ví dụ: tạo tài khoản test cho CTV). Đảm bảo môi trường dev đủ điều kiện để thực hiện smoke test API của M11 và M12.
- **Role:** Tier 2 / Engineer.

## 2. Evidence and Baseline
| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| EV-01 | AUDIT M11.1 (DEV-02) | DB Neon dev hiện đang rỗng không. | Cần phải chạy seed script. |
| EV-02 | User Decision | Sếp quyết định mở task M11.2 để chạy seed + tạo test user. | Mở task mới để bơm dữ liệu vào. |

## 3. Decisions and Assumptions
| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| DEC-01 | CHOSEN | Sử dụng script `prisma/seed.mjs` có sẵn để tạo dữ liệu nền (Role, Master data, etc.). | Planner | Valid |
| DEC-02 | CHOSEN | Cần tạo thêm 1 User có role `CTV` và liên kết với một `Vendor` để test riêng tính năng của M11. | Planner | Valid |

## 4. Contract
### 4.1 Requirements
| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| RQ-01 | **Run Seed Script:** Chạy thành công script `prisma/seed.mjs` để nạp dữ liệu master và role cơ bản vào DB. | Must | EV-01 | Không có dữ liệu test. |
| RQ-02 | **Create CTV Test User:** Cập nhật script seed hoặc tạo script phụ để tự động sinh ra 1 User có số điện thoại `0900000001` (hoặc email `ctv@test.com`), role CTV và liên kết với 1 Worker/Vendor hợp lệ. | Must | DEC-02 | Không thể đăng nhập hoặc gọi API bị 403. |
| RQ-03 | **Verify Data:** Đảm bảo dữ liệu `Project`, `VendorStatement`, `Timesheet` có đủ (hoặc tự sinh ngẫu nhiên 1 ít) để Dashboard M12 không bị trống 100%. | Should | DEC-01 | Dashboard M12 vẫn rỗng. |

### 4.2 Scope boundaries
**In scope:**
- File `prisma/seed.mjs`.
- Bảng DB liên quan đến Master data, User, Project.

**Out of scope:**
- Không sửa source code app Next.js.

## 5. Execution Plan
| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| STEP-01 | RQ-01, RQ-02, RQ-03 | `prisma/seed.mjs` | Cập nhật file seed (nếu cần) để đảm bảo có đủ data test cho M11 (User CTV) và M12 (Project/Statements). | N/A | Review code seed | Syntax error. |
| STEP-02 | RQ-01 | Neon DB | Chạy `npx prisma db seed`. | STEP-01 | Lệnh seed thành công, báo xanh. | Lỗi DB duplicate key. |

## 6. Acceptance
| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| AC-01 | RQ-01 | Script seed chạy hoàn tất không có lỗi. | Run `npx prisma db seed` | Ảnh chụp console | Yes |
| AC-02 | RQ-02 | Truy vấn DB lấy được User CTV test (ví dụ số ĐT test). | SQL Query / Prisma query | Log thông tin user test | Yes |

## 7. Risk and Rollback
| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| RISK-01 | Lỗi duplicate key do chạy seed nhiều lần. | `prisma db seed` bị lỗi unique constraint. | Viết script seed theo dạng `upsert` hoặc xóa data cũ (hoặc chỉ seed 1 lần). | Reset lại DB (M11.1). |

## 8. Planner Resolution
| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| - | - | - | - | - | - |

## 9. Revision Log
| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| 1.0 | 2026-08-20 | Tạo task hrp-m11.2-seed-dev. | Giải quyết DB rỗng sau M11.1. |
