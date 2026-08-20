import unicodedata
import sys
import os
import threading
from datetime import datetime
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout,
                               QHBoxLayout, QPushButton, QLabel, QLineEdit,
                               QFileDialog, QTextEdit, QMessageBox, QGroupBox,
                               QTableWidget, QTableWidgetItem, QHeaderView, QComboBox, QProgressBar,
                               QMenu, QDialog, QDialogButtonBox, QSpinBox, QDoubleSpinBox, QGridLayout, QTabWidget, QFormLayout, QCheckBox, QInputDialog)
from PySide6.QtCore import Qt, Signal, QObject, QThread
from PySide6.QtGui import QColor, QIcon, QPixmap, QCursor
from dotenv import load_dotenv

import unicodedata
import sys
def _strip_accents(s: str) -> str:
    """Bỏ dấu tiếng Việt: 'Nhà máy Actro' → 'Nha may Actro'"""
    return ''.join(
        c for c in unicodedata.normalize('NFD', s)
        if unicodedata.category(c) != 'Mn'
    )


if getattr(sys, 'frozen', False):
    application_path = os.path.dirname(sys.executable)
else:
    application_path = os.path.dirname(os.path.abspath(__file__))

env_path = os.path.join(application_path, '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(application_path, '..', '.env')

load_dotenv(dotenv_path=env_path)

from core_pipeline import preview_file, push_to_db, clear_db_period, fetch_employee_timesheet, update_employee_timesheet, export_employee_history, export_project_payroll, list_visible_sheets
from governance import append_governance_event, make_governance_event, validate_publish_records
from formulas.formula_registry import FormulaRegistry

class SheetSelectorDialog(QDialog):
    """
    Dialog cho phép user chọn 1 sheet để parse khi file Excel có nhiều sheet visible.
    Chỉ liệt kê sheet visible; nếu có sheet ẩn sẽ hiện label nhắc nhở.
    """
    def __init__(self, visible_sheets: list, hidden_count: int = 0, parent=None):
        super().__init__(parent)
        self.visible_sheets = visible_sheets
        self.hidden_count = hidden_count
        self.selected_sheet = None
        self.setWindowTitle("Chọn sheet chấm công")
        self.setMinimumWidth(420)
        self.setup_ui()

    def setup_ui(self):
        layout = QVBoxLayout(self)

        info = QLabel(
            f"<b>File Excel có {len(self.visible_sheets)} sheet hiển thị.</b><br>"
            "Chọn 1 sheet chứa dữ liệu chấm công cần parse:"
        )
        info.setWordWrap(True)
        info.setStyleSheet("color: #2b579a; padding: 8px; background-color: #f0f8ff; border-radius: 5px;")
        layout.addWidget(info)

        self.cbo_sheet = QComboBox()
        for name in self.visible_sheets:
            self.cbo_sheet.addItem(name)
        if self.visible_sheets:
            self.cbo_sheet.setCurrentIndex(0)
        layout.addWidget(self.cbo_sheet)

        if self.hidden_count > 0:
            warn = QLabel(
                f"Lưu ý: file có {self.hidden_count} sheet ẩn không hiển thị trong danh sách này. "
                f"Liên hệ quản lý nhà máy nếu cần truy cập sheet ẩn."
            )
            warn.setWordWrap(True)
            warn.setStyleSheet("color: #8a6d3b; padding: 8px; background-color: #fcf8e3; border-radius: 5px; font-style: italic;")
            warn.setAlignment(Qt.AlignTop)
            layout.addWidget(warn)

        btn_box = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        btn_box.button(QDialogButtonBox.Ok).setText("Parse sheet này")
        btn_box.accepted.connect(self.accept)
        btn_box.rejected.connect(self.reject)
        layout.addWidget(btn_box)

    def accept(self):
        self.selected_sheet = self.cbo_sheet.currentText()
        super().accept()

    def get_selected_sheet(self):
        return self.selected_sheet

class WorkerSignals(QObject):
    log_signal = Signal(str)
    done_signal = Signal(object)
    push_done_signal = Signal(bool)
    clear_done_signal = Signal(bool)
    review_mapping_signal = Signal(list, dict, object, dict)

class ParseWorker(QThread):
    def __init__(self, file_path, project_name, period_month, period_year, signals, holiday_config=None, sheet_name=None):
        super().__init__()
        self.file_path = file_path
        self.project_name = project_name
        self.period_month = period_month
        self.period_year = period_year
        self.signals = signals
        self.holiday_config = holiday_config
        self.sheet_name = sheet_name

    def run(self):
        def logger(msg):
            self.signals.log_signal.emit(msg)

        def review_callback(unknown_headers, ai_mapping):
            event = threading.Event()
            result_container = {}
            self.signals.review_mapping_signal.emit(unknown_headers, ai_mapping, event, result_container)
            event.wait()
            return result_container.get('mapping', ai_mapping)

        data = preview_file(self.file_path, self.project_name, self.period_month, self.period_year,
                          log_callback=logger, review_callback=review_callback,
                          holiday_config=self.holiday_config, sheet_name=self.sheet_name)
        self.signals.done_signal.emit(data)

from agent_mapper import STANDARD_COLUMNS

class AddHolidayDialog(QDialog):
    """
    Dialog cho phép thêm ngày lễ với dropdown chọn ngày.
    """
    def __init__(self, year: int, month: int, existing_dates: list = None, parent=None):
        super().__init__(parent)
        self.year = year
        self.month = month
        self.existing_dates = existing_dates or []
        self.result_date = None
        self.setWindowTitle(f"Thêm Ngày Lễ - {month}/{year}")
        self.setMinimumWidth(500)
        self.setup_ui()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        
        # Header
        lbl = QLabel(f"<b>Thêm ngày lễ cho Tháng {self.month}/{self.year}</b>")
        layout.addWidget(lbl)
        
        # Day selection
        form = QFormLayout()
        
        self.cbo_day = QComboBox()
        # Get days in month
        import calendar
        days_in_month = calendar.monthrange(self.year, self.month)[1]
        for d in range(1, days_in_month + 1):
            weekday_names = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"]
            import datetime
            wd = weekday_names[datetime.date(self.year, self.month, d).weekday()]
            self.cbo_day.addItem(f"{d} ({wd})", d)
        form.addRow("Ngày:", self.cbo_day)
        
        self.txt_name = QLineEdit()
        self.txt_name.setPlaceholderText("VD: Tết Nguyên đán, Giỗ Tổ Hùng Vương...")
        form.addRow("Tên ngày lễ:", self.txt_name)
        
        self.cbo_mult = QComboBox()
        self.cbo_mult.addItems(["100%", "150%", "200%", "250%", "300% (Lễ)", "350%", "400%"])
        self.cbo_mult.setCurrentIndex(4)  # Default 300%
        form.addRow("Tỷ lệ OT:", self.cbo_mult)
        
        layout.addLayout(form)
        
        # Preview
        self.lbl_preview = QLabel()
        self.lbl_preview.setStyleSheet("color: #666; font-style: italic;")
        layout.addWidget(self.lbl_preview)
        self.cbo_day.currentIndexChanged.connect(self.update_preview)
        self.update_preview()
        
        # Buttons
        btn_box = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        btn_box.accepted.connect(self.accept)
        btn_box.rejected.connect(self.reject)
        layout.addWidget(btn_box)
    
    def update_preview(self):
        day = self.cbo_day.currentData()
        if day:
            import datetime
            wd_names = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"]
            wd = wd_names[datetime.date(self.year, self.month, day).weekday()]
            date_str = f"{self.year}-{self.month:02d}-{day:02d}"
            
            mult_text = self.cbo_mult.currentText()
            self.lbl_preview.setText(f"Preview: {wd} {day}/{self.month}/{self.year} - Tỷ lệ: {mult_text}")
    
    def accept(self):
        day = self.cbo_day.currentData()
        name = self.txt_name.text().strip() or f"Ngày lễ {day}/{self.month}"
        mult_text = self.cbo_mult.currentText()
        mult = float(mult_text.replace("%", "").split("(")[0].strip()) / 100.0
        
        date_str = f"{self.year}-{self.month:02d}-{day:02d}"
        
        # Check if already exists
        if date_str in self.existing_dates:
            QMessageBox.warning(self, "Lỗi", f"Ngày {date_str} đã có trong danh sách!")
            return
        
        self.result_date = {
            "date": date_str,
            "name": name,
            "multiplier": mult
        }
        super().accept()
    
    def get_result(self):
        return self.result_date


class HolidayConfigDialog(QDialog):
    """
    Dialog cho phép kế toán cấu hình ngày lễ và tỷ lệ OT tương ứng.
    """
    def __init__(self, year: int, month: int, existing_holidays: list = None, parent=None):
        super().__init__(parent)
        self.year = year
        self.month = month
        self.holidays = existing_holidays or []  # List of {"date": "YYYY-MM-DD", "multiplier": 3.0, "name": "Tết Dương lịch"}
        self.setWindowTitle(f"Cấu Hình Ngày Lễ - Tháng {month}/{year}")
        self.setMinimumSize(700, 500)
        
        self.setup_ui()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        
        # Header
        info = QLabel(
            f"<b>Cấu hình ngày lễ cho kỳ lương Tháng {self.month}/{self.year}</b><br>"
            "<i>Ngày lễ mặc định được tải từ lịch Việt Nam. Bạn có thể thêm/bớt/sửa ngày lễ.</i>"
        )
        info.setStyleSheet("color: #2b579a; padding: 10px; background-color: #f0f8ff; border-radius: 5px;")
        info.setWordWrap(True)
        layout.addWidget(info)
        
        # Bảng ngày lễ
        self.table = QTableWidget()
        self.table.setColumnCount(4)
        self.table.setHorizontalHeaderLabels(["Ngày", "Tên ngày lễ", "Tỷ lệ OT (%)", "Xóa"])
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Fixed)
        self.table.horizontalHeader().setSectionResizeMode(1, QHeaderView.Stretch)
        self.table.horizontalHeader().setSectionResizeMode(2, QHeaderView.Fixed)
        self.table.horizontalHeader().setSectionResizeMode(3, QHeaderView.Fixed)
        self.table.setColumnWidth(0, 120)
        self.table.setColumnWidth(2, 100)
        self.table.setColumnWidth(3, 60)
        layout.addWidget(self.table)
        
        # Nút thêm ngày lễ
        btn_layout = QHBoxLayout()
        
        self.btn_add = QPushButton("+ Thêm ngày lễ")
        self.btn_add.setStyleSheet("background-color: #28a745; color: white; padding: 8px;")
        self.btn_add.clicked.connect(self.add_holiday)
        btn_layout.addWidget(self.btn_add)
        
        self.btn_add_common = QPushButton("+ Thêm ngày lễ phổ biến")
        self.btn_add_common.setStyleSheet("background-color: #17a2b8; color: white; padding: 8px;")
        self.btn_add_common.clicked.connect(self.show_common_holidays)
        btn_layout.addWidget(self.btn_add_common)
        
        btn_layout.addStretch()
        layout.addLayout(btn_layout)
        
        # Policy: Nghỉ lễ có ảnh hưởng chuyên cần?
        policy_group = QGroupBox("Chính sách ngày lễ")
        policy_layout = QVBoxLayout()
        
        self.chk_holiday_affects_chuyencan = QCheckBox(
            "Nghỉ ngày lễ không ảnh hưởng đến thưởng chuyên cần"
        )
        self.chk_holiday_affects_chuyencan.setChecked(True)
        policy_layout.addWidget(self.chk_holiday_affects_chuyencan)
        
        self.chk_holiday_counts_working = QCheckBox(
            "Đi làm ngày lễ được tính công và hưởng OT lễ"
        )
        self.chk_holiday_counts_working.setChecked(True)
        policy_layout.addWidget(self.chk_holiday_counts_working)
        
        policy_group.setLayout(policy_layout)
        layout.addWidget(policy_group)
        
        # Buttons
        btn_box = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        btn_box.accepted.connect(self.accept)
        btn_box.rejected.connect(self.reject)
        layout.addWidget(btn_box)
        
        # Load existing holidays
        self.refresh_table()
    
    def refresh_table(self):
        self.table.setRowCount(len(self.holidays))
        for i, h in enumerate(self.holidays):
            # Date
            date_item = QTableWidgetItem(h.get("date", ""))
            date_item.setFlags(date_item.flags() & ~Qt.ItemIsEditable)
            self.table.setItem(i, 0, date_item)
            
            # Name
            name_item = QTableWidgetItem(h.get("name", ""))
            self.table.setItem(i, 1, name_item)
            
            # Multiplier
            mult = h.get("multiplier", 3.0)
            mult_item = QTableWidgetItem(str(int(mult * 100)))
            self.table.setItem(i, 2, mult_item)
            
            # Delete button
            btn_del = QPushButton("Xóa")
            btn_del.setStyleSheet("background-color: #dc3545; color: white; padding: 2px;")
            btn_del.clicked.connect(lambda _, row=i: self.delete_holiday(row))
            self.table.setCellWidget(i, 3, btn_del)
    
    def add_holiday(self):
        existing_dates = [h["date"] for h in self.holidays]
        dlg = AddHolidayDialog(self.year, self.month, existing_dates, self)
        if dlg.exec():
            result = dlg.get_result()
            if result:
                self.holidays.append(result)
                self.refresh_table()
    
    def delete_holiday(self, row):
        if 0 <= row < len(self.holidays):
            self.holidays.pop(row)
            self.refresh_table()
    
    def show_common_holidays(self):
        """Hiển thị dialog chọn các ngày lễ phổ biến"""
        from formulas.actro_config import VIETNAM_OFFICIAL_HOLIDAYS
        import datetime
        
        # Filter holidays for current month
        month_prefix = f"{self.year:04d}-{self.month:02d}-"
        available = [h for h in VIETNAM_OFFICIAL_HOLIDAYS if h.startswith(month_prefix)]
        
        if not available:
            QMessageBox.information(self, "Thông báo", f"Không có ngày lễ chính thức nào trong tháng {self.month}/{self.year}")
            return
        
        # Build selection dialog
        dlg = QDialog(self)
        dlg.setWindowTitle("Chọn ngày lễ phổ biến")
        layout = QVBoxLayout(dlg)
        
        lbl = QLabel("Chọn các ngày lễ muốn thêm:")
        layout.addWidget(lbl)
        
        checkboxes = []
        existing_dates = [h["date"] for h in self.holidays]
        
        for h in available:
            if h in existing_dates:
                continue  # Skip already added
            parts = h.split("-")
            d = datetime.date(int(parts[0]), int(parts[1]), int(parts[2]))
            weekday_names = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"]
            weekday = weekday_names[d.weekday()]
            
            chk = QCheckBox(f"{weekday} {d.day}/{d.month} ({h})")
            chk.setChecked(True)
            layout.addWidget(chk)
            checkboxes.append((h, chk))
        
        if not checkboxes:
            QMessageBox.information(self, "Thông báo", "Tất cả ngày lễ đã được thêm vào!")
            return
        
        btn_box = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        btn_box.accepted.connect(dlg.accept)
        btn_box.rejected.connect(dlg.reject)
        layout.addWidget(btn_box)
        
        if dlg.exec():
            for date_str, chk in checkboxes:
                if chk.isChecked():
                    parts = date_str.split("-")
                    d = datetime.date(int(parts[0]), int(parts[1]), int(parts[2]))
                    self.holidays.append({
                        "date": date_str,
                        "name": f"Ngày lễ {d.day}/{d.month}",
                        "multiplier": 3.0
                    })
            self.refresh_table()
    
    def accept(self):
        # Save changes
        for i in range(self.table.rowCount()):
            date_str = self.table.item(i, 0).text()
            name_str = self.table.item(i, 1).text()
            mult_str = self.table.item(i, 2).text()
            
            try:
                mult = float(mult_str) / 100.0
            except:
                mult = 3.0
            
            # Update in list
            for h in self.holidays:
                if h["date"] == date_str:
                    h["name"] = name_str
                    h["multiplier"] = mult
                    break
        
        super().accept()
    
    def get_config(self) -> dict:
        """Trả về cấu hình ngày lễ"""
        return {
            "holidays": self.holidays,
            "holiday_affects_chuyencan": self.chk_holiday_affects_chuyencan.isChecked(),
            "holiday_counts_working": self.chk_holiday_counts_working.isChecked(),
        }


class ReviewMappingDialog(QDialog):
    def __init__(self, unknown_headers, ai_mapping, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Xác nhận Map Cột (AI Đề xuất)")
        self.setMinimumWidth(600)
        self.setMinimumHeight(400)
        self.unknown_headers = unknown_headers
        self.ai_mapping = ai_mapping
        self.final_mapping = {}
        self.review_event = None

        layout = QVBoxLayout(self)

        info = QLabel("AI hoặc từ điển đã đề xuất mapping. Vui lòng kiểm tra, điều chỉnh và xác nhận trước khi hệ thống sử dụng mapping này.")
        info.setStyleSheet("font-weight: bold; color: #2b579a;")
        info.setWordWrap(True)
        layout.addWidget(info)
        
        self.table = QTableWidget()
        self.table.setColumnCount(2)
        self.table.setHorizontalHeaderLabels(["Cột trên Excel (Tiếng Việt)", "Map vào Hệ thống (Chuẩn)"])
        self.table.setRowCount(len(unknown_headers))
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        
        self.combos = []
        for i, header in enumerate(unknown_headers):
            self.table.setItem(i, 0, QTableWidgetItem(header))
            
            cbo = QComboBox()
            cbo.addItem("--- Bỏ qua (Không map) ---", "null")
            for col in STANDARD_COLUMNS:
                cbo.addItem(col, col)
                
            suggested = ai_mapping.get(header)
            if suggested and suggested in STANDARD_COLUMNS:
                cbo.setCurrentText(suggested)
            else:
                cbo.setCurrentIndex(0)
                
            self.table.setCellWidget(i, 1, cbo)
            self.combos.append((header, cbo))
            
        layout.addWidget(self.table)

        review_form = QFormLayout()
        self.txt_actor = QLineEdit(os.environ.get("USERNAME", ""))
        self.txt_actor.setPlaceholderText("Người xác nhận mapping")
        self.txt_reason = QLineEdit("Đã kiểm tra mapping cột")
        self.txt_reason.setPlaceholderText("Lý do/xác nhận")
        review_form.addRow("Người xác nhận:", self.txt_actor)
        review_form.addRow("Lý do:", self.txt_reason)
        layout.addLayout(review_form)
        
        btn_box = QDialogButtonBox(QDialogButtonBox.Ok)
        btn_box.button(QDialogButtonBox.Ok).setText("Xác nhận & Tiếp tục")
        btn_box.accepted.connect(self.accept)
        layout.addWidget(btn_box)
        
    def accept(self):
        try:
            self.review_event = make_governance_event(
                action="mapping_review",
                actor=self.txt_actor.text(),
                reason=self.txt_reason.text(),
            )
        except ValueError as error:
            QMessageBox.warning(self, "Thiếu xác nhận", str(error))
            return

        for header, cbo in self.combos:
            val = cbo.currentData()
            self.final_mapping[header] = None if val == "null" else val
        super().accept()

class PushWorker(QThread):
    def __init__(self, data_list, db_url, signals):
        super().__init__()
        self.data_list = data_list
        self.db_url = db_url
        self.signals = signals

    def run(self):
        def logger(msg):
            self.signals.log_signal.emit(msg)
            
        success = push_to_db(self.data_list, self.db_url, logger)
        self.signals.push_done_signal.emit(success)

class ClearDbWorker(QThread):
    def __init__(self, project, month, year, db_url, signals):
        super().__init__()
        self.project = project
        self.month = month
        self.year = year
        self.db_url = db_url
        self.signals = signals

    def run(self):
        def logger(msg):
            self.signals.log_signal.emit(msg)
            
        success = clear_db_period(self.project, self.month, self.year, self.db_url, logger)
        self.signals.clear_done_signal.emit(success)

class EditTimesheetDialog(QDialog):
    def __init__(self, emp_data, parent=None):
        super().__init__(parent)
        self.emp_data = emp_data
        self.setWindowTitle(f"Điều chỉnh Bảng công: {emp_data['fullName']} ({emp_data['employeeCode']})")
        self.setMinimumSize(600, 500)
        
        layout = QVBoxLayout(self)
        
        self.table = QTableWidget(len(emp_data["dailyData"]), 5)
        self.table.setHorizontalHeaderLabels(["Ngày", "Trạng thái", "Giờ vào", "Giờ ra", "Tăng ca (OT)"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        
        for i, day in enumerate(emp_data["dailyData"]):
            # Ngày
            item_date = QTableWidgetItem(day["date"])
            item_date.setFlags(Qt.ItemIsEnabled)
            self.table.setItem(i, 0, item_date)
            
            # Trạng thái
            cbo_status = QComboBox()
            cbo_status.addItems(["WORKING", "ABSENT", "OVERTIME", "LATE"])
            cbo_status.setCurrentText(day["status"])
            self.table.setCellWidget(i, 1, cbo_status)
            
            # In
            txt_in = QLineEdit(day.get("in", ""))
            self.table.setCellWidget(i, 2, txt_in)
            
            # Out
            txt_out = QLineEdit(day.get("out", ""))
            self.table.setCellWidget(i, 3, txt_out)
            
            # OT
            spin_ot = QDoubleSpinBox()
            spin_ot.setRange(0, 24)
            spin_ot.setSingleStep(0.5)
            spin_ot.setValue(day.get("ot", 0))
            self.table.setCellWidget(i, 4, spin_ot)
            
        layout.addWidget(self.table)
        
        btn_box = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        btn_box.accepted.connect(self.accept)
        btn_box.rejected.connect(self.reject)
        layout.addWidget(btn_box)
        
    def get_updated_daily_data(self):
        new_data = []
        for i in range(self.table.rowCount()):
            date_val = self.table.item(i, 0).text()
            status = self.table.cellWidget(i, 1).currentText()
            in_val = self.table.cellWidget(i, 2).text()
            out_val = self.table.cellWidget(i, 3).text()
            ot_val = self.table.cellWidget(i, 4).value()
            new_data.append({
                "date": date_val,
                "status": status,
                "in": in_val,
                "out": out_val,
                "ot": ot_val
            })
        return new_data

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("HrP ETL Desktop - Bóc tách Bảng Lương AI")
        self.setMinimumSize(950, 750)

        # Cài đặt Window Icon
        try:
            base_dir = sys._MEIPASS
        except Exception:
            base_dir = os.path.dirname(os.path.abspath(__file__))
        
        icon_path = os.path.join(base_dir, "favicon.ico")
        if os.path.exists(icon_path):
            self.setWindowIcon(QIcon(icon_path))

        self.selected_file = None
        self.parsed_data = None
        self.db_url = os.environ.get("APPBCC_DATABASE_URL", os.environ.get("DATABASE_URL", "postgresql://..."))  # Phase 2 DEC-09 A: ETL dùng credential riêng; fallback cho dev
        self.check_cols_map = {}
        self.pending_mapping_review_event = None

        self.signals = WorkerSignals()
        self.signals.log_signal.connect(self.append_log)
        self.signals.done_signal.connect(self.on_parse_done)
        self.signals.push_done_signal.connect(self.on_push_done)
        self.signals.clear_done_signal.connect(self.on_clear_done)
        self.signals.review_mapping_signal.connect(self.on_review_mapping_requested)

        # Holiday config cache
        self.holiday_config = None  # Lưu cấu hình ngày lễ

        self.setup_ui()

    def setup_ui(self):
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        main_layout = QVBoxLayout()
        main_widget.setLayout(main_layout)
        
        self.tabs = QTabWidget()
        main_layout.addWidget(self.tabs)
        
        # TAB 1: Nạp hàng loạt
        self.tab_batch = QWidget()
        self.setup_tab_batch()
        self.tabs.addTab(self.tab_batch, "Nạp Excel Hàng Loạt")
        
        # TAB 2: Đối soát
        self.tab_recon = QWidget()
        self.setup_tab_recon()
        self.tabs.addTab(self.tab_recon, "Đối Soát Cá Nhân")
        
        # TAB 3: Trích Xuất & Sao Lưu
        self.tab_export = QWidget()
        self.setup_tab_export()
        self.tabs.addTab(self.tab_export, "Trích Xuất & Sao Lưu")
        
        # TAB 4: Cài Đặt Hệ Thống
        self.tab_settings = QWidget()
        self.setup_tab_settings()
        self.tabs.addTab(self.tab_settings, "Cài Đặt Hệ Thống")
        
        # Cập nhật ngày lễ ban đầu
        self.update_holidays_label()
    
    def on_project_changed(self):
        """Cập nhật holidays label khi đổi dự án"""
        self.update_holidays_label()
    
    def on_period_changed(self):
        """Cập nhật holidays label khi đổi tháng/năm"""
        self.update_holidays_label()
    
    def open_holiday_config(self):
        """Mở dialog cấu hình ngày lễ"""
        try:
            period_month = self.cbo_month.currentIndex() + 1
            period_year = int(self.txt_year.text().strip())
        except:
            QMessageBox.warning(self, "Lỗi", "Năm không hợp lệ!")
            return
        
        project = self.cbo_project.currentText()
        if not project or project == "Chưa cài đặt Plugin nào!":
            QMessageBox.warning(self, "Lỗi", "Vui lòng chọn Dự án trước!")
            return
        
        # Load existing holidays
        from formulas.actro_config import get_holidays_for_period, VIETNAM_OFFICIAL_HOLIDAYS
        
        # Get existing holidays from config
        existing = self.holiday_config.get("holidays", []) if self.holiday_config else []
        
        # If no existing, load default holidays for this period
        if not existing and project == "Nhà máy Actro - Vĩnh Phúc":
            default_holidays = get_holidays_for_period(period_year, period_month)
            existing = [{"date": h, "name": f"Ngày lễ {h}", "multiplier": 3.0} for h in default_holidays]
        
        dlg = HolidayConfigDialog(period_year, period_month, existing, self)
        if dlg.exec():
            self.holiday_config = dlg.get_config()
            self.update_holidays_label()
            self.append_log(f"[CẤU HÌNH] Đã cập nhật ngày lễ. {len(self.holiday_config.get('holidays', []))} ngày lễ được áp dụng.")
    
    def update_holidays_label(self):
        """Cập nhật hiển thị ngày lễ trong kỳ"""
        project = self.cbo_project.currentText()
        if not project or project == "Chưa cài đặt Plugin nào!":
            self.lbl_holidays.setText("...")
            return
        
        try:
            period_month = self.cbo_month.currentIndex() + 1
            period_year = int(self.txt_year.text().strip())
        except:
            self.lbl_holidays.setText("Năm không hợp lệ")
            return
        
        # Import và lấy holidays
        from formulas.actro_config import get_holidays_for_period, VIETNAM_OFFICIAL_HOLIDAYS
        
        if project == "Nhà máy Actro - Vĩnh Phúc":
            # Ưu tiên dùng holiday_config nếu có
            if self.holiday_config and self.holiday_config.get("holidays"):
                holidays = self.holiday_config["holidays"]
                holiday_strs = []
                for h in holidays:
                    date_str = h.get("date", "")
                    mult = h.get("multiplier", 3.0)
                    parts = date_str.split("-")
                    import datetime
                    d = datetime.date(int(parts[0]), int(parts[1]), int(parts[2]))
                    weekday_names = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"]
                    weekday = weekday_names[d.weekday()]
                    holiday_strs.append(f"{weekday} {d.day}/{d.month} ({int(mult*100)}%)")
                self.lbl_holidays.setText(", ".join(holiday_strs) if holiday_strs else "Không có")
                self.lbl_holidays.setStyleSheet("color: #d63384; font-weight: bold;")
            else:
                # Fallback: dùng holidays mặc định
                holidays = get_holidays_for_period(period_year, period_month)
                if holidays:
                    import datetime
                    holiday_strs = []
                    for h in holidays:
                        parts = h.split("-")
                        d = datetime.date(int(parts[0]), int(parts[1]), int(parts[2]))
                        weekday_names = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"]
                        weekday = weekday_names[d.weekday()]
                        holiday_strs.append(f"{weekday} {d.day}/{d.month}")
                    self.lbl_holidays.setText(", ".join(holiday_strs))
                    self.lbl_holidays.setStyleSheet("color: #6c757d;")
                else:
                    self.lbl_holidays.setText("Không có ngày lễ trong kỳ này")
                    self.lbl_holidays.setStyleSheet("color: #6c757d;")
        else:
            self.lbl_holidays.setText("Dự án khác (sử dụng config riêng)")
            self.lbl_holidays.setStyleSheet("color: #666; font-style: italic;")

    def setup_tab_batch(self):
        layout = QVBoxLayout()
        self.tab_batch.setLayout(layout)
        
        # Header Logo & Title
        header_layout = QHBoxLayout()
        base_dir = os.path.dirname(os.path.abspath(__file__))
        logo_path = os.path.join(base_dir, "logo.png")
        if os.path.exists(logo_path):
            logo_label = QLabel()
            pixmap = QPixmap(logo_path).scaledToHeight(50, Qt.SmoothTransformation)
            logo_label.setPixmap(pixmap)
            header_layout.addWidget(logo_label)
            
        title_label = QLabel("HỆ THỐNG XỬ LÝ BẢNG LƯƠNG TỰ ĐỘNG BẰNG AI")
        title_label.setStyleSheet("font-size: 20px; font-weight: bold; color: #2b579a; margin-left: 10px;")
        header_layout.addWidget(title_label)
        header_layout.addStretch()
        layout.addLayout(header_layout)

        # Cấu hình & Đầu vào
        config_group = QGroupBox("Cấu hình & Đầu vào")
        config_layout = QVBoxLayout()
        config_group.setLayout(config_layout)

        # Hàng 1: Dự án + Kỳ lương
        row1 = QHBoxLayout()
        
        row1.addWidget(QLabel("Dự án / Công thức tính lương:"))
        self.cbo_project = QComboBox()
        projects = FormulaRegistry.get_all_projects()
        if not projects:
            self.cbo_project.addItem("Chưa cài đặt Plugin nào!")
        else:
            self.cbo_project.addItems(projects)
        self.cbo_project.currentIndexChanged.connect(self.on_project_changed)
        row1.addWidget(self.cbo_project)
        
        row1.addSpacing(20) # Khoảng cách giữa 2 phần
        
        row1.addWidget(QLabel("Kỳ lương tính toán:"))
        self.cbo_month = QComboBox()
        self.cbo_month.addItems([f"Tháng {i}" for i in range(1, 13)])
        
        current_date = datetime.now()
        self.cbo_month.setCurrentIndex(current_date.month - 1)
        self.cbo_month.currentIndexChanged.connect(self.on_period_changed)
        row1.addWidget(self.cbo_month)
        
        row1.addWidget(QLabel("Năm:"))
        self.txt_year = QLineEdit()
        self.txt_year.setText(str(current_date.year))
        self.txt_year.setFixedWidth(80)
        self.txt_year.textChanged.connect(self.on_period_changed)
        row1.addWidget(self.txt_year)
        
        row1.addStretch()
        config_layout.addLayout(row1)

        # Hàng 2: File
        row2 = QHBoxLayout()
        row2.addWidget(QLabel("File Excel Bảng Lương:"))
        self.txt_file = QLineEdit()
        self.txt_file.setReadOnly(True)
        self.btn_browse = QPushButton("Chọn File")
        self.btn_browse.setCursor(QCursor(Qt.PointingHandCursor))
        self.btn_browse.clicked.connect(self.browse_file)
        row2.addWidget(self.txt_file)
        row2.addWidget(self.btn_browse)
        config_layout.addLayout(row2)
        
        # Hàng 3: Ngày lễ trong kỳ (hiển thị + nút cấu hình)
        row3 = QHBoxLayout()
        row3.addWidget(QLabel("Ngày lễ trong kỳ:"))
        self.lbl_holidays = QLabel("...")
        self.lbl_holidays.setStyleSheet("color: #666; font-style: italic;")
        row3.addWidget(self.lbl_holidays)
        row3.addStretch()
        
        self.btn_config_holidays = QPushButton("Cấu hình ngày lễ...")
        self.btn_config_holidays.setStyleSheet("background-color: #d63384; color: white; padding: 5px 10px;")
        self.btn_config_holidays.clicked.connect(self.open_holiday_config)
        row3.addWidget(self.btn_config_holidays)
        
        config_layout.addLayout(row3)

        layout.addWidget(config_group)

        self.btn_parse = QPushButton("Bắt đầu bóc tách & Chuẩn hóa")
        self.btn_parse.setEnabled(False)
        self.btn_parse.clicked.connect(self.run_parse)
        self.btn_parse.setStyleSheet("background-color: #2b579a; color: white; font-weight: bold; padding: 8px;")
        config_layout.addWidget(self.btn_parse)

        config_group.setLayout(config_layout)
        layout.addWidget(config_group)
        
        # Double-check chuyên biệt hoá
        check_group = QGroupBox("Kiểm tra chéo nhanh (Định vị toạ độ Excel)")
        check_layout = QGridLayout()
        
        # Row 0
        check_layout.addWidget(QLabel("Nhân viên:"), 0, 0)
        self.cbo_emp_check = QComboBox()
        self.cbo_emp_check.setEnabled(False)
        check_layout.addWidget(self.cbo_emp_check, 0, 1)
        
        check_layout.addWidget(QLabel("Cột Excel (A, AA...):"), 0, 2)
        self.txt_col_check = QLineEdit()
        self.txt_col_check.setPlaceholderText("Ví dụ: Z, AA")
        self.txt_col_check.setEnabled(False)
        self.txt_col_check.setFixedWidth(100)
        check_layout.addWidget(self.txt_col_check, 0, 3)
        
        self.btn_run_check = QPushButton("Tra cứu nhanh")
        self.btn_run_check.setEnabled(False)
        self.btn_run_check.clicked.connect(self.run_double_check)
        check_layout.addWidget(self.btn_run_check, 0, 4)
        
        # Row 1
        check_layout.addWidget(QLabel("Toạ độ Excel:"), 1, 0)
        self.txt_excel_cell = QLineEdit()
        self.txt_excel_cell.setReadOnly(True)
        self.txt_excel_cell.setStyleSheet("background-color: #f0f0f0; font-weight: bold; color: blue; font-size: 14px;")
        check_layout.addWidget(self.txt_excel_cell, 1, 1)
        
        check_layout.addWidget(QLabel("Giá trị phần mềm lấy:"), 1, 2)
        self.txt_parsed_value = QLineEdit()
        self.txt_parsed_value.setReadOnly(True)
        self.txt_parsed_value.setStyleSheet("background-color: #f0f0f0; font-weight: bold; color: green; font-size: 14px;")
        check_layout.addWidget(self.txt_parsed_value, 1, 3, 1, 2)
        
        check_group.setLayout(check_layout)
        layout.addWidget(check_group)

        # Kết quả Preview
        preview_group = QGroupBox("Preview Dữ Liệu")
        preview_layout = QVBoxLayout()
        # Table Header
        self.table = QTableWidget()
        self.table.setColumnCount(7)
        self.table.setHorizontalHeaderLabels(["Chọn", "Mã NV", "Họ Tên", "Tổng Công", "Tổng OT", "Nghỉ", "Tổng Thu Nhập"])
        header = self.table.horizontalHeader()
        header.setSectionResizeMode(QHeaderView.Interactive)
        header.setStretchLastSection(True)
        
        self.table.setColumnWidth(0, 50)
        self.table.setColumnWidth(1, 120)
        self.table.setColumnWidth(2, 250)
        self.table.setColumnWidth(3, 90)
        self.table.setColumnWidth(4, 90)
        self.table.setColumnWidth(5, 70)
        self.table.setColumnWidth(6, 130)
        
        header.sectionClicked.connect(self.on_header_clicked)
        
        # Thêm context menu
        self.table.setContextMenuPolicy(Qt.CustomContextMenu)
        self.table.customContextMenuRequested.connect(self.show_context_menu)
        
        preview_layout.addWidget(self.table)
        
        # Nút Push và Làm mới
        btn_layout = QHBoxLayout()
        self.btn_push = QPushButton("Push lên Database (HrP)")
        self.btn_push.setEnabled(False)
        self.btn_push.clicked.connect(self.run_push)
        self.btn_push.setStyleSheet("background-color: #00763a; color: white; font-weight: bold; padding: 10px;")
        
        self.btn_reset = QPushButton("Làm mới (Reset)")
        self.btn_reset.clicked.connect(self.run_reset)
        self.btn_reset.setStyleSheet("background-color: #6c757d; color: white; font-weight: bold; padding: 10px;")
        
        self.btn_export_template = QPushButton("Xuất Excel Chuẩn Hoá")
        self.btn_export_template.setEnabled(False)
        self.btn_export_template.clicked.connect(self.run_export_template)
        self.btn_export_template.setStyleSheet("background-color: #198754; color: white; font-weight: bold; padding: 10px;")
        
        btn_layout.addWidget(self.btn_export_template)
        btn_layout.addWidget(self.btn_push)
        btn_layout.addWidget(self.btn_reset)
        
        preview_layout.addLayout(btn_layout)

        preview_group.setLayout(preview_layout)
        layout.addWidget(preview_group)

        # Log
        log_group = QGroupBox("Logs & Trạng thái")
        log_layout = QVBoxLayout()
        self.txt_log = QTextEdit()
        self.txt_log.setReadOnly(True)
        self.txt_log.setFixedHeight(100)
        self.txt_log.setStyleSheet("background-color: #1e1e1e; color: #00ff00; font-family: Consolas; font-size: 11px;")
        log_layout.addWidget(self.txt_log)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 0)
        self.progress_bar.setVisible(False)
        log_layout.addWidget(self.progress_bar)
        
        log_group.setLayout(log_layout)
        layout.addWidget(log_group)

    def browse_file(self):
        file_name, _ = QFileDialog.getOpenFileName(self, "Chọn File Bảng Công", "", "Excel Files (*.xlsx *.xls)")
        if file_name:
            self.selected_file = file_name
            self.txt_file.setText(file_name)
            self.btn_parse.setEnabled(True)

    def append_log(self, msg):
        self.txt_log.append(msg)
        scrollbar = self.txt_log.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())

    def run_parse(self):
        project_name = self.cbo_project.currentText()
        if not project_name or project_name == "Chưa cài đặt Plugin nào!":
            QMessageBox.warning(self, "Lỗi", "Vui lòng chọn Dự án / Công thức tính lương hợp lệ!")
            return
            
        try:
            period_month = self.cbo_month.currentIndex() + 1
            period_year = int(self.txt_year.text().strip())
        except:
            QMessageBox.warning(self, "Lỗi", "Năm không hợp lệ!")
            return
            
        self.btn_parse.setEnabled(False)
        self.btn_push.setEnabled(False)
        
        # Khoá check
        self.cbo_emp_check.setEnabled(False)
        self.txt_col_check.setEnabled(False)
        self.btn_run_check.setEnabled(False)
        self.txt_excel_cell.clear()
        self.txt_parsed_value.clear()
        
        self.txt_log.clear()
        self.append_log("--- BẮT ĐẦU PHÂN TÍCH ---")
        self.append_log(f"Kỳ lương: Tháng {period_month}/{period_year}")
        
        if hasattr(self, 'worker') and self.worker.isRunning():
            return

        # ===================================================================
        # Sheet selector: nếu file có > 1 sheet visible thì hỏi user chọn
        # ===================================================================
        chosen_sheet = None
        try:
            visible_sheets, hidden_count = list_visible_sheets(self.selected_file)
        except Exception as e:
            QMessageBox.critical(
                self, "Lỗi đọc file",
                f"Không đọc được danh sách sheet trong file:\n{e}"
            )
            return

        if len(visible_sheets) == 0:
            QMessageBox.warning(
                self, "File không hợp lệ",
                "File Excel không có sheet nào hiển thị được.\n"
                "Có thể tất cả sheet đang bị ẩn. Liên hệ quản lý nhà máy để kiểm tra lại file."
            )
            self.btn_parse.setEnabled(True)
            return
        elif len(visible_sheets) == 1:
            chosen_sheet = visible_sheets[0]
            self.append_log(f"File có 1 sheet visible → parse luôn sheet '{chosen_sheet}'")
        else:
            dlg = SheetSelectorDialog(visible_sheets, hidden_count, self)
            if dlg.exec() != QDialog.Accepted:
                self.append_log("Đã huỷ chọn sheet. Không parse file.")
                self.btn_parse.setEnabled(True)
                self.progress_bar.setVisible(False)
                return
            chosen_sheet = dlg.get_selected_sheet()
            self.append_log(f"User chọn sheet: '{chosen_sheet}'")

        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0) # Indeterminate mode
        self.worker = ParseWorker(self.selected_file, project_name, period_month, period_year, self.signals, self.holiday_config, sheet_name=chosen_sheet)
        self.worker.start()

    def on_review_mapping_requested(self, headers, ai_mapping, event, result_container):
        dialog = ReviewMappingDialog(headers, ai_mapping, self)
        if dialog.exec() == QDialog.Accepted:
            result_container['mapping'] = dialog.final_mapping
            result_container['review_event'] = dialog.review_event
            self.pending_mapping_review_event = dialog.review_event
        else:
            result_container['mapping'] = {header: None for header in headers}
            result_container['review_event'] = None
            self.pending_mapping_review_event = None
        event.set()

    def on_parse_done(self, data):
        self.parsed_data = data
        if self.pending_mapping_review_event:
            for record in self.parsed_data:
                append_governance_event(record, self.pending_mapping_review_event)
            self.pending_mapping_review_event = None
        self.progress_bar.setVisible(False)
        self.btn_parse.setEnabled(True)
        if not data:
            self.append_log("Lỗi: Không có dữ liệu preview!")
            return

        self.parsed_data = data
        self.btn_push.setEnabled(True)
        self.btn_export_template.setEnabled(True)
        
        # Bật Double-check
        self.cbo_emp_check.setEnabled(True)
        self.txt_col_check.setEnabled(True)
        self.btn_run_check.setEnabled(True)
        
        # Nạp danh sách nhân viên
        self.cbo_emp_check.clear()
        for item in data:
            self.cbo_emp_check.addItem(f"{item.get('employeeCode')} - {item.get('fullName')}")
        
        self.populate_table()
        self.append_log(f"Đã tải xong bảng Preview. Bạn có thể sử dụng Tra cứu nhanh để đối chiếu dữ liệu!")

    def run_double_check(self):
        if not self.parsed_data: return
        emp_idx = self.cbo_emp_check.currentIndex()
        if emp_idx < 0: return
        
        employee = self.parsed_data[emp_idx]
        col_str = self.txt_col_check.text().strip().upper()
        
        if not col_str.isalpha():
            self.txt_excel_cell.setText("LỖI")
            self.txt_parsed_value.setText("Tên cột không hợp lệ")
            return
            
        # Tính col_idx
        col_idx = 0
        for char in col_str:
            col_idx = col_idx * 26 + (ord(char) - ord('A') + 1)
        col_idx -= 1
        
        excel_row = employee.get("excelRow", "?")
        raw_row = employee.get("rawRow", [])
        
        if col_idx < len(raw_row):
            val = raw_row[col_idx]
            self.txt_excel_cell.setText(f"{col_str}{excel_row}")
            self.txt_parsed_value.setText(str(val))
            self.append_log(f"[Kiểm tra] {employee.get('employeeCode')} | {col_str}{excel_row} -> Giá trị đang giữ: {val}")
        else:
            self.txt_excel_cell.setText(f"{col_str}{excel_row}")
            self.txt_parsed_value.setText("N/A")
            self.append_log(f"[Kiểm tra] {employee.get('employeeCode')} | Lỗi: Cột {col_str} vượt quá giới hạn file!")

    def format_money(self, val):
        try:
            return f"{int(val):,}".replace(",", ".")
        except:
            return "0"

    def populate_table(self):
        self.table.setRowCount(0)
        if not self.parsed_data: return
        
        self.table.setRowCount(len(self.parsed_data))
        for i, emp in enumerate(self.parsed_data):
            # Checkbox Chọn
            chk_item = QTableWidgetItem()
            chk_item.setFlags(Qt.ItemIsUserCheckable | Qt.ItemIsEnabled)
            
            has_error = emp.get("hasError", False)
            if has_error:
                chk_item.setCheckState(Qt.Unchecked)
            else:
                chk_item.setCheckState(Qt.Checked)
                
            self.table.setItem(i, 0, chk_item)
            
            self.table.setItem(i, 1, QTableWidgetItem(str(emp["employeeCode"])))
            self.table.setItem(i, 2, QTableWidgetItem(str(emp["fullName"])))
            self.table.setItem(i, 3, QTableWidgetItem(str(emp["totalWorkDays"])))
            self.table.setItem(i, 4, QTableWidgetItem(str(emp["otHours"])))
            self.table.setItem(i, 5, QTableWidgetItem(str(emp["absentDays"])))
            
            income_item = QTableWidgetItem()
            if has_error:
                income_item.setText("LỖI DỮ LIỆU")
                income_item.setForeground(QColor("red"))
                income_item.setToolTip(emp.get("errorMsg", "Lỗi định dạng dữ liệu"))
                
                # Tô đỏ cả dòng
                for col in range(7):
                    cell = self.table.item(i, col)
                    if cell: cell.setBackground(QColor("#ffe6e6"))
            else:
                income = self.format_money(emp.get("totalIncome", 0))
                income_item.setText(income)
            
            self.table.setItem(i, 6, income_item)

    def on_header_clicked(self, logicalIndex):
        if logicalIndex == 0:
            if not hasattr(self, '_all_selected'):
                self._all_selected = True
            
            self._all_selected = not self._all_selected
            new_state = Qt.Checked if self._all_selected else Qt.Unchecked
            
            for i in range(self.table.rowCount()):
                chk = self.table.item(i, 0)
                if chk:
                    chk.setCheckState(new_state)

    def show_context_menu(self, pos):
        if not self.parsed_data: return
        row = self.table.rowAt(pos.y())
        if row >= 0:
            menu = QMenu(self)
            edit_action = menu.addAction("Sửa bảng công...")
            action = menu.exec(self.table.viewport().mapToGlobal(pos))
            if action == edit_action:
                self.edit_employee_timesheet(row)
                
    def request_governance_event(self, action, default_reason):
        actor, accepted = QInputDialog.getText(
            self,
            "Xác nhận người thực hiện",
            "Người thực hiện:",
            text=os.environ.get("USERNAME", ""),
        )
        if not accepted:
            return None
        reason, accepted = QInputDialog.getText(
            self,
            "Lý do xác nhận",
            "Lý do:",
            text=default_reason,
        )
        if not accepted:
            return None
        try:
            return make_governance_event(action=action, actor=actor, reason=reason)
        except ValueError as error:
            QMessageBox.warning(self, "Thiếu xác nhận", str(error))
            return None

    def edit_employee_timesheet(self, row):
        emp_data = self.parsed_data[row]
        dlg = EditTimesheetDialog(emp_data, self)
        if dlg.exec():
            override_event = self.request_governance_event(
                "timesheet_override",
                "Đã kiểm tra và điều chỉnh bảng công",
            )
            if not override_event:
                return
            new_daily_data = dlg.get_updated_daily_data()
            emp_data["dailyData"] = new_daily_data
            
            # Cập nhật lại tổng
            calc_total_days = sum(1 for d in new_daily_data if d["status"] != "ABSENT")
            calc_total_ot = sum(d["ot"] for d in new_daily_data)
            calc_absent_days = sum(1 for d in new_daily_data if d["status"] == "ABSENT")
            
            emp_data["totalWorkDays"] = calc_total_days
            emp_data["otHours"] = calc_total_ot
            emp_data["absentDays"] = calc_absent_days
            
            # Cập nhật raw_data
            raw = emp_data.get("rawData", {})
            raw["total_days"] = calc_total_days
            raw["ot_150"] = calc_total_ot 
            raw["absent_days"] = calc_absent_days
            
            # Gọi lại plugin để tính
            project_name = self.cbo_project.currentText()
            formula_engine = FormulaRegistry.get_formula(project_name)
            if formula_engine:
                try:
                    payroll_data = formula_engine.calculate(raw)
                    emp_data["payrollData"] = payroll_data
                    emp_data["totalIncome"] = payroll_data["summary"]["netIncome"] if payroll_data else 0
                except Exception as e:
                    self.append_log(f"Lỗi tính lại lương cho {emp_data['fullName']}: {str(e)}")
                    return
            
            # Xóa trạng thái lỗi nếu có
            emp_data["hasError"] = False
            emp_data["errorMsg"] = ""
            append_governance_event(emp_data, override_event)
            
            # Cập nhật UI dòng đó
            self.table.item(row, 3).setText(str(emp_data["totalWorkDays"]))
            self.table.item(row, 4).setText(str(emp_data["otHours"]))
            self.table.item(row, 5).setText(str(emp_data["absentDays"]))
            
            income_item = self.table.item(row, 6)
            income_item.setText(self.format_money(emp_data.get("totalIncome", 0)))
            income_item.setForeground(QColor("black"))
            income_item.setToolTip("")
            
            # Tô màu vàng đánh dấu đã sửa tay và tự động tick lại
            for col in range(7):
                cell = self.table.item(row, col)
                if cell: cell.setBackground(QColor("#fff3cd"))
                
            self.table.item(row, 0).setCheckState(Qt.Checked)
            
            self.append_log(f"Đã cập nhật công và lương cho: {emp_data['fullName']}")

    def run_export_template(self):
        """Xuất file Excel đầy đủ dữ liệu để đối chiếu + DB payload"""
        if not self.parsed_data:
            QMessageBox.warning(self, "Lỗi", "Chưa có dữ liệu nào được bóc tách.")
            return

        try:
            validate_publish_records(self.parsed_data)
        except ValueError as error:
            QMessageBox.warning(self, "Không thể xuất", str(error))
            return

        export_event = self.request_governance_event(
            "export_review",
            "Đã review dữ liệu trước khi xuất Excel chuẩn hoá",
        )
        if not export_event:
            return
        for record in self.parsed_data:
            append_governance_event(record, export_event)
            
        # Lấy thông tin dự án và kỳ lương
        project_name = self.cbo_project.currentText()
        period_month = self.cbo_month.currentIndex() + 1
        try:
            period_year = int(self.txt_year.text().strip())
        except:
            period_year = datetime.now().year
        
        project_name_raw = project_name
        project_name_slug = _strip_accents(project_name_raw).replace(' ', '_').replace('-', '_')
        default_name = f"LCNT_{period_month}_{period_year}_{project_name_slug}.xlsx"
        save_path, _ = QFileDialog.getSaveFileName(
            self, "Lưu File Chuẩn Hoá", default_name, "Excel Files (*.xlsx)"
        )
        if not save_path:
            return
            
        self.append_log("Đang xuất file chuẩn hoá đầy đủ...")
        try:
            from export_manager import export_payroll_to_excel
            
            result = export_payroll_to_excel(
                self.parsed_data,
                project_name,
                period_month,
                period_year,
                save_path
            )
            
            if result["success"]:
                self.append_log(f"✅ Đã xuất thành công file với {len(result['sheets_created'])} sheet:")
                for sheet in result['sheets_created']:
                    self.append_log(f"   - {sheet}")
                self.append_log(f"📊 Tổng cộng: {result['total_employees']} nhân viên")
                self.append_log(f"📁 File: {save_path}")
                
                # Log DB payload size
                db_payload = result['db_payload']
                self.append_log(f"💾 DB Payload: {len(db_payload['timesheets'])} timesheets, {len(db_payload['timesheetLines'])} daily lines")
                
                QMessageBox.information(
                    self, "Thành công", 
                    f"Đã xuất file chuẩn hoá thành công!\n\n"
                    f"File: {save_path}\n\n"
                    f"Sheet: {', '.join(result['sheets_created'])}\n\n"
                    f"Tổng: {result['total_employees']} nhân viên"
                )
            else:
                raise Exception("Export failed")
                
        except Exception as e:
            self.append_log(f"❌ Lỗi khi xuất file chuẩn hoá: {str(e)}")
            import traceback
            traceback.print_exc()
            QMessageBox.critical(self, "Lỗi", f"Không thể xuất file: {str(e)}")

    def run_reset(self):
        self.parsed_data = None
        self.table.setRowCount(0)
        self.txt_file.clear()
        self.selected_file = None
        self.btn_parse.setEnabled(False)
        self.btn_push.setEnabled(False)
        self.btn_export_template.setEnabled(False)
        
        self.cbo_emp_check.clear()
        self.cbo_emp_check.setEnabled(False)
        self.txt_col_check.clear()
        self.txt_col_check.setEnabled(False)
        self.btn_run_check.setEnabled(False)
        self.txt_excel_cell.clear()
        self.txt_parsed_value.clear()
        
        self.txt_log.clear()
        self.append_log("Đã làm mới ứng dụng.")

    def run_push(self):
        if not self.parsed_data:
            QMessageBox.warning(self, "Lỗi", "Không có dữ liệu để push. Hãy parse file trước!")
            return
            
        # Lọc ra những nhân viên được Check
        selected_data = []
        for i in range(self.table.rowCount()):
            chk = self.table.item(i, 0)
            if chk and chk.checkState() == Qt.Checked:
                selected_data.append(self.parsed_data[i])
                
        if not selected_data:
            QMessageBox.warning(self, "Lỗi", "Vui lòng tick chọn ít nhất 1 nhân viên để Push!")
            return

        try:
            validate_publish_records(selected_data)
        except ValueError as error:
            QMessageBox.warning(self, "Không thể Push", str(error))
            return

        publish_event = self.request_governance_event(
            "publish_review",
            "Đã review dữ liệu trước khi push lên Portal",
        )
        if not publish_event:
            return
        for record in selected_data:
            append_governance_event(record, publish_event)
            
        # Lấy thông tin dự án và kỳ lương từ giao diện
        project_name = self.cbo_project.currentText()
        period_month = self.cbo_month.currentIndex() + 1
        period_year = self.txt_year.text().strip()
            
        # Confirm lần 1 (Rich Text)
        msg1 = QMessageBox(self)
        msg1.setWindowTitle("Xác nhận Push Dữ liệu (Lần 1)")
        msg1.setIcon(QMessageBox.Warning)
        msg1.setTextFormat(Qt.RichText)
        msg1.setText(
            f"Bạn chuẩn bị <b>PUSH {len(selected_data)} bản ghi</b> lên Cơ sở dữ liệu.<br><br>"
            f"Dự án: <b style='color: red; font-size: 16px;'>{project_name}</b><br>"
            f"Kỳ lương: <b style='color: red; font-size: 16px;'>Tháng {period_month}/{period_year}</b><br><br>"
            f"<i>Lưu ý: Dữ liệu này sẽ hiển thị ngay lập tức trên hệ thống Portal cho nhân viên xem.</i><br><br>"
            "Bạn có muốn tiếp tục?"
        )
        msg1.setStandardButtons(QMessageBox.Yes | QMessageBox.No)
        msg1.setDefaultButton(QMessageBox.No)
        
        if msg1.exec() != QMessageBox.Yes:
            return
            
        # Confirm lần 2 (Cảnh báo ghi đè)
        msg2 = QMessageBox(self)
        msg2.setWindowTitle("Cảnh báo Ghi đè (Lần 2)")
        msg2.setIcon(QMessageBox.Critical)
        msg2.setTextFormat(Qt.RichText)
        msg2.setText(
            f"<b>HÀNH ĐỘNG NÀY SẼ GHI ĐÈ DỮ LIỆU CŨ!</b><br><br>"
            f"Hệ thống sẽ <b>xoá sạch</b> dữ liệu cũ (nếu có) của {len(selected_data)} nhân viên này "
            f"trong kỳ <b>Tháng {period_month}/{period_year}</b> trước khi chèn mới.<br><br>"
            f"Hãy chắc chắn bạn không chọn nhầm kỳ lương!<br>"
            "Bạn vẫn quyết định PUSH?"
        )
        msg2.setStandardButtons(QMessageBox.Yes | QMessageBox.No)
        msg2.setDefaultButton(QMessageBox.No)
        
        if msg2.exec() == QMessageBox.Yes:
            self.btn_parse.setEnabled(False)
            self.btn_push.setEnabled(False)
            self.btn_export_template.setEnabled(False)
            self.progress_bar.setVisible(True)
            self.append_log(f"--- BẮT ĐẦU PUSH {len(selected_data)} BẢN GHI ---")
            
            self.worker_push = PushWorker(selected_data, self.db_url, self.signals)
            self.worker_push.start()

    def run_clear_db(self):
        project_name = self.cbo_export_project.currentText()
        if not project_name or project_name == "Chưa cài đặt Plugin nào!":
            QMessageBox.warning(self, "Lỗi", "Vui lòng chọn Dự án cần xoá ở phần Sao Lưu Bảng Lương.")
            return
            
        period_month = self.cbo_export_month.currentIndex() + 1
        try:
            period_year = int(self.txt_export_year.text().strip())
        except:
            QMessageBox.warning(self, "Lỗi", "Năm không hợp lệ ở phần Sao Lưu Bảng Lương!")
            return
            
        reply = QMessageBox.question(self, 'CẢNH BÁO NGUY HIỂM', 
                                    f'Bạn chuẩn bị XOÁ SẠCH toàn bộ dữ liệu bảng công của dự án [{project_name}] trong Tháng {period_month}/{period_year} trên Database.\n\nHành động này không thể hoàn tác!\nBạn có chắc chắn?',
                                    QMessageBox.Yes | QMessageBox.No, QMessageBox.No)

        if reply == QMessageBox.Yes:
            clear_event = self.request_governance_event(
                "period_clear",
                "Đã xác nhận xoá dữ liệu kỳ lương",
            )
            if not clear_event:
                return
            self.log_export(
                f"[GOVERNANCE] Xác nhận xóa: {clear_event['actor']} | {clear_event['reason']}"
            )
            self.btn_export_payroll.setEnabled(False)
            self.btn_export_history.setEnabled(False)
            self.btn_clear_db.setEnabled(False)
            self.log_export(f"--- ĐANG XOÁ DB DỰ ÁN {project_name} (Tháng {period_month}/{period_year}) ---")
            # Reuse ClearDbWorker which was imported
            self.worker_clear = ClearDbWorker(project_name, period_month, period_year, self.db_url, self.signals)
            self.worker_clear.start()

    def on_push_done(self, success):
        self.btn_push.setEnabled(True)
        self.btn_export_template.setEnabled(True)
        self.progress_bar.setVisible(False)
        if success:
            QMessageBox.information(self, "Thành công", "Đã thực thi cập nhật Database thành công!")
            self.table.setRowCount(0)
            self.parsed_data = None
            self.btn_push.setEnabled(False)
            self.btn_export_template.setEnabled(False)
        else:
            QMessageBox.critical(self, "Lỗi", "Không thể push lên Database. Xem Log để biết chi tiết.")

    def on_clear_done(self, success):
        self.btn_export_payroll.setEnabled(True)
        self.btn_export_history.setEnabled(True)
        self.btn_clear_db.setEnabled(True)
        if success:
            QMessageBox.information(self, "Thành công", "Đã dọn dẹp Database thành công!")
        else:
            QMessageBox.critical(self, "Lỗi", "Có lỗi xảy ra khi xoá Database. Xem Log để biết chi tiết.")

    # -------------------------------------------------------------
    # TAB 2: ĐỐI SOÁT CÁ NHÂN
    # -------------------------------------------------------------
    def setup_tab_recon(self):
        layout = QVBoxLayout()
        self.tab_recon.setLayout(layout)
        
        # Input group
        input_group = QGroupBox("Điều kiện Tìm kiếm")
        input_layout = QGridLayout()
        
        input_layout.addWidget(QLabel("Dự án / Công thức:"), 0, 0)
        self.cbo_recon_project = QComboBox()
        self.cbo_recon_project.addItems(FormulaRegistry.get_all_projects())
        input_layout.addWidget(self.cbo_recon_project, 0, 1)
        
        input_layout.addWidget(QLabel("Kỳ lương (Tháng/Năm):"), 1, 0)
        period_layout = QHBoxLayout()
        self.cbo_recon_month = QComboBox()
        self.cbo_recon_month.addItems([f"Tháng {i}" for i in range(1, 13)])
        self.cbo_recon_month.setCurrentIndex(datetime.now().month - 1)
        
        self.txt_recon_year = QLineEdit()
        self.txt_recon_year.setText(str(datetime.now().year))
        
        period_layout.addWidget(self.cbo_recon_month)
        period_layout.addWidget(self.txt_recon_year)
        input_layout.addLayout(period_layout, 1, 1)
        
        input_layout.addWidget(QLabel("Mã Nhân viên (ID):"), 2, 0)
        self.txt_recon_emp = QLineEdit()
        self.txt_recon_emp.setPlaceholderText("Nhập mã nhân viên cần đối soát...")
        input_layout.addWidget(self.txt_recon_emp, 2, 1)
        
        self.btn_recon_fetch = QPushButton("Lấy Dữ Liệu")
        self.btn_recon_fetch.setStyleSheet("background-color: #0d6efd; color: white; font-weight: bold; padding: 10px;")
        self.btn_recon_fetch.clicked.connect(self.run_recon_fetch)
        input_layout.addWidget(self.btn_recon_fetch, 3, 0, 1, 2)
        
        input_group.setLayout(input_layout)
        layout.addWidget(input_group)
        
        # Log area
        self.txt_recon_log = QTextEdit()
        self.txt_recon_log.setReadOnly(True)
        self.txt_recon_log.setStyleSheet("background-color: #1e1e1e; color: #00ff00; font-family: Consolas; font-size: 11px;")
        layout.addWidget(self.txt_recon_log)

    def log_recon(self, msg):
        self.txt_recon_log.append(msg)
        sb = self.txt_recon_log.verticalScrollBar()
        sb.setValue(sb.maximum())

    def run_recon_fetch(self):
        project = self.cbo_recon_project.currentText()
        if not project or project == "Chưa cài đặt Plugin nào!":
            QMessageBox.warning(self, "Lỗi", "Vui lòng chọn Dự án.")
            return
            
        emp_code = self.txt_recon_emp.text().strip()
        if not emp_code:
            QMessageBox.warning(self, "Lỗi", "Vui lòng nhập Mã nhân viên.")
            return
            
        period_month = self.cbo_recon_month.currentIndex() + 1
        try:
            period_year = int(self.txt_recon_year.text().strip())
        except:
            QMessageBox.warning(self, "Lỗi", "Năm không hợp lệ.")
            return
            
        self.log_recon(f"Đang lấy dữ liệu NV [{emp_code}] tháng {period_month}/{period_year}...")
        self.btn_recon_fetch.setEnabled(False)
        
        class FetchWorker(QThread):
            def __init__(self, p, m, y, e, db, log_cb, parent=None):
                super().__init__(parent)
                self.args = (p, m, y, e, db, log_cb)
                self.result = None
            def run(self):
                self.result = fetch_employee_timesheet(*self.args)
                
        self.fetch_worker = FetchWorker(project, period_month, period_year, emp_code, self.db_url, self.log_recon)
        self.fetch_worker.finished.connect(self.on_recon_fetched)
        self.fetch_worker.start()

    def on_recon_fetched(self):
        self.btn_recon_fetch.setEnabled(True)
        emp_data = self.fetch_worker.result
        if not emp_data:
            self.log_recon(f"❌ Không tìm thấy bản ghi nào trong Database!")
            QMessageBox.warning(self, "Không tìm thấy", "Không có dữ liệu của nhân viên này trong Database.")
            return
            
        self.log_recon(f"✅ Đã tải dữ liệu của: {emp_data['fullName']}. Mở cửa sổ đối soát...")
        
        dlg = EditTimesheetDialog(emp_data, self)
        if dlg.exec():
            override_event = self.request_governance_event(
                "reconciliation_override",
                "Đã kiểm tra và điều chỉnh bảng công đối soát",
            )
            if not override_event:
                return
            # Update data
            new_daily_data = dlg.get_updated_daily_data()
            emp_data["dailyData"] = new_daily_data
            
            calc_total_days = sum(1 for d in new_daily_data if d["status"] != "ABSENT")
            calc_total_ot = sum(d["ot"] for d in new_daily_data)
            calc_absent_days = sum(1 for d in new_daily_data if d["status"] == "ABSENT")
            
            emp_data["totalWorkDays"] = calc_total_days
            emp_data["otHours"] = calc_total_ot
            emp_data["absentDays"] = calc_absent_days
            
            raw = emp_data.get("rawData", {})
            raw["total_days"] = calc_total_days
            raw["ot_150"] = calc_total_ot 
            raw["absent_days"] = calc_absent_days
            
            formula_engine = FormulaRegistry.get_formula(self.cbo_recon_project.currentText())
            if formula_engine:
                try:
                    payroll_data = formula_engine.calculate(raw)
                    emp_data["payrollData"] = payroll_data
                    emp_data["totalIncome"] = payroll_data["summary"]["netIncome"] if payroll_data else 0
                    append_governance_event(emp_data, override_event)
                except Exception as e:
                    self.log_recon(f"Lỗi tính lại lương: {str(e)}")
                    return
            
            # Save back to DB
            self.log_recon(f"Đang lưu các thay đổi của {emp_data['fullName']} lên Database...")
            
            class UpdateWorker(QThread):
                def __init__(self, item, db, parent=None):
                    super().__init__(parent)
                    self.item = item
                    self.db = db
                    self.success = False
                def run(self):
                    self.success = update_employee_timesheet(self.item, self.db)
                    
            self.update_worker = UpdateWorker(emp_data, self.db_url)
            self.update_worker.finished.connect(lambda: self.on_recon_updated(emp_data))
            self.update_worker.start()

    def on_recon_updated(self, emp_data):
        if self.update_worker.success:
            self.log_recon(f"✅ Đã lưu thành công! Thu nhập mới: {self.format_money(emp_data['totalIncome'])} VNĐ")
            QMessageBox.information(self, "Thành công", f"Đã lưu thành công cho nhân viên {emp_data['fullName']}!")
        else:
            self.log_recon("❌ Lỗi khi lưu lên Database.")
            QMessageBox.critical(self, "Lỗi", "Không thể lưu dữ liệu.")

    # -------------------------------------------------------------
    # TAB 3: TRÍCH XUẤT & SAO LƯU
    # -------------------------------------------------------------
    def setup_tab_export(self):
        layout = QVBoxLayout()
        layout.setSpacing(20) # Tăng khoảng cách dọc giữa các GroupBox
        self.tab_export.setLayout(layout)
        
        # Section 1: Lịch sử Cá nhân
        group1 = QGroupBox("Tải Lịch sử Bảng Công (Theo Cá Nhân)")
        layout1 = QGridLayout()
        layout1.setVerticalSpacing(15) # Tăng khoảng cách dọc giữa các hàng
        
        layout1.addWidget(QLabel("Mã Nhân Viên (Từ file Excel):"), 0, 0)
        self.txt_export_emp = QLineEdit()
        self.txt_export_emp.setPlaceholderText("Nhập mã nhân viên...")
        self.txt_export_emp.setStyleSheet("padding: 6px;")
        layout1.addWidget(self.txt_export_emp, 0, 1)
        
        self.btn_export_history = QPushButton("📥 Tải Lịch Sử Về Máy")
        self.btn_export_history.setStyleSheet("background-color: #198754; color: white; font-weight: bold; padding: 6px;")
        self.btn_export_history.clicked.connect(self.run_export_history)
        layout1.addWidget(self.btn_export_history, 0, 2)
        
        group1.setLayout(layout1)
        layout.addWidget(group1)
        
        # Section 2: Bảng lương Dự án
        group2 = QGroupBox("Sao lưu Bảng Lương (Theo Dự Án)")
        layout2 = QGridLayout()
        layout2.setVerticalSpacing(15) # Tăng khoảng cách dọc giữa các hàng
        
        layout2.addWidget(QLabel("Dự án / Công thức:"), 0, 0)
        self.cbo_export_project = QComboBox()
        self.cbo_export_project.addItems(FormulaRegistry.get_all_projects())
        self.cbo_export_project.setStyleSheet("padding: 5px;")
        layout2.addWidget(self.cbo_export_project, 0, 1, 1, 3) # Extend to col 3
        
        layout2.addWidget(QLabel("Kỳ lương:"), 1, 0)
        self.cbo_export_month = QComboBox()
        self.cbo_export_month.addItems([f"Tháng {i}" for i in range(1, 13)])
        self.cbo_export_month.setCurrentIndex(datetime.now().month - 1)
        self.cbo_export_month.setStyleSheet("padding: 5px;")
        self.cbo_export_month.setFixedWidth(120)
        layout2.addWidget(self.cbo_export_month, 1, 1)
        
        self.txt_export_year = QLineEdit()
        self.txt_export_year.setText(str(datetime.now().year))
        self.txt_export_year.setStyleSheet("padding: 5px;")
        self.txt_export_year.setFixedWidth(100)
        layout2.addWidget(self.txt_export_year, 1, 2)
        
        # Add empty spacer to column 3 to push everything left
        spacer = QLabel("")
        layout2.addWidget(spacer, 1, 3)
        layout2.setColumnStretch(3, 1)
        
        self.btn_export_payroll = QPushButton("📥 Tải Bảng Lương Dự Án")
        self.btn_export_payroll.setStyleSheet("background-color: #0dcaf0; color: #000; font-weight: bold; padding: 8px;")
        self.btn_export_payroll.clicked.connect(self.run_export_payroll)
        layout2.addWidget(self.btn_export_payroll, 2, 0, 1, 4)
        
        group2.setLayout(layout2)
        layout.addWidget(group2)
        
        # Section 3: Quản trị Hệ thống (Nguy hiểm)
        group3 = QGroupBox("Quản trị Cơ sở dữ liệu (Nguy hiểm)")
        group3.setStyleSheet("""
            QGroupBox { 
                color: red; 
                font-weight: bold; 
                border: 1px solid red; 
                margin-top: 25px; 
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                subcontrol-position: top left;
                padding: 0 5px;
                left: 10px;
            }
        """)
        layout3 = QVBoxLayout()
        
        lbl_warning = QLabel("⚠️ Cảnh báo: Thao tác dưới đây sẽ xoá toàn bộ bảng lương của Dự án và Kỳ lương hiện tại (đang chọn ở mục Sao lưu phía trên) khỏi Database. Hãy cân nhắc kỹ.")
        lbl_warning.setWordWrap(True)
        lbl_warning.setStyleSheet("color: red; font-style: italic;")
        layout3.addWidget(lbl_warning)
        
        self.btn_clear_db = QPushButton("🗑️ Xoá sạch DB kỳ này")
        self.btn_clear_db.clicked.connect(self.run_clear_db)
        self.btn_clear_db.setStyleSheet("background-color: #dc3545; color: white; font-weight: bold; padding: 10px;")
        layout3.addWidget(self.btn_clear_db)
        
        group3.setLayout(layout3)
        layout.addWidget(group3)
        
        layout.addStretch()
        
        # Log area
        self.txt_export_log = QTextEdit()
        self.txt_export_log.setReadOnly(True)
        self.txt_export_log.setStyleSheet("background-color: #1e1e1e; color: #0dcaf0; font-family: Consolas; font-size: 11px;")
        layout.addWidget(self.txt_export_log)

    def log_export(self, msg):
        self.txt_export_log.append(msg)
        sb = self.txt_export_log.verticalScrollBar()
        sb.setValue(sb.maximum())

    def run_export_history(self):
        emp_code = self.txt_export_emp.text().strip()
        if not emp_code:
            QMessageBox.warning(self, "Lỗi", "Vui lòng nhập Mã Nhân Viên.")
            return
            
        save_path, _ = QFileDialog.getSaveFileName(self, "Lưu file Lịch sử", f"LichSu_{emp_code}.xlsx", "Excel Files (*.xlsx)")
        if not save_path:
            return
            
        self.log_export(f"Đang tải lịch sử nhân viên [{emp_code}]...")
        self.btn_export_history.setEnabled(False)
        
        class ExportHistoryWorker(QThread):
            def __init__(self, emp, db, path, log_cb, parent=None):
                super().__init__(parent)
                self.args = (emp, db, path, log_cb)
                self.success = False
            def run(self):
                self.success = export_employee_history(*self.args)
                
        self.exp_hist_worker = ExportHistoryWorker(emp_code, self.db_url, save_path, self.log_export)
        self.exp_hist_worker.finished.connect(self.on_export_history_done)
        self.exp_hist_worker.start()

    def on_export_history_done(self):
        self.btn_export_history.setEnabled(True)
        if self.exp_hist_worker.success:
            QMessageBox.information(self, "Thành công", "Đã xuất file Lịch sử thành công!")
        else:
            QMessageBox.warning(self, "Lỗi", "Không thể xuất file. Xem chi tiết trong Log.")

    def run_export_payroll(self):
        project = self.cbo_export_project.currentText()
        if not project or project == "Chưa cài đặt Plugin nào!":
            QMessageBox.warning(self, "Lỗi", "Vui lòng chọn Dự án.")
            return
            
        period_month = self.cbo_export_month.currentIndex() + 1
        try:
            period_year = int(self.txt_export_year.text().strip())
        except:
            QMessageBox.warning(self, "Lỗi", "Năm không hợp lệ.")
            return
            
        save_path, _ = QFileDialog.getSaveFileName(self, "Lưu file Bảng Lương", f"BangLuong_{project}_{period_month}_{period_year}.xlsx", "Excel Files (*.xlsx)")
        if not save_path:
            return
            
        self.log_export(f"Đang tải bảng lương dự án [{project}] tháng {period_month}/{period_year}...")
        self.btn_export_payroll.setEnabled(False)
        
        class ExportPayrollWorker(QThread):
            def __init__(self, p, m, y, db, path, log_cb, parent=None):
                super().__init__(parent)
                self.args = (p, m, y, db, path, log_cb)
                self.success = False
            def run(self):
                self.success = export_project_payroll(*self.args)
                
        self.exp_pay_worker = ExportPayrollWorker(project, period_month, period_year, self.db_url, save_path, self.log_export)
        self.exp_pay_worker.finished.connect(self.on_export_payroll_done)
        self.exp_pay_worker.start()

    def on_export_payroll_done(self):
        self.btn_export_payroll.setEnabled(True)
        if self.exp_pay_worker.success:
            QMessageBox.information(self, "Thành công", "Đã xuất file Bảng lương thành công!")
        else:
            QMessageBox.warning(self, "Lỗi", "Không thể xuất file. Xem chi tiết trong Log.")


    # -------------------------------------------------------------
    # TAB 4: CÀI ĐẶT HỆ THỐNG
    # -------------------------------------------------------------
    def setup_tab_settings(self):
        layout = QVBoxLayout()
        self.tab_settings.setLayout(layout)
        
        group = QGroupBox("Cấu hình Môi trường (Environment Variables)")
        form = QFormLayout()
        
        self.txt_db_url = QLineEdit()
        self.txt_db_url.setEchoMode(QLineEdit.PasswordEchoOnEdit)
        self.txt_db_url.setText(os.environ.get("DATABASE_URL", ""))
        self.txt_db_url.setPlaceholderText("postgres://user:pass@host/db")
        
        # API Key Row with Check Button
        api_layout = QHBoxLayout()
        self.txt_deepseek_api = QLineEdit()
        self.txt_deepseek_api.setEchoMode(QLineEdit.PasswordEchoOnEdit)
        self.txt_deepseek_api.setText(os.environ.get("DEEPSEEK_API_KEY", ""))
        self.txt_deepseek_api.setPlaceholderText("sk-...")
        api_layout.addWidget(self.txt_deepseek_api)
        
        btn_check_api = QPushButton("Kiểm tra API")
        btn_check_api.clicked.connect(self.check_deepseek_api)
        api_layout.addWidget(btn_check_api)
        
        form.addRow("DATABASE_URL (Neon Postgres):", self.txt_db_url)
        form.addRow("DEEPSEEK_API_KEY (AI Mapping):", api_layout)
        group.setLayout(form)
        layout.addWidget(group)
        
        btn_save = QPushButton("💾 Lưu Cài Đặt vào file .env")
        btn_save.setFixedHeight(40)
        btn_save.setStyleSheet("background-color: #2b579a; color: white; font-weight: bold; font-size: 14px;")
        btn_save.clicked.connect(self.save_settings)
        layout.addWidget(btn_save)
        
        info_label = QLabel("Lưu ý: Mật khẩu và Token sẽ được mã hoá ẩn đi trên giao diện.\nFile .env sẽ được tạo tự động cùng thư mục với file .exe khi bạn nhấn Lưu.")
        info_label.setStyleSheet("color: #666; font-style: italic;")
        layout.addWidget(info_label)
        
        layout.addStretch()

    def save_settings(self):
        db_url = self.txt_db_url.text().strip()
        api_key = self.txt_deepseek_api.text().strip()
        
        if getattr(sys, 'frozen', False):
            application_path = os.path.dirname(sys.executable)
        else:
            application_path = os.path.dirname(os.path.abspath(__file__))
            
        env_path = os.path.join(application_path, '.env')
        
        try:
            with open(env_path, "w", encoding="utf-8") as f:
                f.write(f"DATABASE_URL={db_url}\n")
                f.write(f"DEEPSEEK_API_KEY={api_key}\n")
                
            os.environ["DATABASE_URL"] = db_url
            os.environ["DEEPSEEK_API_KEY"] = api_key
            self.db_url = db_url
            
            QMessageBox.information(self, "Thành công", f"Đã lưu cấu hình an toàn vào: {env_path}\nBạn có thể sử dụng hệ thống bình thường.")
        except Exception as e:
            QMessageBox.critical(self, "Lỗi", f"Không thể lưu file .env: {e}")

    def check_deepseek_api(self):
        api_key = self.txt_deepseek_api.text().strip()
        if not api_key:
            QMessageBox.warning(self, "Cảnh báo", "Vui lòng nhập API Key trước khi kiểm tra.")
            return
            
        import urllib.request
        import urllib.error
        try:
            req = urllib.request.Request("https://api.deepseek.com/models", headers={"Authorization": f"Bearer {api_key}"})
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    QMessageBox.information(self, "Thành công", "API Key hợp lệ! Đã kết nối thành công tới Deepseek.")
        except urllib.error.HTTPError as e:
            QMessageBox.warning(self, "Thất bại", f"API Key không hợp lệ hoặc lỗi mạng.\nMã lỗi: {e.code}\nChi tiết: {e.reason}")
        except Exception as e:
            QMessageBox.critical(self, "Lỗi", f"Không thể kết nối tới Deepseek: {str(e)}")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    app.setStyleSheet("QWidget { font-size: 13px; }")
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
