import pathlib

content = """# Kế hoạch Refactor & Báo cáo Audit (Deep Scan)

## 🔴 Tình trạng khẩn cấp (High Priority)
- **Monolithic Architecture & God Objects**: File `core_pipeline.py` (gần 90KB) và `app.py` (hơn 100KB) đang ôm đồm quá nhiều trách nhiệm. `core_pipeline.py` trộn lẫn logic xử lý chuỗi (`_strip_accents`), quản lý thư mục (`setup_directories`), Connection Pool Database (`get_engine`, `dispose_all`), và logic nghiệp vụ ETL/Tính lương (`_assert_schema_ready`). 
- **Quản lý State và Concurrency lỏng lẻo**: Biến toàn cục `_ENGINE_CACHE` và `_ENGINE_LOCK` được sử dụng để tự quản lý pool kết nối SQLAlchemy thay vì sử dụng cơ chế pool chuẩn. Việc locking thủ công dễ dẫn đến deadlock trong môi trường đa luồng (multi-threading) của ETL.
- **Blind spots trong Migration & Schema**: Logic fallback báo lỗi thủ công nếu `_ledger_assert_schema_ready` thất bại thay vì ném exception chuẩn. Việc "nuốt" lỗi (swallow exceptions) và in ra log `print` có thể khiến UI không phản hồi đúng trạng thái DB.

## 🟡 Nợ kỹ thuật (Medium Priority - Tech Debt)
- **Hardcode giá trị & Tên cột**: Trong `adjustments_template.py`, các danh sách khoản thu/chi (như `Thưởng chuyên cần`, `Phạt chuyên cần`) và cấu hình màu sắc Excel (Color hex) bị hardcode trực tiếp vào file thay vì đưa vào file cấu hình (config/JSON).
- **Spaghetti Code & DRY Violations**: Nhiều hàm tiện ích được viết lặp lại rải rác. Điển hình, logic bóc tách đệ quy không giới hạn độ sâu (ví dụ trong các file compare) có nguy cơ gây RecursionError trên dữ liệu lỗi.
- **Thiếu Type Hinting và Schema Validation**: Rất nhiều arguments trong các hàm xử lý dữ liệu (ví dụ `safe_float(val)`) không có Type Hints (như `val: Any`), khiến các công cụ phân tích tĩnh (mypy/pyright) bị "mù".

## 🟢 Cải thiện hệ thống (Low Priority)
- **Chuẩn hóa Naming Convention**: Đồng bộ cách đặt tên hàm (hiện tại `_assert_schema_ready` dùng `snake_case` nhưng một số file lại trộn lẫn conventions).
- **Tách biệt Data Access Layer (DAL)**: Di chuyển toàn bộ code liên quan đến SQLAlchemy (engine, connection, migration) ra thư mục `db/` hoặc `infrastructure/`.
- **Cải thiện Docstrings**: Sử dụng chuẩn Sphinx hoặc Google Docstrings cho toàn bộ các hàm public để các công cụ auto-gen docs và AI sau này dễ dàng đọc hiểu.

## 📋 Kế hoạch hành động chi tiết (Step-by-Step Action Plan)
- **Giai đoạn 1 (Phase 1): Phá vỡ Monolith & Tách DAL**
  - Tách `get_engine`, `dispose_all` và các logic về SQLAlchemy từ `core_pipeline.py` sang một file mới `infrastructure/database.py`.
  - Tách các hàm tiện ích (`_strip_accents`, `setup_directories`, `safe_float`) sang file `utils/helpers.py`.
- **Giai đoạn 2 (Phase 2): Tái cấu trúc ETL & Cấu hình**
  - Chuyển toàn bộ các giá trị hardcode trong `adjustments_template.py` (như danh sách `DEFAULT_ADJUSTMENT_PAIRS`) vào file `config.json` hoặc biến môi trường.
  - Cấu trúc lại luồng tạo Excel Template bằng class (ví dụ `ExcelTemplateBuilder`) thay vì hàm imperative quá dài.
- **Giai đoạn 3 (Phase 3): Type Hinting & Error Handling**
  - Bổ sung Type Hints (của thư viện `typing`) 100% cho các hàm xử lý logic (ví dụ `safe_float(val: Any) -> float`).
  - Thay thế các đoạn `print()` bắt lỗi thành cơ chế logging chuẩn `logging.getLogger(__name__)` để theo dõi lỗi dễ dàng hơn trên môi trường production.
"""

pathlib.Path(r"C:\CodeApp\Salary-app\refactoring_plan.md").write_text(content, encoding='utf-8')
