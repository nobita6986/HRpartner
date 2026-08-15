import sys
import os
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                               QHBoxLayout, QPushButton, QLabel, QLineEdit, 
                               QFileDialog, QTextEdit, QMessageBox, QGroupBox,
                               QTableWidget, QTableWidgetItem, QHeaderView, QComboBox, QProgressBar)
from PySide6.QtCore import Qt, Signal, QObject, QThread
from PySide6.QtGui import QColor, QIcon, QPixmap
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")

from core_pipeline import preview_file, push_to_db
from formulas.formula_registry import FormulaRegistry

class WorkerSignals(QObject):
    log_signal = Signal(str)
    done_signal = Signal(object)
    push_done_signal = Signal(bool)

class ParseWorker(QThread):
    def __init__(self, file_path, project_name, period_month, period_year, signals):
        super().__init__()
        self.file_path = file_path
        self.project_name = project_name
        self.period_month = period_month
        self.period_year = period_year
        self.signals = signals

    def run(self):
        def logger(msg):
            self.signals.log_signal.emit(msg)
            
        data = preview_file(self.file_path, self.project_name, self.period_month, self.period_year, logger)
        self.signals.done_signal.emit(data)

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

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("HrP ETL Desktop - Bóc tách Bảng Lương AI")
        self.setMinimumSize(950, 750)

        # Cài đặt Window Icon
        base_dir = os.path.dirname(os.path.abspath(__file__))
        icon_path = os.path.join(base_dir, "favicon.ico")
        if os.path.exists(icon_path):
            self.setWindowIcon(QIcon(icon_path))

        self.selected_file = None
        self.parsed_data = None
        self.db_url = os.environ.get("DATABASE_URL", "postgresql://...")
        self.check_cols_map = {}

        self.signals = WorkerSignals()
        self.signals.log_signal.connect(self.append_log)
        self.signals.done_signal.connect(self.on_parse_done)
        self.signals.push_done_signal.connect(self.on_push_done)

        self.setup_ui()

    def setup_ui(self):
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        layout = QVBoxLayout()
        main_widget.setLayout(layout)

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

        row2 = QHBoxLayout()
        row2.addWidget(QLabel("Dự án / Công thức tính lương:"))
        self.cbo_project = QComboBox()
        projects = FormulaRegistry.get_all_projects()
        if not projects:
            self.cbo_project.addItem("Chưa cài đặt Plugin nào!")
        else:
            self.cbo_project.addItems(projects)
            
        row2.addWidget(self.cbo_project)
        config_layout.addLayout(row2)

        row_period = QHBoxLayout()
        row_period.addWidget(QLabel("Kỳ lương tính toán:"))
        self.cbo_month = QComboBox()
        self.cbo_month.addItems([f"Tháng {i}" for i in range(1, 13)])
        
        import datetime
        current_date = datetime.datetime.now()
        self.cbo_month.setCurrentIndex(current_date.month - 1)
        
        self.txt_year = QLineEdit()
        self.txt_year.setText(str(current_date.year))
        self.txt_year.setFixedWidth(80)
        
        row_period.addWidget(self.cbo_month)
        row_period.addWidget(QLabel("Năm:"))
        row_period.addWidget(self.txt_year)
        row_period.addStretch()
        config_layout.addLayout(row_period)

        row3 = QHBoxLayout()
        row3.addWidget(QLabel("File Excel Bảng Lương:"))
        self.txt_file = QLineEdit()
        self.txt_file.setReadOnly(True)
        row3.addWidget(self.txt_file)

        self.btn_browse = QPushButton("Chọn File")
        self.btn_browse.clicked.connect(self.browse_file)
        row3.addWidget(self.btn_browse)
        config_layout.addLayout(row3)

        self.btn_parse = QPushButton("Bắt đầu bóc tách & Chuẩn hóa")
        self.btn_parse.setEnabled(False)
        self.btn_parse.clicked.connect(self.run_parse)
        self.btn_parse.setStyleSheet("background-color: #2b579a; color: white; font-weight: bold; padding: 8px;")
        config_layout.addWidget(self.btn_parse)

        config_group.setLayout(config_layout)
        layout.addWidget(config_group)
        
        # Double-check chuyên biệt hoá
        check_group = QGroupBox("Kiểm tra chéo nhanh (Định vị toạ độ Excel)")
        check_layout = QVBoxLayout()
        
        row_check1 = QHBoxLayout()
        row_check1.addWidget(QLabel("Nhân viên:"))
        self.cbo_emp_check = QComboBox()
        self.cbo_emp_check.setEnabled(False)
        row_check1.addWidget(self.cbo_emp_check)
        
        row_check1.addWidget(QLabel("Cột Excel (A, AA...):"))
        self.txt_col_check = QLineEdit()
        self.txt_col_check.setPlaceholderText("Ví dụ: Z, AA")
        self.txt_col_check.setEnabled(False)
        self.txt_col_check.setFixedWidth(100)
        row_check1.addWidget(self.txt_col_check)
        
        self.btn_run_check = QPushButton("Tra cứu nhanh")
        self.btn_run_check.setEnabled(False)
        self.btn_run_check.clicked.connect(self.run_double_check)
        row_check1.addWidget(self.btn_run_check)
        
        check_layout.addLayout(row_check1)
        
        row_check2 = QHBoxLayout()
        row_check2.addWidget(QLabel("Toạ độ Excel:"))
        self.txt_excel_cell = QLineEdit()
        self.txt_excel_cell.setReadOnly(True)
        self.txt_excel_cell.setStyleSheet("background-color: #f0f0f0; font-weight: bold; color: blue; font-size: 14px;")
        row_check2.addWidget(self.txt_excel_cell)
        
        row_check2.addWidget(QLabel("Giá trị phần mềm lấy:"))
        self.txt_parsed_value = QLineEdit()
        self.txt_parsed_value.setReadOnly(True)
        self.txt_parsed_value.setStyleSheet("background-color: #f0f0f0; font-weight: bold; color: green; font-size: 14px;")
        row_check2.addWidget(self.txt_parsed_value)
        
        check_layout.addLayout(row_check2)
        
        check_group.setLayout(check_layout)
        layout.addWidget(check_group)

        # Kết quả Preview
        preview_group = QGroupBox("Preview Dữ Liệu")
        preview_layout = QVBoxLayout()
        self.table_preview = QTableWidget()
        self.table_preview.setColumnCount(5)
        self.table_preview.setHorizontalHeaderLabels(["Mã Nhân Sự", "Họ Tên", "Dự Án", "Ngày Công", "Giờ Tăng Ca"])
        self.table_preview.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        preview_layout.addWidget(self.table_preview)

        self.btn_push = QPushButton("Push lên Database (HrP)")
        self.btn_push.setEnabled(False)
        self.btn_push.clicked.connect(self.run_push)
        self.btn_push.setStyleSheet("background-color: #00763a; color: white; font-weight: bold; padding: 10px;")
        preview_layout.addWidget(self.btn_push)

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
        
        self.progress_bar.setVisible(True)
        self.worker = ParseWorker(self.selected_file, project_name, period_month, period_year, self.signals)
        self.worker.start()

    def on_parse_done(self, data):
        self.btn_parse.setEnabled(True)
        self.progress_bar.setVisible(False)
        if not data:
            self.append_log("Lỗi: Không có dữ liệu preview!")
            return

        self.parsed_data = data
        self.btn_push.setEnabled(True)
        
        # Bật Double-check
        self.cbo_emp_check.setEnabled(True)
        self.txt_col_check.setEnabled(True)
        self.btn_run_check.setEnabled(True)
        
        # Nạp danh sách nhân viên
        self.cbo_emp_check.clear()
        for item in data:
            self.cbo_emp_check.addItem(f"{item.get('employeeCode')} - {item.get('fullName')}")
        
        # Đổ dữ liệu lên bảng
        self.table_preview.setRowCount(0)
        for i, item in enumerate(data):
            self.table_preview.insertRow(i)
            self.table_preview.setItem(i, 0, QTableWidgetItem(str(item.get("employeeCode", ""))))
            self.table_preview.setItem(i, 1, QTableWidgetItem(str(item.get("fullName", ""))))
            self.table_preview.setItem(i, 2, QTableWidgetItem(str(item.get("project", ""))))
            self.table_preview.setItem(i, 3, QTableWidgetItem(str(item.get("totalWorkDays", ""))))
            self.table_preview.setItem(i, 4, QTableWidgetItem(str(item.get("otHours", ""))))
            
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

    def run_push(self):
        reply = QMessageBox.question(self, 'Xác nhận', 'Bạn có chắc chắn muốn đẩy dữ liệu này lên Database?',
                                     QMessageBox.Yes | QMessageBox.No, QMessageBox.No)
        if reply == QMessageBox.No:
            return

        self.btn_push.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.append_log("--- BẮT ĐẦU PUSH LÊN DATABASE ---")
        
        self.worker_push = PushWorker(self.parsed_data, self.db_url, self.signals)
        self.worker_push.start()

    def on_push_done(self, success):
        self.btn_push.setEnabled(True)
        self.progress_bar.setVisible(False)
        if success:
            QMessageBox.information(self, "Thành công", "Đã push dữ liệu lên Neon DB thành công!")
            self.table_preview.setRowCount(0)
            self.parsed_data = None
            self.btn_push.setEnabled(False)
        else:
            QMessageBox.critical(self, "Lỗi", "Không thể push lên Database. Xem Log để biết chi tiết.")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
