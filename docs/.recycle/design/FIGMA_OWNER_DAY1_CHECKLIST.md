# Figma Owner — Việc cần làm ngay

## Artifact làm việc

Task folder: `docs/tasks/hrp-v4-bod-mockup/`.

- Tier 1 sở hữu `TASK.md`.
- Anh/Figma Owner sở hữu `HANDOFF.md`.
- Tier 3 sở hữu `AUDIT.md`.

Không tạo thêm Work Order, Data Dictionary, Decision Log hoặc Design Acceptance riêng; tất cả nằm trong TASK.

## Trong khi Tier 1 tạo TASK

Tạo file Figma `HRP V4 — Operations Demo` với pages:

1. `00_Cover & Decisions`
2. `01_Foundations`
3. `02_LowFi`
4. `03_HighFi`
5. `04_Prototype`
6. `05_Archive`

Trong `02_LowFi`, tạo frame rỗng `1440 × 900`:

- `S01_ControlTower_Default`
- `S02_Staffing_Default`
- `S02A_AssignmentConflict`
- `S02B_ReferralGuard`
- `S03_Attendance_Exceptions`
- `S03A_Attendance_ReadyToLock`
- `S04_Reconciliation_Internal`
- `S04A_LineageDrawer`
- `S04B_VendorPreview`

Tạo một frame kiểm tra `1366 × 768`.

App shell grayscale ban đầu:

- Sidebar `232 px`.
- Top bar `56 px`.
- Breadcrumb, page title, một primary action, context/filter bar.
- Spacing `4/8 px`, radius `6 px`.
- Body/table `14/20`, page title `24/32 semibold`.
- Row variants `44 px` và `52 px`.

Chưa làm high-fi, animation, brand polish hoặc tự đặt dữ liệu.

## Khi Tier 1 trả READY_FOR_EXECUTION

1. Đọc `TASK.md > Control, Decisions, Contract, Execution Plan, Acceptance`.
2. Xác nhận spec version trong Figma cover.
3. Thực hiện lần lượt `STEP-xx`; không tự đổi canonical data/business flow.
4. Sau low-fi S01–S04, tạo `HANDOFF.md` từ `.ai-pipeline/templates/HANDOFF.template.md`.
5. Ghi frame links/exports và evidence theo từng AC ngay trong HANDOFF.
6. Khi đủ, đặt `Handoff status: READY_FOR_AUDIT` và mở task Tier 3:

```text
/audit-design hrp-v4-bod-mockup
```

## Sau audit

- Không sửa trực tiếp theo AUDIT.
- Chờ Tier 1 ghi Planner Resolution trong TASK.
- Nếu contract đổi, cập nhật Figma theo spec version mới.
- Cập nhật HANDOFF execution round rồi gửi Tier 3 re-audit.

## Điểm dừng hiện tại

Hôm nay chỉ setup file/page/frame/app shell. Chỉ bắt đầu bố trí nội dung S01/S02 sau khi TASK validator PASS và status `READY_FOR_EXECUTION`.
