from abc import ABC, abstractmethod

class BaseFormula(ABC):
    """
    Base class cho tất cả các Plugin tính lương.
    Bất kỳ công ty/dự án nào mới cũng cần tạo 1 class kế thừa từ BaseFormula
    và override hàm `calculate`.
    """
    
    @property
    @abstractmethod
    def project_name(self) -> str:
        """Tên dự án hiển thị trên UI (Ví dụ: 'Nhà máy Actro')"""
        pass

    @abstractmethod
    def calculate(self, raw_data: dict) -> dict:
        """
        Thực hiện tính toán lương.
        
        Args:
            raw_data (dict): Dữ liệu thô bóc tách từ Excel (VD: tổng ngày, tổng giờ OT, lương cơ bản...)
            
        Returns:
            dict: Cấu trúc JSON `payrollData` theo đúng chuẩn
        """
        pass
        
    def get_check_columns(self) -> dict:
        """
        Định nghĩa danh sách các Cột Tiêu Biểu (Double-check) dành riêng cho Dự án này.
        Returns:
            dict: Key là tên hiển thị trên UI (Ví dụ "Giờ OT 150%"), Value là key tương ứng trong raw_data.
        """
        return {
            "Tổng ngày công": "total_days",
            "Tổng Lương Thực Lãnh": "net_income"
        }

    def create_payroll_item(self, name: str, qty: float, rate: float) -> dict:
        """Hàm Helper để tạo ra 1 dòng lương chuẩn"""
        total = 0
        if qty is not None and rate is not None:
            total = qty * rate
            
        return {
            "name": name,
            "qty": qty,
            "rate": rate,
            "total": total
        }
