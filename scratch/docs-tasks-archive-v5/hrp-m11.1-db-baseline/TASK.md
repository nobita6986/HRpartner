# TASK: hrp-m11.1-db-baseline

## 1. Context & Objective
- **Context:** Milestone M11 (Affiliate DB Migration) đã bị block (BLK-01) tại vòng audit do môi trường cơ sở dữ liệu Neon DB bị mất đồng bộ (drift). Cụ thể, các bảng và index cũ (như `portal_timesheets`) không khớp giữa schema và db thật, dẫn đến việc `prisma migrate dev` lỗi P3006.
- **Objective:** Tạo ra một baseline DB hoàn toàn sạch sẽ, đồng bộ toàn bộ schema hiện tại lên Neon DB, phân quyền lại cho đúng user và xóa bỏ trạng thái lỗi shadow database.
- **Role:** Tier 2 / Infra Engineer.

## 2. Evidence and Baseline
| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| EV-01 | AUDIT M11 (BLK-01) | DB Neon dev (`ep-shy-tree-az32as2c-pooler`) bị lỗi P3006 khi chạy `migrate dev`. | Cần phải dọn dẹp hoặc sync lại schema. |
| EV-02 | User Decision | Sếp đã quyết định chọn Option A (Mở task infra để fix DB drift trước). | Bắt buộc phải thực hiện các lệnh migrate/reset an toàn trên DB dev. |

## 3. Decisions and Assumptions
| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| DEC-01 | CHOSEN | Áp dụng `prisma db push` hoặc `migrate reset` tùy thuộc vào việc có muốn giữ nguyên dữ liệu thật hay không (Ưu tiên sửa drift schema thay vì reset toàn bộ nếu có thể, dùng `prisma migrate resolve` nếu cần thiết). Nếu lỗi quá nặng, tiến hành reset DB Dev và seed lại (Option C - fallback). | Planner | Valid |

## 4. Contract
### 4.1 Requirements
| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| RQ-01 | **Sync Schema:** Đồng bộ file `prisma/schema.prisma` (hiện đang chứa model `CtvWithdrawalRequest`) lên Neon DB thành công. | Must | EV-01 | Lỗi prisma migrate. |
| RQ-02 | **Fix Shadow DB / Migration history:** Dọn dẹp lỗi P3006, đánh dấu (resolve) hoặc reset các migration bị lỗi trong bảng `_prisma_migrations`. | Must | EV-01 | Không chạy được migrate tiếp. |
| RQ-03 | **Verify Permissions:** Kiểm tra và đảm bảo user cấu hình trong `DATABASE_URL` có đủ quyền thao tác trên schema `public`. | Must | EV-01 | Lỗi 42501 permission denied. |

### 4.2 Scope boundaries
**In scope:**
- Môi trường: Database Dev (Neon).
- Các lệnh thao tác Prisma CLI (migrate, resolve, db push).

**Out of scope:**
- Không sửa code ứng dụng UI/API.

## 5. Execution Plan
| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| STEP-01 | RQ-02 | Neon DB | Kiểm tra log migration cũ (`prisma migrate status`), dùng `prisma migrate resolve` để mark applied/rolled back các migration lỗi. | N/A | `prisma migrate status` | Lỗi DB không connect. |
| STEP-02 | RQ-01 | Neon DB | Chạy `npx prisma db push` hoặc `npx prisma migrate dev` để chốt schema hiện tại lên DB thật. | STEP-01 | Bảng `ctv_withdrawal_requests` xuất hiện. | Failed to push. |
| STEP-03 | RQ-03 | Neon DB / psql | Kiểm tra quyền table / grant privileges nếu cần thiết (chạy SQL query cấp quyền cho schema public). | STEP-02 | Select DB thành công. | Permission denied. |

## 6. Acceptance
| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| AC-01 | RQ-01, RQ-02 | Lệnh `npx prisma migrate status` báo xanh (Đã đồng bộ) và `npx prisma validate` thành công. | Run command | Ảnh chụp console | Yes |
| AC-02 | RQ-03 | API `/api/ctv/withdrawals` không còn báo lỗi Permission Denied khi query. | Test API cục bộ | Log 200 | Yes |

## 7. Risk and Rollback
| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| RISK-01 | Mất sạch dữ liệu Seed. | Dùng lệnh `migrate reset` hoặc `db push --force-reset`. | Tạo sẵn/chạy script `seed.mjs` ngay sau khi reset DB để khôi phục dữ liệu dev cơ bản. | Seed lại dữ liệu. |

## 8. Planner Resolution
| Audit round | Finding ID | Decision | Reason/Evidence | Contract change | Owner/Closure |
|---|---|---|---|---|---|
| - | - | - | - | - | - |

## 9. Revision Log
| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| 1.0 | 2026-08-20 | Tạo task hrp-m11.1-db-baseline. | Giải quyết BLK-01 từ M11. |
