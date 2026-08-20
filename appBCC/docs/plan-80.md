# PLAN: HrP ETL Desktop — Chuyển đổi Chấm công → Bảng lương 80 dự án + AI Reconciliation

> **Phiên bản:** 1.1
> **Ngày:** 2026-08-19
> **Phạm vi:** Toàn bộ ETL Desktop (`appBCC/`) — làm "conversion core" cho 80 dự án, lọc sạch dữ liệu, tự động đối soát bằng AI.

---

## 0.1 KIẾN TRÚC 3 MÔI TRƯỜNG DATABASE (Quyết định N1-N4, phiên 2026-08-19)

### Tổng quan 3 môi trường

```
┌────────────────────────────────────────────────────────────────────────┐
│                          DEV (Local)                                     │
│  • SQLite local: hrp_local.db                                            │
│  • Dùng khi dev/test không cần internet                                 │
│  • DATABASE_URL=sqlite:///hrp_local.db                                   │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼  (git push, CI/CD)
┌────────────────────────────────────────────────────────────────────────┐
│                     STAGING (Neon Branch)                                │
│  • Neon Branch clone từ production                                       │
│  • URL: postgresql://...neon.tech/staging_db?...                         │
│  • DATABASE_URL_STAGING=...                                              │
│  • app/bcc (dev env) tham chiếu DB này thông qua DATABASE_URL             │
│  • ETL ghi V4 vào đây TRONG GIAI ĐOẠN THỬ NGHIỆM                        │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼  (sau khi V4 ổn định — migrate data theo cơ chế riêng)
┌────────────────────────────────────────────────────────────────────────┐
│                      PROD (Neon Main)                                     │
│  • Neon Project hiện tại (chứa portal_timesheets)                        │
│  • URL: postgresql://...neon.tech/main_db?...                            │
│  • DATABASE_URL_PROD=...                                                 │
│  • app/bcc (prod env) vẫn đang đọc từ đây TRONG GIAI ĐOẠN HIỆN TẠI       │
│  • Sau migrate, V4 tables sẽ là NGUỒN CHÍNH THỨC                           │
└────────────────────────────────────────────────────────────────────────┘
```

### Mapping biến môi trường (theo Q3 — 3 môi trường rõ ràng)

| Biến | DEV | STAGING | PROD |
|------|-----|---------|------|
| `APP_ENV` | `dev` | `staging` | `prod` |
| `DATABASE_URL` | `sqlite:///hrp_local.db` | Neon Branch URL | Neon Main URL |
| `APPBCC_DATABASE_URL` | `sqlite:///hrp_local.db` | Neon Branch URL | Neon Main URL |
| `NEXTAUTH_DATABASE_URL` (web) | `sqlite:///` | Neon Branch URL | Neon Main URL |
| Log | loguru dev mode | loguru info | loguru warn+ |

### Quyết định N4 — Triết lý migration (cập nhật)

**ETL chỉ ghi V4 vào DB phụ (STAGING) trong toàn bộ giai đoạn phát triển & thử nghiệm.**

Lý do:
- Không động chạm DB production
- `app/bcc` tham chiếu DB phụ → an toàn để thử nghiệm end-to-end (Pilot 1 dự án trước, sau đó rollout)
- Migration data sang DB main = **bước riêng**, cần có cơ chế riêng (chưa quyết định ở đây)

Các lựa chọn cơ chế migration sau này (chỉ chọn khi V4 ổn định):
1. **Restore-overwrite:** Dump staging V4 → restore sang prod (cần downtime)
2. **Cross-DB ETL:** ETL 1 lần cuối từ staging → prod (1 chiều, có audit_logs)
3. **Promote branch:** Neon hỗ trợ promote branch → main (nhanh nhất, không cần custom ETL)

> Tôi đề xuất **Promote branch** (option 3) vì Neon hỗ trợ native. Sếp duyệt thì tôi sẽ implement sau khi V4 ổn định.

### Checklist setup DB phụ

| # | Task | Công cụ | Trạng thái |
|---|------|---------|-----------|
| S.1 | Vào Neon Console → Project hiện tại → tạo Branch tên `v4-staging` từ main | Neon Console | ⬜ |
| S.2 | Lấy Branch connection string → lưu vào `.env.staging` | .env | ⬜ |
| S.3 | Copy `.env` → `.env.staging` với URL mới | .env.staging | ⬜ |
| S.4 | Cập nhật `prisma/schema.prisma`: thêm schema migration file V4 | Prisma | ⬜ |
| S.5 | Chạy `prisma migrate deploy` trên staging branch | Prisma | ⬜ |
| S.6 | Verify bảng V4 có trong staging (8 bảng + views) | psql | ⬜ |
| S.7 | Sửa `app/bcc/actions.ts`: đổi `process.env.DATABASE_URL` → `process.env.STAGING_DATABASE_URL` (chỉ trong dev mode) | Next.js | ⬜ |
| S.8 | Test: app/bcc query staging → verify data mới ETL đẩy lên | Manual | ⬜ |
| S.9 | Doc: README_STAGING.md hướng dẫn cách switch DB | docs/ | ⬜ |

### Rủi ro & Mitigation

| Rủi ro | Mitigation |
|--------|------------|
| Dev cấu hình nhầm DATABASE_URL → ETL ghi vào prod | Validate `APP_ENV` ở khởi động ETL, block nếu DB="prod" và APP_ENV ≠ "prod" |
| Web app/bcc chạy nhầm DB | Log rõ ràng ở startup: "Connected to: <DB_NAME>@<HOST>" |
| Staging DB hết quota Neon free tier | Neon free cho 3 branches, đủ cho dev. Khi hết quota → tạo branch mới từ main |
| Schema drift giữa staging và prod | Auto-check schema bằng `prisma migrate diff` mỗi CI run |

---

## 0. BỐI CẢNH & MỤC TIÊU

### Bối cảnh
- Python ETL (`appBCC/`) hiện đang parse Excel chấm công, tính lương (chỉ có plugin **Actro**), và push lên bảng tạm `portal_timesheets` trên Neon Postgres.
- Web App Next.js (`HrP/`) đọc dữ liệu từ `portal_timesheets` (bảng tạm) để hiển thị ở `app/bcc` (BCC-1).
- Có kiến trúc V4 schema (8 bảng: `workers`, `project_assignments`, `timesheet_periods`, `timesheet_lines`, `manual_allowances`, `vendors`, `vendor_aliases`, `source_claims`) đã được định nghĩa trong `migrations/v4_schema.py` — nhưng chưa nối vào pipeline.
- Đã chốt kiến trúc Hybrid SOT (docs/implementation_plan_ETL-HrP.md): chấm công/lương = ETL SOT, workers/vendors = Web SOT.

### Mục tiêu lớn
1. **Làm ETL thành "conversion core"**: nhận 80 dự án × N format Excel chấm công × N kỳ lương → chuẩn hoá → ghi vào **V4 tables trên STAGING DB** (DB phụ trên Neon Branch).
2. **Lọc sạch dữ liệu**: AI hỗ trợ detect outliers, format lạ, duplicate; loại bỏ dòng lỗi hoặc cảnh báo trước khi tính lương.
3. **AI Reconciliation tự động**: thay thế con người trong 2 điểm in-the-loop:
   - **Phase A:** Đối soát đa điểm sau khi parse dữ liệu (so sánh Excel ↔ Plugin output ↔ DB)
   - **Phase B:** Đối soát khi người dùng upload bảng lương tính tay (so sánh Manual Excel ↔ Auto-calculated)
4. **Migrate output từ `portal_timesheets` → `timesheet_lines`/V4 tables**: KHÔNG làm trong giai đoạn này. Sau khi V4 ổn định ở staging, sẽ có migration plan riêng.

### Quyết định kiến trúc đã chốt
| # | Quyết định | Ghi chú |
|---|-----------|---------|
| Q1 | 80 plugin riêng (1 plugin = 1 dự án) | Generate từ template + JSON config để dễ maintain |
| Q2 | Excel-driven (giữ hiện trạng) | Parse file Excel chấm công từ kế toán gửi |
| Q3 | Output V4 tables | Theo Hybrid SOT |
| Q4 | DeepSeek AI mapper | Mở rộng từ điển, active learning cơ bản |

---

## 1. KIẾN TRÚC TỔNG THỂ

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INPUT: File Excel chấm công                      │
│           (80 dự án × N format khác nhau × N kỳ lương)             │
│           Hoặc: File Excel bảng lương tính tay (Manual)            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: INGEST — Phát hiện format & tách cột thô                  │
│  • core_pipeline.py: header detection, daily cols, summary cols   │
│  • Pure ingest — không biết dự án là gì                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: MAP COLUMNS — AI DeepSeek (mở rộng từ điển)               │
│  • agent_mapper.py: project_specific.json → DeepSeek → fallback    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: IDENTITY — Chuẩn hóa Worker & Project                       │
│  • formulas/worker_identity.py: hash CCCD → USR-XXXXXX            │
│  • get_or_create_worker / assignment (đã có)                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: COMPUTE — Tính lương qua plugin (80 dự án)                  │
│  • formulas/{project}.py (1 plugin = 1 dự án, BaseFormula)         │
│  • Output: {salaryItems, allowances, deductions, summary}            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│  STEP 4.5: AI RECONCILIATION PHASE A — Đối soát đa điểm [MỚI]    │
│  • So sánh: raw Excel ↔ Plugin output ↔ Expected VND range         │
│  • Auto-flag outliers, duplicate, format lạ                        │
│  • Output: clean data + reconciliation_report.json                  │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: TRANSFORM — Chuẩn hoá V4 schema                             │
│  • map → workers, project_assignments, timesheet_lines, allowances │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 6: WRITE V4 — SQLite local → Neon sync                        │
│  • migrations/v4_sync.py (Hybrid SOT, DI-08, DI-09)                  │
│  • Song song 2-4 tuần: ghi portal_timesheets (transition)           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 6.5: AI RECONCILIATION PHASE B — So sánh Manual vs Auto [MỚI]│
│  • Khi user upload bang-luong-tinh-tay.xlsx                          │
│  • Per-row diff + confidence score                                   │
│  • 3 modes: AUTO-ACCEPT / FLAG-FOR-REVIEW / BLOCKED                 │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    OUTPUT: HrP Portal (`app/bcc`) đọc V4           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. GIAI ĐOẠN 1 — Mở rộng core_pipeline (3-5 ngày)

> **Mục tiêu:** Bỏ hardcode "Nhà máy Actro", chấp nhận 80 plugin khác nhau.

| # | Task | File | P |
|---|------|------|---|
| 1.1 | Refactor `core_pipeline.py:187` — loại bỏ `if project_name == "Nhà máy Actro"`; thay bằng `formula_engine.parse_columns(raw_row)` | core_pipeline.py | P0 |
| 1.2 | Thêm method `parse_daily_columns(idx, row, calc_year, calc_month)` vào `BaseFormula` | base_formula.py | P0 |
| 1.3 | Thêm method `get_required_columns()` — khai báo cột bắt buộc | base_formula.py | P0 |
| 1.4 | Implement `parse_daily_columns` cho Actro (chuyển logic cũ ra plugin) | actro_formula.py | P0 |
| 1.5 | Thêm logging: dự án, kỳ, rows OK / lỗi | core_pipeline.py | P1 |
| 1.6 | Unit test cho plugin giả format chuẩn | tests/ | P1 |

**Acceptance:**
- Một plugin mới (kế thừa `BaseFormula`) có thể chạy end-to-end với file Excel riêng
- Không còn từ khoá "Nhà máy Actro" trong `core_pipeline.py`

---

## 3. GIAI ĐOẠN 2 — Mở rộng agent_mapper (2-3 ngày)

> **Mục tiêu:** DeepSeek tự động map đúng cho 80 dự án, có memory.

| # | Task | File | P |
|---|------|------|---|
| 2.1 | Tách từ điển mapping ra `column_dict.json` (đã có) | agent_mapper.py | P0 |
| 2.2 | Thêm từ điển `project_specific.json` — 1 bộ cột riêng cho mỗi dự án | agent_mapper.py | P0 |
| 2.3 | Auto-save mapping đúng vào JSON sau khi user OK ReviewMappingDialog | agent_mapper.py | P0 |
| 2.4 | Cache `STANDARD_COLUMNS` per-project | agent_mapper.py | P1 |
| 2.5 | Fallback chain: `project_specific` → `column_dict` → `DeepSeek` → user prompt | agent_mapper.py | P0 |

**Acceptance:**
- Lần 2 parse cùng dự án với header giống nhau → từ điển trả match ngay, không gọi DeepSeek
- Headers lạ → DeepSeek map, user confirm → ghi vào `project_specific.json`

---

## 4. GIAI ĐOẠN 3 — 80 plugin formulas (2-4 tuần)

> **Mục tiêu:** 80 plugin, 1 plugin = 1 dự án.

### 4.1 Khảo sát 80 dự án
| # | Task | P |
|---|------|---|
| 3.1 | Liệt kê 80 dự án hiện có | P0 |
| 3.2 | Gom nhóm theo cụm biểu lương tương tự (ước tính 5-7 cụm) | P0 |
| 3.3 | Với mỗi cụm, viết 1 **plugin template** có tham số | P0 |
| 3.4 | Generate 80 plugin = 7 template × override config JSON | P0 |
| 3.5 | Với mỗi plugin, khai báo `get_check_columns()` | P0 |
| 3.6 | Test cho mỗi plugin với file Excel mẫu thật | P1 |
| 3.7 | Doc: cách tạo plugin mới (CONTRIBUTING.md) | P2 |

### 4.2 Template format (đề xuất)
```python
# formulas/base_formula.py (mở rộng)
class ParametricFormula(BaseFormula):
    """Template cho plugin dự án dùng config"""
    config_path: str  # "formulas/configs/project_x.json"

    @property
    def project_name(self) -> str:
        return self.config["name"]

    def get_check_columns(self) -> dict:
        return self.config["check_columns"]

    def calculate(self, raw_data: dict) -> dict:
        return compute_from_config(self.config, raw_data)
```

```json
// formulas/configs/project_x.json
{
  "name": "Dự án X - Công ty Y",
  "check_columns": { "Tổng ngày công (Ngày)": "total_days", ... },
  "base_salary": 5500000,
  "working_days_per_month": 26,
  "allowances": [
    { "name": "Chuyên cần", "condition": "absent_days==0", "amount": 300000 },
    { "name": "Phụ cấp đời sống", "amount": 500000 }
  ],
  "deductions": [
    { "name": "Bảo hiểm", "rate": 0.105, "base": "base_salary" }
  ],
  "ot_rates": { "ot_130": 1.3, "ot_150": 1.5, "ot_200": 2.0 }
}
```

### 4.3 Quyết định cần sếp
- **80 plugin tự viết tay** (12k-16k dòng code, dễ debug) hay **80 file config + 7 template** (~2.4k dòng, dễ maintain)?
- Đề xuất: **80 file config + 7 template** vì 80 dự án công thức thường na ná, maintain tập trung.

---

## 5. GIAI ĐOẠN 4 — Worker Identity + V4 Write + Sync (1 tuần)

> **Mục tiêu:** Đổ data sạch vào V4 tables + sync Neon đúng Hybrid SOT.

| # | Task | File | P |
|---|------|------|---|
| 4.1 | Implement `generate_user_id()` theo PLAN 19.2 (hash CCCD → USR-XXXXXX) | worker_identity.py | P0 |
| 4.2 | Refactor `core_pipeline.preview_file()` → `transform_to_v4(preview_data, project)` | core_pipeline.py | P0 |
| 4.3 | Tạo `migrations/v4_writer.py` — INSERT vào 5 bảng V4 trong SQLite | v4_writer.py (mới) | P0 |
| 4.4 | Refactor `v4_sync.py` theo Hybrid SOT (DI-08, DI-09) | v4_sync.py | P0 |
| 4.5 | Tạo `formulas/period_utils.py` — `format_period_id()` (DI-08) | period_utils.py (mới) | P0 |
| 4.6 | Thêm trigger auto-update `updated_at` cho 5 bảng V4 (DI-09) | v4_schema.py | P0 |
| 4.7 | Song song: vẫn ghi `portal_timesheets` 2-4 tuần transition | core_pipeline.py | P1 |
| 4.8 | Verify: `app/bcc` đọc đúng data V4 cho 1 dự án pilot (Actro) | manual test | P0 |

---

## 6. GIAI ĐOẠN 5 — AI RECONCILIATION PHASE A (Đối soát đa điểm) [MỚI]

> **Mục tiêu:** Auto-detect outliers/sai lệch sau khi parse dữ liệu, **trước khi tính lương**.

### 6.1 Bối cảnh
Hiện tại kế toán phải mắt thường đối chiếu:
1. File Excel gốc (chấm công thô từ máy chấm công)
2. Tổng hợp cuối tháng từ kế toán (ngày công, OT, phụ cấp)
3. Output plugin tính ra
4. Bảng lương tháng trước (so trend)

Những bước này dễ sai vì:
- Một NV đột nhiên "OT 300 giờ" → chia cho 30 không đúng
- Một dự án bỗng "tăng 50% quỹ lương" → sai hệ số
- Trùng CCCD → trùng dòng
- Format số lạ: "1,200.5" vs "1.200,5" → parse sai

### 6.2 Kiến trúc AI Reconciler Phase A

```
INPUT: raw_data (từ Step 4 — compute)
        + historical_data (SQLite, 3-6 tháng gần nhất)
        + project_rules (validation rules per project)

        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6.A.1 — STATISTICAL OUTLIER DETECTION (không cần AI)               │
│  • Tính IQR / Z-score cho:                                          │
│    - total_hours per day (typical 8h, OT 4h)                        │
│    - total_income per worker (typical 5-15M VND)                     │
│    - absent_days (typical 0-2)                                       │
│  • Flag dòng có Z > 3 hoặc ngoài [Q1-1.5*IQR, Q3+1.5*IQR]         │
└─────────────────────────────────────────────────────────────────────┘
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6.A.2 — CROSS-ROW CONSISTENCY (không cần AI)                        │
│  • CCCD trùng → trùng row → flag                                    │
│  • emp_code trùng trong cùng period → flag                           │
│  • total_work_days + absent_days > days_in_month → flag               │
│  • weekday shift không khớp với day_type → flag                      │
└─────────────────────────────────────────────────────────────────────┘
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6.A.3 — DEEPSEEK ANOMALY EXPLANATION (cần AI)                       │
│  • Với row flagged, hỏi DeepSeek:                                   │
│    "Giải thích vì sao dòng này bất thường?"                         │
│    "Trong dự án {project}, NV này có khả năng nào OT 350 giờ không?"│
│  • DeepSeek trả về: reason + confidence (0-1)                       │
└─────────────────────────────────────────────────────────────────────┘
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  OUTPUT: reconciliation_report_A.json                                │
│  {                                                                  │
│    "project": "...",                                                │
│    "period": "2026-07",                                              │
│    "total_rows": 120,                                                │
│    "clean_rows": 100,                                                │
│    "flagged_rows": [                                                 │
│      {                                                              │
│        "row_id": "uuid",                                            │
│        "emp_code": "NV001",                                          │
│        "flags": ["OT_ZSCORE>3"],                                     │
│        "reason": "...",                                              │
│        "confidence": 0.85,                                           │
│        "action": "BLOCKED" | "FLAG_FOR_REVIEW" | "AUTO_ACCEPT"      │
│      }                                                              │
│    ]                                                                │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Implementation Plan Phase A

| # | Task | File mới | P |
|---|------|----------|---|
| 5A.1 | Module `ai_reconciler/__init__.py` — facade | ai_reconciler/ | P0 |
| 5A.2 | `ai_reconciler/statistical.py` — IQR / Z-score outliers | ai_reconciler/statistical.py | P0 |
| 5A.3 | `ai_reconciler/consistency.py` — CCCD trùng, weekday không khớp | ai_reconciler/consistency.py | P0 |
| 5A.4 | `ai_reconciler/deepseek_anomaly.py` — giải thích + confidence | ai_reconciler/deepseek_anomaly.py | P0 |
| 5A.5 | `ai_reconciler/report.py` — serialize JSON, UI render | ai_reconciler/report.py | P0 |
| 5A.6 | Hook vào `core_pipeline.parse_file()` — chạy Phase A trước Step 5 | core_pipeline.py | P0 |
| 5A.7 | UI: tab mới "Đối soát Phase A" hiển thị flagged rows (PySide6) | app.py | P1 |
| 5A.8 | Action per row: BLOCKED → chặn ghi V4; FLAG → highlight vàng; OK → xanh | app.py | P0 |
| 5A.9 | Test: file Excel có 2 NV trùng CCCD → flag đúng | tests/test_phase_a.py | P1 |
| 5A.10 | Test: NV có OT 350 giờ → DeepSeek giải thích lý do plausibility | tests/test_phase_a.py | P1 |

### 6.4 Quyết định thiết kế Phase A

**Q-A1:** Confidence threshold cho AUTO_ACCEPT / FLAG / BLOCKED?
- Đề xuất: `> 0.85 → AUTO_ACCEPT`, `0.5-0.85 → FLAG`, `< 0.5 → BLOCKED`

**Q-A2:** Statistical detection dùng IQR hay Z-score?
- IQR (khoảng tin cậy 75%) cho dữ liệu lệch (như income)
- Z-score cho dữ liệu phân phối chuẩn (như hours/day)
- Đề xuất: **cả 2**, chạy song song

**Q-A3:** Số tháng historical data cần để so trend?
- Đề xuất: **3-6 tháng gần nhất** (lưu trong `monthly_snapshot` table)

### 6.5 Acceptance Phase A
- File Excel test có 1 NV outlier → reconcile Phase A flag được, xuất `reconciliation_report_A.json` đúng format
- DeepSeek giải thích được lý do hợp lý (kiểm tra bằng tay 5 case)
- UI tab "Đối soát Phase A" hiển thị flagged rows với màu
- Actions BLOCKED / FLAG / AUTO_ACCEPT ghi đúng trạng thái

---

## 7. GIAI ĐOẠN 6 — AI RECONCILIATION PHASE B (Manual vs Auto) [MỚI]

> **Mục tiêu:** Khi người dùng upload bảng lương đã tính tay, AI tự động so với auto-calculated để bắt sai lệch.

### 7.1 Bối cảnh
Hiện tại kế toán:
1. Đợi ETL tính lương từ file chấm công
2. Nhận lại bảng auto-calculated
3. **Tự tính lại bằng tay** (Excel/cây viết)
4. So 2 bảng → tìm dòng khác
5. Tìm lý do khác → sửa

Bước 3-5 tốn 2-4 giờ mỗi dự án × 80 dự án = **160-320 giờ/tháng**.

### 7.2 Kiến trúc AI Reconciler Phase B

```
INPUT:
  • `manual_payroll.xlsx` (user upload — bảng lương kế toán tính tay)
  • `auto_payroll.xlsx` (output từ ETL)
  • `v4_timesheet_lines` (ground truth từ chấm công)

        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6.B.1 — ROW MATCHING (không cần AI)                                 │
│  • Match 2 bảng manual vs auto theo (emp_code, period)              │
│  • Match 3 chiều: manual ↔ auto ↔ timesheet_lines                   │
│  • Output: matched_pairs + unmatched_manual + unmatched_auto        │
└─────────────────────────────────────────────────────────────────────┘
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6.B.2 — NUMERIC DIFF & TOLERANCE (không cần AI)                     │
│  • Cho mỗi cột tiền (gross_income, total_salary, allowance...)    │
│  • diff = manual_value - auto_value                                  │
│  • Đánh dấu:                                                        │
│    - |diff| < 1.000 VND → MATCH                                     │
│    - |diff| 1.000 - 100.000 VND → MINOR_DIFF (round error)          │
│    - |diff| > 100.000 VND → MAJOR_DIFF                              │
└─────────────────────────────────────────────────────────────────────┘
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6.B.3 — DEEPSEEK ROOT-CAUSE ANALYSIS (cần AI)                       │
│  • Với mỗi MAJOR_DIFF, hỏi DeepSeek:                                │
│    "Manual tính {manual_val} nhưng auto tính {auto_val} cho NV {emp} │
│     trong tháng {month}, dự án {project}. Chấm công:               │
│     {total_days} ngày, {normal_hours}h HC, {ot_150}h OT150.         │
│     Hãy giải thích khả năng nào:                                    │
│     1. Manual sai (tính nhầm)                                       │
│     2. Auto sai (plugin sai hệ số)                                  │
│     3. Khác biệt do manual có dữ liệu phụ không có trong Excel     │
│     Trả về: most_likely_cause + confidence + suggested_value"        │
└─────────────────────────────────────────────────────────────────────┘
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  OUTPUT: reconciliation_report_B.json                                │
│  {                                                                  │
│    "project": "...",                                                │
│    "period": "2026-07",                                              │
│    "summary": {                                                     │
│      "total_matched": 120,                                          │
│      "exact_match": 110,                                            │
│      "minor_diff": 5,                                               │
│      "major_diff": 5,                                               │
│      "manual_only": 2,                                              │
│      "auto_only": 1,                                                │
│      "total_diff_vnd": 250000                                       │
│    },                                                               │
│    "diff_rows": [                                                    │
│      {                                                              │
│        "emp_code": "NV001",                                         │
│        "manual_value": 8500000,                                     │
│        "auto_value": 9200000,                                       │
│        "diff": -700000,                                             │
│        "likely_cause": "Manual missing OT_200 (2h x 250k rate) ...", │
│        "confidence": 0.78,                                          │
│        "suggested_value": 9200000,                                  │
│        "action": "FLAG" | "BLOCKED" | "AUTO_ACCEPT"                │
│      }                                                              │
│    ]                                                                │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.3 Implementation Plan Phase B

| # | Task | File mới / sửa | P |
|---|------|----------------|---|
| 5B.1 | Tab mới UI "Đối soát Manual vs Auto" — upload 2 file | app.py | P0 |
| 5B.2 | `ai_reconciler/manual_compare.py` — Row matching (emp_code, period) | manual_compare.py | P0 |
| 5B.3 | `ai_reconciler/manual_compare.py` — Numeric diff + tolerance | manual_compare.py | P0 |
| 5B.4 | `ai_reconciler/manual_compare.py` — Persist report vào SQLite | v4_schema.py (bảng mới) | P0 |
| 5B.5 | Bảng `reconciliation_reports` + `reconciliation_diff_rows` | v4_schema.py | P0 |
| 5B.6 | `ai_reconciler/deepseek_cause.py` — Root-cause analysis | deepseek_cause.py | P0 |
| 5B.7 | UI: hiển thị diff_rows với màu (đỏ/vàng/xanh) + nút Accept Manual / Accept Auto / Edit | app.py | P0 |
| 5B.8 | Nút "Apply suggested_value" → UPDATE bảng lương chuẩn | app.py | P1 |
| 5B.9 | Batch: cho 80 dự án upload song song → aggregate report | ai_reconciler/manual_compare.py | P1 |
| 5B.10 | Test: manual sai 1 dòng → AI detect đúng nguyên nhân | tests/test_phase_b.py | P1 |

### 7.4 Quyết định thiết kế Phase B

**Q-B1:** Tolerance cho MINOR_DIFF vs MAJOR_DIFF?
- Đề xuất: `MINOR < 1.000 VND` (làm tròn), `MAJOR > 100.000 VND` (rõ ràng sai)
- Có thể tune theo từng dự án (vd: dự án lương cao → MAJOR > 500.000)

**Q-B2:** Khi manual_only (có dòng manual không có trong auto) → xử lý thế nào?
- Đề xuất: **MANUAL_IS_TRUTH** vì kế toán thường có thông tin ngoài Excel (manual allowance, điều chỉnh)
- Action: `auto_insert_into_v4_from_manual(...)` — cho kế toán click "Insert manual rows" thay vì điền tay

**Q-B3:** Khi AI confidence thấp (< 0.5) → có chặn ghi V4 không?
- Đề xuất: **CHẶN** — phải có kế toán review thủ công (in-the-loop fallback)

### 7.5 Acceptance Phase B
- Upload `manual_payroll.xlsx` + `auto_payroll.xlsx` (cùng dự án/kỳ) → AI tạo `reconciliation_report_B.json` đúng format
- Khớp 95%+ rows cho manual rất giống auto
- 1 row manual sai 700k → AI flag MAJOR_DIFF, đề xuất root cause (sai confidence > 0.6)
- UI cho phép Apply suggested_value → UPDATE bảng lương chuẩn

---

## 8. DEPENDENCIES & TECH STACK

| Loại | Tool | Mục đích |
|------|------|----------|
| Python | 3.11+ (đang dùng) | Runtime |
| GUI | PySide6 (đang dùng) | Desktop UI |
| DB local | SQLite (đang dùng) | Staging + reconciliation cache |
| DB cloud | PostgreSQL / Neon (đang dùng) | HrP Portal |
| ORM | SQLAlchemy (đang dùng) | Database access |
| Excel | pandas + openpyxl (đang dùng) | Parse + export |
| AI | DeepSeek API (đang dùng) | LLM cho mapping + reconciliation |
| Validation | pydantic (mới) | Reconciliation report schema |
| Statistics | numpy/scipy (mới, optional) | IQR / Z-score |
| Logging | loguru (đề xuất thay print) | Production-grade logging |

---

## 9. CÂU HỎI CẦN SẾP TRẢ LỜI

### Đã chốt (phiên trước)
| Q | Chốt |
|---|------|
| 1. Plugin structure | 80 plugin riêng |
| 2. Input format | Excel-driven |
| 3. Output format | V4 tables |
| 4. Mapping | DeepSeek AI |

### Câu hỏi mới (gửi sếp lần này)
| Q | Câu hỏi | Đề xuất |
|---|---------|---------|
| R1 | 80 dự án — sếp có danh sách + công thức chưa? Hay cần khảo sát? | Sếp cung cấp (file Excel/Word) |
| R2 | 80 plugin viết tay vs template+config? | Template+config (2.4k dòng) |
| R3 | Pilot dự án đầu tiên? | Actro (có code rồi) |
| R4 | Transition portal_timesheets → V4 bao lâu? | 2-4 tuần song song |
| **R5** | Phase A: confidence threshold để AUTO_ACCEPT? | `>0.85 OK`, `0.5-0.85 FLAG`, `<0.5 BLOCK` |
| **R6** | Phase A: dùng IQR hay Z-score? | Cả 2 song song |
| **R7** | Phase A: bao nhiêu tháng historical data? | 3-6 tháng |
| **R8** | Phase B: tolerance MINOR vs MAJOR? | MINOR <1k, MAJOR >100k |
| **R9** | Phase B: dòng chỉ có ở manual → insert vào V4? | CÓ, kế toán bấm nút insert |
| **R10** | Phase B: DeepSeek confidence thấp → chặn? | CÓ, BLOCKED |

---

## 10. TIMELINE ĐỀ XUẤT

| Tuần | Công việc |
|------|-----------|
| W1 | Giai đoạn 1 + 2 (core_pipeline refactor + agent_mapper mở rộng) |
| W2-W5 | Giai đoạn 3 (80 plugin formulas) |
| W6 | Giai đoạn 4 (Worker ID + V4 write + Sync) |
| W7 | Giai đoạn 5 — Phase A (AI Reconciliation đa điểm) |
| W8 | Giai đoạn 6 — Phase B (Manual vs Auto reconciliation) |
| W9 | Pilot 1 dự án (Actro) end-to-end |
| W10 | Rollout 80 dự án (transition portal_timesheets song song) |
| W11-W12 | Stabilize, monitor, fix bugs |

---

## 11. LIÊN KẾT

- **Plan tổng HrP:** `docs/PLAN_TinhLuong_Actro_v1.md` (PHẦN 19 — Hybrid SOT sync)
- **Implementation plan Hybrid SOT:** `docs/implementation_plan_ETL-HrP.md`
- **Yêu cầu đồng bộ Neon:** `docs/SYNC_ETL_TO_NEON_REQUIREMENTS.md` (DI-01..DI-09)
- **Code hiện tại:**
  - `app.py` — PySide6 GUI
  - `core_pipeline.py` — Pipeline Excel → tính lương → push Neon
  - `agent_mapper.py` — DeepSeek AI column mapper
  - `formulas/formula_registry.py` — Auto-load 80 plugin
  - `formulas/base_formula.py` — Interface cho plugin
  - `formulas/actro_formula.py` — Plugin mẫu (1/80)
  - `formulas/worker_identity.py` — `hash_cccd()` + worker/assignment CRUD
  - `migrations/v4_schema.py` — Schema V4 (SQLite)
  - `migrations/v4_sync.py` — Sync SQLite → Neon

---

## 12. PHẠM VI KHÔNG LÀM (Out of Scope)

| Không làm | Lý do |
|-----------|-------|
| Real-time sync (mỗi lần commit) | Quá phức tạp, không cần cho MVP |
| Web-based reconciliation UI | Phase A/B chạy local app là đủ |
| Auto-fix luôn (không cần kế toán review) | Rủi ro cao — luôn có in-the-loop cuối |
| Self-learning model (train trên data cty) | Dùng DeepSeek API tổng quát, không train local |
| Thay thế hoàn toàn kế toán | Mục tiêu là hỗ trợ, không phải thay thế |

---

**Trạng thái:** Cần sếp trả lời 10 câu hỏi R1-R10
**Ngày cập nhật:** 2026-08-19
**Phiên bản:** 1.0 — Initial
