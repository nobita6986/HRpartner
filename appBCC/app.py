import sys
import os
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                               QHBoxLayout, QPushButton, QLabel, QLineEdit, 
                               QFileDialog, QTextEdit, QMessageBox, QGroupBox,
                               QTableWidget, QTableWidgetItem, QHeaderView, QComboBox, QProgressBar)
from PySide6.QtCore import Qt, Signal, QObject, QThread
from PySide6.QtGui import QColor
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")

from core_pipeline import preview_file, push_to_db
from formulas.formula_registry import FormulaRegistry

class WorkerSignals(QObject):
    log_signal = Signal(str)
    done_signal = Signal(object)
    push_done_signal = Signal(bool)

class ParseWorker(QThread):
    def __init__(self, file_path, project_name, signals):
        super().__init__()
        self.file_path = file_path
        self.project_name = project_name
        self.signals = signals

    def run(self):
        def logger(msg):
            self.signals.log_signal.emit(msg)
            
        data = preview_file(self.file_path, self.project_name, logger)
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
        
        row_check1.addWidget(QLabel("Cột cần kiểm tra:"))
        self.cbo_attr_check = QComboBox()
        self.cbo_attr_check.setEnabled(False)
        row_check1.addWidget(self.cbo_attr_check)
        
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
            
        self.btn_parse.setEnabled(False)
        self.btn_push.setEnabled(False)
        
        # Khoá check
        self.cbo_emp_check.setEnabled(False)
        self.cbo_attr_check.setEnabled(False)
        self.btn_run_check.setEnabled(False)
        self.txt_excel_cell.clear()
        self.txt_parsed_value.clear()
        
        self.txt_log.clear()
        self.append_log("--- BẮT ĐẦU PHÂN TÍCH ---")
        
        self.progress_bar.setVisible(True)
        self.worker = ParseWorker(self.selected_file, project_name, self.signals)
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
        self.cbo_attr_check.setEnabled(True)
        self.btn_run_check.setEnabled(True)
        
        # Nạp danh sách nhân viên
        self.cbo_emp_check.clear()
        for item in data:
            self.cbo_emp_check.addItem(f"{item.get('employeeCode')} - {item.get('fullName')}")
            
        # Nạp cột tiêu biểu của dự án
        self.cbo_attr_check.clear()
        project_name = self.cbo_project.currentText()
        formula_engine = FormulaRegistry.get_formula(project_name)
        if formula_engine and hasattr(formula_engine, 'get_check_columns'):
            self.check_cols_map = formula_engine.get_check_columns()
            self.cbo_attr_check.addItems(list(self.check_cols_map.keys()))
        
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
        attr_display = self.cbo_attr_check.currentText()
        raw_key = self.check_cols_map.get(attr_display)
        
        trace_map = employee.get("traceMap", {})
        if raw_key in trace_map:
            cell = trace_map[raw_key]["cell"]
            val = trace_map[raw_key]["value"]
            self.txt_excel_cell.setText(cell)
            self.txt_parsed_value.setText(str(val))
            self.append_log(f"[Kiểm tra] {employee.get('employeeCode')} | {attr_display} -> Excel: {cell}, Value: {val}")
        else:
            # Special keys like net_income that aren't directly in traceMap
            if raw_key == "net_income":
                val = employee.get("totalIncome", 0)
                self.txt_excel_cell.setText("(Tính toán bởi Formula)")
                self.txt_parsed_value.setText(str(val))
            else:
                self.txt_excel_cell.setText("Không tìm thấy toạ độ")
                self.txt_parsed_value.setText("N/A")

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
