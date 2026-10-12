# T0 Decisions — `hrp-t1b-pre-p2-worker-operations-hotfix`

> Phụ lục của `TASK.md` §11. Tier 1 đã chốt Q1-Q4 theo AskQuestion response ngày 2026-10-07.

## Trạng thái

| ID | Câu hỏi | Recommendation | T0 chọn |
|---|---|---|---|
| `Q1` | Audit viewer phạm vi quyền + default filter? | **ADMIN-only, mọi entityType (default filter `entityType=Worker`)** | **Q1: chỉ ADMIN, mọi entityType (default `entityType=Worker`)** ✅ |
| `Q2` | Worker — Này làm đầu tiên? | **`EmploymentEpisode.startedAt` (MIN)** | **Q2: episode-startedat** ✅ |
| `Q3` | Worker table cột bổ sung? | **Dự án + Quản lý dự án + Handler + Referrer + Commission beneficiary** | **Q3: 4/4** ✅ |
| `Q4` | LaborProfile table phạm vi? | **Bổ sung 3 cột thay SĐT+Ngày tạo (giữ invariant 5 cột)** | **Q4: 5-col-stacked (3 cột vận hành thay thế)** ✅ |

---

## §A — Audit viewer scope (Q1)

### Lựa chọn

#### **Q1 (T0 chọng): Chỉ ADMIN, mọi entityType (default filter `entityType=Worker`)**

- **Pro:** Đơn giản nhất. Theo mục tiêu truy vấn audit logs xóa Worker, default UI chỉ filter `Worker` — admin có thể đổi filter để xem các entity khác.
- **Pro:** 403 non-ADMIN fail-closed ở route + UI redirect sang trang chính.
- **Con:** Admin chỉ là partial. Nếu HR_MANAGER cần tra cứu → mở rộng sau. Không trong scope hotfix này.

#### Khác

- **A1: ADMIN + HR_MANAGER, mọi entityType** — mở rộng quyền; không cần thiết cho mục này.
- **A2: Chỉ ADMIN, filter sẵn entityType=Worker** — quá hẹp; xóa là mục tiêu nhưng nhiều loại audit log khác cũng nên tra được.

### T0 chốt

**Q1.** UI mặc định filter Worker nhưng route hỗ trợ lọc theo bất kỳ entityType nào.

---

## §B — First work day (Q2)

### Lựa chọn

#### **Q2 (T0 chốt): `EmploymentEpisode.startedAt`**

- **Schema canonical:** `EmploymentEpisode.startedAt` (Date, `started_at`). Status = ACTIVE/ENDED/PAUSED.
- **Query:** `MIN(startedAt)` cho `workerId = X` — "Ngày làm nhận / first work day" đầu tiên.
- **Khi không có episode:** null (hiển thị "Chưa có").
- **KHÔNG dùng:** `Worker.createdAt` (là timestamp tạo row, không phải bắt đầu làm việc).

#### Khác

- **A1: Earliest episode.**status=ACTIVE/ENDED** — tương đương Q2 nhưng filter status. Có thể miss PAUSED. **Q2** là safer.
- **A2: ProjectAssignment.validFrom** — gắn liền với assignment, không phải quan hệ lao động.

### T0 chốt

**Q2.** `MIN(EmploymentEpisode.startedAt WHERE workerId=X)`.

---

## §C — Worker table columns (Q3)

### T0 chốt

**Q3.** Bổ sung đủ — 6 cột mới.

| Cột | Data source |
|---|---|
| Dự án đang làm | `ProjectAssignment WHERE status IN ('ACTIVE','PAUSED')` ORDER BY `validFrom DESC` LIMIT 1 → `Project.name` |
| Ngày làm đầu tiên | `MIN(EmploymentEpisode.startedAt WHERE workerId=X)` |
| Quản lý dự án | `Project.pmUserId` (User.name), fallback subPmUserId1/2 |
| Người phụ trách | `Worker.assignedToId` (User.name) — **KHÁC** người giới thiệu |
| Người giới thiệu | `ProjectAssignment.referrerId` → fallback `SourceClaim.referrerUserId` (User.name) |
| Người hưởng hoa hồng | `SourceClaim WHERE workerId=X AND accepted=true AND claimType='CTV_REFERRAL'` → `ctvId` (User.name) |

**Phân biệt rõ (T0 chỉ thị):**
- Handler = `Worker.assignedToId` (current assignment).
- Referrer = `ProjectAssignment.referrerId` (per-assignment referrer) — KHÔNG nhầm với handler.
- Project manager = `Project.pmUserId` — KHÁC project manager + handler.
- Commission beneficiary = `SourceClaim.ctvId` (CTV_REFERRAL accepted) — KHÁC referrer (CTV có thể là referrer nhưng commission beneficiary chỉ dành cho claim đã accepted với `CTV_REFERRAL`).

### Nếu không có data

Null: ngăn = `—`. KHÔNG suy diễn.

---

## §D — LaborProfile table columns (Q4)

### T0 chốt

**Q4.** Bổ sung **3 cột thay thế SĐT + Ngày tạo** (giữ invariant DEC-P2-10: 5 `<th>` + `colSpan=5`):

| Cột | Data source | Note |
|---|---|---|
| Job gần nhất (kèm số đơn) | `getLaborProfilesList` enriched → `latestJob.{code,name}` + `applicationCount` (badge nhỏ) | Combines "Job/đơn ứng tuyển gần nhất" + "Số đơn" vào 1 cell |
| Người phụ trách | `LaborProfileHandlingAssignment WHERE status='ACTIVE'` → `assigneeUser.name` |  |
| Trạng thái (gồm Xác minh + Hoàn thiện + Nguồn) | Stacked: `StatusBadge identityVerification` + `StatusBadge completeness` + caption `Nguồn: {intakeSource}` | Combines "Trạng thái hiện hữu" + "Nguồn tiếp nhận" vào 1 cell |
| Ngày tiếp nhận | `LaborProfile.createdAt` (đã có sẵn) | T0 nói "ngày tiếp nhận" — dùng `createdAt` (canonical) |
| Họ và tên | (giữ nguyên) | |

**Kết quả: 5 cột** (thay vì 8 nếu làm tách riêng từng cột), vẫn đủ thông tin vận hành T0 yêu cầu mà không phá DEC-P2-10 invariant.

**KHÔNG thêm CCCD vào bảng** (giữ PII rule). Bỏ cột SĐT (PII) — xem ở detail page.

**Không nhân bản 1 profile thành nhiều row.**

---

## Yêu cầu với T0 (đã hoàn tất)

T0 đã chốt Q1-Q4 bằng AskQuestion. Tier 1 tiếp tục `STEP-02` ngay.