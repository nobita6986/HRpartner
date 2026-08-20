"""
Project Configuration - Actro
Lưu trữ các cấu hình riêng cho từng dự án:
- Kỳ tính lương (ngày chốt)
- Danh sách ngày lễ (override được mỗi kỳ)
- Các hệ số OT đặc biệt
"""

# Ngày chốt lương mặc định (Actro: ngày 25)
DEFAULT_PAY_PERIOD_DAY = 25

# Các ngày lễ chính thức Việt Nam (YYYY-MM-DD)
# Đây là danh sách mặc định, có thể override theo từng kỳ
VIETNAM_OFFICIAL_HOLIDAYS = [
    "2026-01-01",  # Tết Dương lịch
    "2026-01-28",  # Tết Nguyên đán (ngày mùng 1)
    "2026-01-29",  # Tết Nguyên đán (ngày mùng 2)
    "2026-01-30",  # Tết Nguyên đán (ngày mùng 3)
    "2026-01-31",  # Tết Nguyên đán (ngày mùng 4)
    "2026-02-01",  # Tết Nguyên đán (ngày mùng 5)
    "2026-04-30",  # Ngày Giải phóng miền Nam
    "2026-05-01",  # Ngày Quốc tế Lao động
    "2026-09-02",  # Ngày Quốc khánh
    "2026-09-03",  # Ngày Quốc khánh (nghỉ bù)
    "2026-10-20",  # Ngày Phụ nữ Việt Nam
    "2026-11-20",  # Ngày Nhà giáo Việt Nam
]

# Ngày lễ công ty Actro (nếu có)
# Để trống list này nếu không có ngày lễ công ty
COMPANY_HOLIDAYS = [
    # "2026-02-10",  # VD: Ngày thành lập công ty
]

def get_holidays_for_period(year: int, month: int, override_list: list = None) -> list:
    """
    Lấy danh sách ngày lễ cho một kỳ tính lương cụ thể.
    
    Args:
        year: Năm (VD: 2026)
        month: Tháng (1-12)
        override_list: Danh sách ngày override (từ user), format "YYYY-MM-DD"
    
    Returns:
        List các ngày lễ trong tháng đó, format "YYYY-MM-DD"
    """
    all_holidays = set(VIETNAM_OFFICIAL_HOLIDAYS + COMPANY_HOLIDAYS)
    
    # Thêm các ngày override nếu có
    if override_list:
        for d in override_list:
            if d:  # Bỏ qua empty string
                all_holidays.add(d)
    
    # Filter theo tháng/năm
    month_prefix = f"{year:04d}-{month:02d}-"
    return sorted([h for h in all_holidays if h.startswith(month_prefix)])


def is_sunday_or_holiday(date_str: str, holidays: list = None) -> tuple:
    """
    Kiểm tra xem một ngày có phải Chủ Nhật hoặc Ngày Lễ không.
    
    Args:
        date_str: Ngày format "YYYY-MM-DD" hoặc "DD/MM/YYYY"
        holidays: Danh sách ngày lễ
    
    Returns:
        (is_weekend: bool, is_holiday: bool, day_type: str)
        day_type: "sunday", "holiday", "sunday_holiday", "weekday"
    """
    import datetime
    
    # Parse date
    if isinstance(date_str, datetime.date):
        d = date_str
    elif "-" in date_str:
        parts = date_str.split("-")
        d = datetime.date(int(parts[0]), int(parts[1]), int(parts[2]))
    elif "/" in date_str:
        parts = date_str.split("/")
        d = datetime.date(int(parts[2]), int(parts[1]), int(parts[0]))
    else:
        return False, False, "unknown"
    
    # Check Sunday
    is_sunday = d.weekday() == 6
    
    # Check holiday
    date_str_iso = d.strftime("%Y-%m-%d")
    is_holiday = holidays and date_str_iso in holidays
    
    # Determine day type
    if is_sunday and is_holiday:
        return True, True, "sunday_holiday"
    elif is_sunday:
        return True, False, "sunday"
    elif is_holiday:
        return False, True, "holiday"
    else:
        return False, False, "weekday"


def get_ot_multiplier(day_type: str, shift_type: str = None) -> float:
    """
    Lấy hệ số nhân OT dựa trên loại ngày và ca làm việc.
    
    Args:
        day_type: "weekday", "sunday", "holiday", "sunday_holiday"
        shift_type: "day", "night", None
    
    Returns:
        Hệ số nhân OT (1.0 = 100%)
    """
    multipliers = {
        "weekday": {
            "day": 1.5,      # OT ban ngày ngày thường
            "night": 2.0,    # OT đêm ngày thường  
            None: 1.5,       # Default
        },
        "sunday": {
            "day": 2.0,      # OT ban ngày CN
            "night": 2.7,    # OT đêm CN
            None: 2.0,       # Default
        },
        "holiday": {
            "day": 3.0,      # OT ban ngày lễ
            "night": 3.9,    # OT đêm lễ (300% * 1.3)
            None: 3.0,       # Default
        },
        "sunday_holiday": {
            "day": 3.0,      # CN lễ = 300%
            "night": 3.9,
            None: 3.0,
        },
    }
    
    return multipliers.get(day_type, multipliers["weekday"]).get(shift_type, 1.5)
