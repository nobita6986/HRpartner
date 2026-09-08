# PLANNER HANDOVER (Tier 1)

**Ngày cập nhật:** 08/09/2026 14:00 +07:00
**Vai trò hiện tại:** Tier 1 (Planner)
**Người nhận bàn giao:** Next Agent (Tier 1)

---

## TÌNH TRẠNG TOÀN CẢNH

### Đã đạt được (tính đến 08/09/2026)

- **Dải V5 gần như đóng** — 55/63 hợp đồng `ACCEPTED` trong `docs/tasks/`
  - `gate-01`, `gate-02`, `gate-03`: ACCEPTED
  - `test-01-browser-lane`: ACCEPTED
  - `ui-01-new-ui-home-integration`: ACCEPTED v1.1, **deployed production 06/09**
  - `go-live-20-public-job-listing-index`: ACCEPTED, audit R1 PASS
  - `go-live-06-live-rls-matrix-restore`: ACCEPTED R3 PASS
  - **Zero** hợp đồng REVISION_REQUIRED hoặc BLOCKED
- **V6 Phase 1 đã mở** — job-opening-posting-split ACCEPTED R4 PASS
- **Index sạch** — 0 path staged, 18 untracked (chỉ measurement/evidence)
- **Baseline ổn định** — `b68d25b`

### Còn mở

| Task | Status | Chủ | Ghi chú |
|------|--------|-----|---------|
| `hrp-v6-p1-labor-profile-schema` | READY_FOR_EXECUTION | Tier 2 | LaborProfile + Intake + EmploymentEpisode |
| `hrp-v6-p1-job-opening-posting-split` | **ACCEPTED R4** | Tier 3 | Đã đóng 08/09 |
| `hrp-v6-p1c-new-ui-restyling` | READY_FOR_EXECUTION | Tier 2 | Restyling Phase C |
| `hrp-v6-security-credential-rotation` | READY_FOR_EXECUTION | Tier 2 | Security audit |
| `hrp-v6-credential-rotation-posture` | READY_FOR_EXECUTION | Tier 2 | Credential posture |
| `hrp-v5-go-live-19-tracking-pii-db-mask` | DRAFT | Tier 1 | Việc viết, chưa giao /code |
| `hrp-v5-go-live-07-marketplace-launch-proof` | DEFERRED | Tier 2 | Chờ branch `hrp_mp2_test` |

### Bị chặn hoàn toàn

- **AFF Track** — §20 aff_plan.md còn 17/17 ô chưa tick; §0 ghi "Chưa mở". Founder/sếp phải quyết.
- **V6 Phase 2+** — phụ thuộc AFF gate và Phase 3 merge

---

## VIỆC TIẾP THEO NGAY LẬP TỨC

### 1. Code `hrp-v6-p1-labor-profile-schema` (ngay bây giờ)

```text
/code hrp-v6-p1-labor-profile-schema
```

**Tóm tắt hợp đồng:** Tạo model `LaborProfile` (quan hệ 0..1 với `Worker`), `LaborProfileIntake`, `EmploymentEpisode`. Migration additive. Không UI.

**Nguồn quyết định:** `docs/V6/v6-admin-rebuild.md` §11 — V6-DEC-012, 013, 014, 023, 025, 026 đều `Chốt`.

**Lưu ý:**
- `prisma/schema.prisma` đang trong luồng V6 Phase 1; `hrp-v6-p1-job-opening-posting-split` đã giao migration rồi nhưng chưa merge vì cùng base `b68d25b`. Hai hợp đồng P1 phải merge **cùng nhau** hoặc đúng thứ tự: job-opening-split trước (nó tạo `JobOpening`/`JobPosting` mà labor-profile phụ thuộc FK).
- Cấm chạy migration trên `neondb` (production)
- Cấm chạy lại sáu migration RLS cũ trên `hrp-live`

### 2. Sau khi labor-profile-schema giao xong

```text
/audit hrp-v6-p1-labor-profile-schema
```

Sau audit PASS → `/resolve hrp-v6-p1-labor-profile-schema`

### 3. Sau khi cả hai P1 đã ACCEPTED

Thứ tự merge quan trọng: `job-opening-posting-split` phải merge **trước** `labor-profile-schema` vì:
- `job-opening-split` tạo `JobOpening` + `JobPosting` + composite index
- `labor-profile-schema` tạo `LaborProfile` (không phụ thuộc JobOpening FK nhưng chung một schema.prisma)

Tier 1 commit scoped cho từng task theo đúng pathspec, **KHÔNG dùng `git commit` trần**.

---

## V6 ROADMAP — TRẠNG THÁI CHI TIẾT

Xem `docs/V6/v6-roadmap.html` để cập nhật toàn cảnh. Tóm tắt nhanh:

### P0 — Đóng dải V5 ✅ ĐÃ ĐÓNG
55/63 ACCEPTED. 4 READY chưa giao. 1 DRAFT (Tier 1 viết). 1 DEFERRED.

### P1 — new-ui trang chủ ✅ ACCEPTED
`ui-01` v1.1 ACCEPTED, deployed 06/09.

### P1B — trang danh sách /viec-lam ✅ ACCEPTED
`go-live-20` v1.5 ACCEPTED, audit R1 PASS.

### P2 — AFF Gate ⛔ CHẶN
17/17 ô §20 chưa tick. Founder + sếp phải quyết. Tuyệt đối KHÔNG mở task AFF nào trước khi §20 đủ.

### P3 — V6 Foundation Schema 🔄 ĐANG LÀM
1/2 done (`job-opening-posting-split` R4 PASS). Tiếp: `labor-profile-schema`.

### P4 — V6 Admin ∥ AFF Track ⏳ CHƯA MỞ
Mở sau khi P3 merge. Mỗi phase V6 Admin cần V6-DEC mới mở §7.3 trước.

### P5 — Rollout & vệ sinh ⏳ CHƯA MỞ
Rotate credential theo PLANNER_HANDOVER.md §13. Pentest. Cleanup.

---

## NỀN TẢNG QUYẾT ĐỊNH V6 ĐÃ CÓ SẴN

`docs/V6/v6-admin-rebuild.md` §11 có **31 quyết định V6-DEC-001..031** đều `Chốt`. §12: **chỉ hàng `Chốt` mới làm cơ sở viết TASK**.

### Các quyết định quan trọng cần nhớ khi viết TASK P3

| V6-DEC | Nội dung | Ảnh hưởng |
|--------|---------|-----------|
| 011 | JobPosting ↔ JobOpening 1:1, Opening tối đa 1 active | Mô hình posting mới |
| 012 | Tạo/match LaborProfile tối thiểu khi có thông tin + consent | LaborProfile trigger |
| 013 | Một LaborProfile tối đa một Worker canonical | Dedup authority |
| 014 | EmploymentEpisode append-only, không sửa đè | Mô hình history |
| 017 | StaffingOrderSlot là persistence chuyển tiếp cho JobOpening | Slot model |
| 023 | Public và staff-assisted intake dùng chung create-or-match | Intake deduplication |
| 025 | Backfill người đang làm bằng Intake, cấm Application giả | Migration constraint |
| 026 | Completeness và verification là hai trạng thái độc lập | Status model |

### Hai hàng rào đang sống (P3 sẽ chạm)

1. **Slug publish sẽ đổi** — hiện dùng `project.code/id`, tách JobPosting sẽ đổi chỗ publish → phải kèm redirect map
2. **`where` của query công khai bị đóng băng** — `public-card-truth.test.ts:293` ghim `['isPublic','staffingOrders','status']`; mọi TASK thêm điều kiện phải cập nhật hàng rào này **trong cùng lượt**

---

## QUY TẮC VÀNG (Luôn tuân thủ)

### Cấm tuyệt đối

- **Cấm `git commit` trần** — dùng `git commit -- <pathspec>`; cây đang có nhiều luồng chạy song song
- **Cấm `git add -A` và `git add .`** — phạm vi luôn rõ ràng từ HANDOFF
- **Cấm chạy migration trên `neondb`** (production)
- **Cấm chạy lại sáu migration RLS cũ trên `hrp-live`** — chúng `CREATE OR REPLACE` hạ cấp hai hàm `*_visible_for`
- **Cấm `git gc --prune`, `git reflog expire`, `git stash drop`** — giữ blob bản giao
- **Cấm tự sửa code ở Tier 1** — chỉ viết Markdown (TASK.md, AUDIT.md)

### Ba tài nguyên RLS bắt buộc

- `neondb` (branch `hrp-live`) = **PRODUCTION**
- `hrp_mp2_test` (Expires = never) = branch test **duy nhất** đủ ma trận RLS
- **Không bao giờ** tạo branch test mới từ `hrp-live`

### Tier 1 chỉ viết TASK.md

- Không viết code, không sửa code, không commit code
- Sau khi Tier 2 ghi `HANDOFF.md` `READY_FOR_AUDIT` → gọi `/audit <slug>`
- Sau khi Tier 3 ghi `AUDIT.md` verdict PASS → tự update `Status` trong `TASK.md` → `/resolve <slug>`

### Cổng chạy bằng PowerShell

```powershell
powershell -NoProfile -File ./.ai-pipeline/scripts/verify-task.ps1    -TaskPath docs/tasks/<slug>/TASK.md
powershell -NoProfile -File ./.ai-pipeline/scripts/verify-handoff.ps1 -TaskPath docs/tasks/<slug>/TASK.md
powershell -NoProfile -File ./.ai-pipeline/scripts/verify-audit.ps1  -TaskPath docs/tasks/<slug>/TASK.md -AuditPath docs/tasks/<slug>/AUDIT.md
```

Exit 0 = cấu trúc OK. Cổng xanh **không phải** verdict — Tier 1 phải tự đọc AUDIT.md.

### Luật bảo trì v6-roadmap.html

Cập nhật **ngay khi** một hợp đồng đổi `Status` (→ ACCEPTED, REVISION_REQUIRED, BLOCKED, hoặc hợp đồng mới ra đời). Dùng `measure-roadmap.ps1` để đo số thực, không suy từ trí nhớ.

---

## §13 — CREDENTIAL ROTATION (Chờ Phase 5)

Sếp đã quyết: mọi rotate credential viết **hết vào HANDOFF.md** và làm **cuối cùng trước khi public**. Không task nào ở Phase 0–4 được coi rotate là điều kiện chặn.

Nội dung cổng Phase 5: rotate credential · pentest · dọn `.neon` · AFF-07 staged rollout · V6-P5 dọn UI Staffing Order cũ · xoá dữ liệu DEMO seed.

---

## CẬP NHẬT V6-ROADMAP SAU MỖI TASK

Chạy trước khi commit bất cứ gì:

```powershell
# Tổng hợp trạng thái
powershell -NoProfile -File ./measure-roadmap.ps1

# Kết cấu một hợp đồng (đếm ID duy nhất)
f=docs/tasks/<slug>/TASK.md
for k in RQ STEP AC EV DEC; do
  printf '%-6s %s\n' "$k" "$(grep -oE "\b$K-[0-9]{2}\b" "$f" | sort -u | wc -l)"
done
```

---

*Chúc người kế nhiệm làm việc năng suất và qua ải Tier 3 trót lọt!*
*Cập nhật lần cuối: 08/09/2026 14:00 +07:00 bởi Tier 1 Agent*
