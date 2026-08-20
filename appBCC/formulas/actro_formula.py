"""
Actro salary formula — verified by running core_pipeline on BCCActroT7.xlsx (July 2026)

Constants:
  BASE_SALARY  = 6,000,000 VND
  DAILY_RATE   = BASE / 26 = 230,769
  HOURLY_RATE  = BASE / 26 / 8 = 28,846.15...
  DONGIA_DS    = DAILY_RATE / 20 = 11,538.46 per unit (= 1 working day)
  SUAT_AN      = 25,000 VND/ngày

OT Formula (reverse-engineered from LCNT7):
  LƯƠNG = BASE
           + ot_day × HR × 1.5
           + ot_night × HR × 2.0
           + ot_sunday × HR × ???  ← NOT constant; varies per employee

  Source of OT values (from BCC summary cols, confirmed match LCNT7):
    ot_day     : BCC col 291 / LCNT7 col 291
    ot_night   : BCC col 293 / LCNT7 col 293
    ot_sunday  : BCC col 295 / LCNT7 col 295

  IMPORTANT: The Sunday OT multiplier cannot be derived as a constant from LCNT7
  (implied multiplier varies 8.8×–25.6×). Import from HR file if available.
  If not, use fallback: ot_sunday × HR × 1.5 (conservative estimate).

Allowances (verified against LCNT7):
  - Chuyên cần: 400,000 if 0 absent, 200,000 if 1 absent, 0 otherwise
  - Phụ cấp đời sống: total_days × DONGIA_DS  ✓ exact match
  - Thâm niên: working_days/30 × DAILY_RATE, min 90 days, capped at 400,000 ✓
  - Suất ăn: total_days × 25,000
  - KPI: 1,000,000 if 0 absent, 400,000 if 1 absent
  - Nhà ở, Trừ ứng, Bù lương: import from HR file or 0

Deductions:
Holiday Handling:
  - Ngày lễ có 2 phương án: nghỉ (không ảnh hưởng chuyên cần) hoặc đi làm (tính OT lễ)
  - OT lễ: 300% ngày thường, 390% nếu kèm ca đêm
  - Config theo từng kỳ (override được)
"""
from datetime import date, datetime
from formulas.base_formula import BaseFormula
from formulas.actro_config import (
    VIETNAM_OFFICIAL_HOLIDAYS,
    COMPANY_HOLIDAYS,
    get_holidays_for_period,
    is_sunday_or_holiday,
    get_ot_multiplier,
    DEFAULT_PAY_PERIOD_DAY,
)


class ActroFormula(BaseFormula):

    BASE_SALARY     = 6_000_000.0
    DAILY_RATE      = BASE_SALARY / 26
    HOURLY_RATE     = DAILY_RATE / 8
    DONGIA_DS       = DAILY_RATE / 20   # 11,538.46 per unit
    SUAT_AN         = 25_000.0
    MIN_THAM_NIEN   = 0.0
    MAX_THAM_NIEN   = 400_000.0
    THAM_NIEN_DAYS_THRESHOLD = 90   # = 3 months
    OT_SUN_FALLBACK_MULT = 1.5     # fallback until confirmed
    PAY_PERIOD_DAY  = DEFAULT_PAY_PERIOD_DAY  # Ngày 25

    @property
    def project_name(self) -> str:
        return "Nhà máy Actro - Vĩnh Phúc"

    def get_check_columns(self) -> dict:
        return {
            "Tổng ngày công (Ngày)": "total_days",
            "Giờ OT ban ngày (Giờ)": "ot_day",
            "Giờ OT đêm (Giờ)": "ot_night",
            "Giờ OT chủ nhật (Giờ)": "ot_sunday",
            "Giờ OT ngày lễ (Giờ)": "ot_holiday",
            "Ngày vắng (Ngày)": "absent_days",
            "Ngày vào": "start_date",
        }

    def get_config(self, year: int = None, month: int = None, holiday_overrides: list = None) -> dict:
        """
        Lấy cấu hình cho dự án.
        
        Args:
            year: Năm tính lương
            month: Tháng tính lương
            holiday_overrides: Danh sách ngày lễ override (format "YYYY-MM-DD")
        
        Returns:
            Dict chứa cấu hình:
            - pay_period_day: ngày chốt lương
            - holidays: danh sách ngày lễ trong kỳ
            - holiday_multipliers: dict hệ số OT theo loại ngày
        """
        holidays = []
        if year and month:
            holidays = get_holidays_for_period(year, month, holiday_overrides)
        
        return {
            "pay_period_day": self.PAY_PERIOD_DAY,
            "holidays": holidays,
            "holiday_multipliers": {
                "weekday_day": 1.5,
                "weekday_night": 2.0,
                "sunday_day": 2.0,
                "sunday_night": 2.7,
                "holiday_day": 3.0,
                "holiday_night": 3.9,
            },
            "absent_penalty_multipliers": {
                "chuyen_can": {0: 400_000, 1: 200_000},  # absent_days -> tiền
                "kpi": {0: 1_000_000, 1: 400_000},
            }
        }

    def calculate(self, raw_data: dict) -> dict:
        """
        Full salary calculation for Actro - HR Formula.
        
        IMPORTANT: HR uses SUMPRODUCT formula:
          LƯƠNG = LCB/giờ × (KD×1 + KE×1 + KF×1.5 + KH×2 + KI×1.3 + KJ×2 + KK×2.7)
        
        Where:
          LCB/giờ = 6,000,000 / 26 / 8 = 28,846.15 VND
          KD = giờ ban ngày (×1.0)
          KE = ? (×1.0)
          KF = OT ngày (×1.5)
          KH = OT đêm (×2.0)
          KI = OT ngày (×1.3) - dùng trong CÔNG HC
          KJ = OT CN (×2.0)
          KK = ? (×2.7)
        
        CÔNG HC = (KD + KE + KI) / 8
        
        Required raw_data keys (from BCC summary columns):
          - ot_kd: KD value (số giờ ban ngày)
          - ot_ke: KE value (?)
          - ot_kf: KF value (OT ngày × 1.5 trong SUMPRODUCT)
          - ot_kh: KH value (OT đêm × 2.0 trong SUMPRODUCT)
          - ot_ki: KI value (OT ngày × 1.3 trong SUMPRODUCT)
          - ot_kj: KJ value (OT CN × 2.0 trong SUMPRODUCT)
          - ot_kk: KK value (? × 2.7 trong SUMPRODUCT)
        
        Legacy keys (for backward compatibility):
          - total_days: dùng cho tính phụ cấp đời sống
          - absent_days: số ngày nghỉ
          - start_date: ngày vào (tính thâm niên)
          - period_end: ngày cuối kỳ
        """
        # Đọc từ summary columns (BCC columns 289-297 = KC-KK)
        ot_kd = float(raw_data.get("ot_kd", 0) or 0)
        ot_ke = float(raw_data.get("ot_ke", 0) or 0)
        ot_kf = float(raw_data.get("ot_kf", 0) or 0)  # OT ngày (×1.5)
        ot_kh = float(raw_data.get("ot_kh", 0) or 0)  # OT đêm (×2.0)
        ot_ki = float(raw_data.get("ot_ki", 0) or 0)  # OT ngày (×1.3)
        ot_kj = float(raw_data.get("ot_kj", 0) or 0)  # OT CN (×2.0)
        ot_kk = float(raw_data.get("ot_kk", 0) or 0)  # ? (×2.7)
        
        # Tính SUMPRODUCT theo công thức HR
        sumproduct = (
            ot_kd * 1.0 +
            ot_ke * 1.0 +
            ot_kf * 1.5 +
            ot_kh * 2.0 +
            ot_ki * 1.3 +
            ot_kj * 2.0 +
            ot_kk * 2.7
        )
        
        # LƯƠNG = LCB/giờ × SUMPRODUCT
        luong_hr = self.HOURLY_RATE * sumproduct
        
        # CÔNG HC = (KD + KE + KI) / 8
        cong_hc = (ot_kd + ot_ke + ot_ki) / 8
        
        # Các giá trị khác
        total_days = float(raw_data.get("total_days", cong_hc) or cong_hc)
        absent_days = int(raw_data.get("absent_days", 0) or 0)
        
        # ── Phần A: Lương (HR Formula) ────────────────────────────────────
        salary_normal = luong_hr
        salary_ot = 0  # Đã bao gồm trong luong_hr
        
        # ── Phần B: Phụ cấp ──────────────────────────────────────────────
        chuyen_can = self._chuyen_can(absent_days)
        doi_song   = round(total_days * self.DONGIA_DS)
        tham_nien  = self._tham_nien(
            raw_data.get("start_date"),
            raw_data.get("period_end")
        )
        suat_an    = round(total_days * self.SUAT_AN)
        kpi        = self._kpi(absent_days)
        nha_o      = float(raw_data.get("phu_cap_nha_o", 0) or 0)
        bu_luong   = float(raw_data.get("bu_luong", 0) or 0)
        soi_kinh   = float(raw_data.get("soi_kinh", 0) or 0)

        allowance_items = [
            {"name": "Thưởng chuyên cần", "qty": None, "rate": None, "total": chuyen_can},
            {"name": "Phụ cấp đời sống",  "qty": total_days, "rate": self.DONGIA_DS, "total": doi_song},
            {"name": "Phụ cấp thâm niên",  "qty": None, "rate": None, "total": tham_nien},
            {"name": "Phụ cấp suất ăn",    "qty": total_days, "rate": self.SUAT_AN, "total": suat_an},
            {"name": "Thưởng KPI",          "qty": None, "rate": None, "total": kpi},
            {"name": "Phụ cấp soi kính",   "qty": None, "rate": None, "total": soi_kinh},
            {"name": "Phụ cấp nhà ở",     "qty": None, "rate": None, "total": nha_o},
            {"name": "Bù lương",            "qty": None, "rate": None, "total": bu_luong},
        ]
        total_allowance = sum(i["total"] for i in allowance_items)

        # ── Phần C: Gross ─────────────────────────────────────────────────
        gross_income = salary_normal + total_allowance

        # ── Phần D: Khấu trừ ─────────────────────────────────────────────
        tru_ung  = float(raw_data.get("tru_ung", 0) or 0)
        deduction_items = [
            {"name": "Trừ ứng lương", "qty": None, "rate": None, "total": tru_ung},
        ]
        total_deduction = sum(i["total"] for i in deduction_items)
        net_income = gross_income - total_deduction

        return {
            "salaryItems": [
                {"name": "Lương (HR SUMPRODUCT)",
                 "qty": sumproduct, "rate": self.HOURLY_RATE,
                 "total": salary_normal},
                {"name": f"OT ngày (KF={ot_kf}h × 1.5)",
                 "qty": ot_kf, "rate": self.HOURLY_RATE * 1.5,
                 "total": ot_kf * self.HOURLY_RATE * 1.5},
                {"name": f"OT đêm (KH={ot_kh}h × 2.0)",
                 "qty": ot_kh, "rate": self.HOURLY_RATE * 2.0,
                 "total": ot_kh * self.HOURLY_RATE * 2.0},
                {"name": f"OT CN (KJ={ot_kj}h × 2.0)",
                 "qty": ot_kj, "rate": self.HOURLY_RATE * 2.0,
                 "total": ot_kj * self.HOURLY_RATE * 2.0},
            ],
            "allowances": allowance_items,
            "deductions": deduction_items,
            "summary": {
                "totalSalary": round(salary_normal),
                "salaryNormal": salary_normal,
                "salaryOT": round(salary_ot),
                "totalAllowance": round(total_allowance),
                "grossIncome": round(gross_income),
                "totalDeduction": round(total_deduction),
                "netIncome": round(net_income),
                "_note": (
                    "LƯƠNG = LCB/giờ × (KD×1 + KE×1 + KF×1.5 + KH×2 + KI×1.3 + KJ×2 + KK×2.7). "
                    "CÔNG HC = (KD + KE + KI) / 8. "
                    "Đời sống = total_days × 11,538.46. "
                    "Thâm niên = working_days/30 × DAILY_RATE, cap 400k."
                ),
                "_sumproduct": sumproduct,
                "_cong_hc": cong_hc,
                "_holidays": raw_data.get("holidays", []),
            }
        }

    def _chuyen_can(self, absent: int) -> float:
        if absent == 0: return 400_000.0
        if absent == 1: return 200_000.0
        return 0.0

    def _kpi(self, absent: int) -> float:
        if absent == 0: return 1_000_000.0
        if absent == 1: return 400_000.0
        return 0.0

    def _tham_nien(self, start_date: str | None, period_end: str | None = None) -> float:
        """
        Thâm niên = working_days / 30 × DAILY_RATE.
        Minimum 90 working days (3 months), capped at 400,000 VND.

        Formula verified against LCNT7.xlsx (July 2026) where
        Thâm niên ≈ cong_hc_days / 30 × 230,769.
        Cap at 400,000 (≈ 52 months × DAILY_RATE).
        """
        if not start_date:
            return 0.0
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return 0.0

        if period_end:
            try:
                end = datetime.strptime(period_end, "%Y-%m-%d").date()
            except (ValueError, TypeError):
                end = date.today()
        else:
            end = date.today()

        working_days = (end - start).days
        if working_days < self.THAM_NIEN_DAYS_THRESHOLD:
            return 0.0

        # Formula: working_days/30 × DAILY_RATE
        months = working_days / 30.0
        amount = round(months * self.DAILY_RATE)
        return min(amount, self.MAX_THAM_NIEN)
