"""
Actro salary formula — verified against LCNT7.xlsx (July 2026)

HR workbook columns (KS:LA):
  KS  : Lương giờ (HR SUMPRODUCT)
  KT  : Chuyên cần HR
  KU  : Phụ cấp soi kính  (chỉ khi loại công việc = "Soi kính")
  KV  : Phụ cấp đời sống
  KW  : Phụ cấp nhà ở  (INPUT)
  KX  : Thâm niên
  KY  : Thanh toán  = KS + SUM(KT:KX) = Lương giờ + Tổng phụ cấp
  KZ  : Trừ ứng     (INPUT)
  LA  : Thực nhận   = ROUNDDOWN(KY-KZ, -3)

Constants:
  BASE_SALARY   = 6,000,000 VND
  DAILY_RATE    = BASE / 26 = 230,769
  HOURLY_RATE   = DAILY / 8 = 28,846.15 VND
  DOI_SONG_MONTHLY  = 300,000 VND/tháng
  SOI_KINH_MONTHLY  = 450,000 VND/tháng
  Standard workdays  = 26 / tháng

Allowances (only KT:KX — no Suất ăn, KPI, Bù lương):
  KT  : Chuyên cần = IF(KL > 25, 400k, IF(KL >= 25, 200k, 0))
  KU  : Soi kính   = IF(loại="Soi kính", 450k/26xKL, 0)
  KV  : Đời sống   = 300k/26 x KL
  KW  : Nhà ở      = INPUT
  KX  : Thâm niên   = mức/26 x KL
"""
import unicodedata
import re
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


def _strip_accents(s: str) -> str:
    return ''.join(
        c for c in unicodedata.normalize('NFD', s)
        if unicodedata.category(c) != 'Mn'
    )


class ActroFormula(BaseFormula):

    BASE_SALARY          = 6_000_000.0
    DAILY_RATE           = BASE_SALARY / 26
    HOURLY_RATE          = DAILY_RATE / 8
    DOI_SONG_MONTHLY     = 300_000.0
    SOI_KINH_MONTHLY    = 450_000.0
    THAM_NIEN_DAYS_THRESHOLD = 90
    OT_SUN_FALLBACK_MULT = 1.5
    PAY_PERIOD_DAY       = DEFAULT_PAY_PERIOD_DAY

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
                "chuyen_can": {0: 400_000, 1: 200_000},
                "kpi": {0: 1_000_000, 1: 400_000},
            }
        }

    def calculate(self, raw_data: dict) -> dict:
        ot_kd = float(raw_data.get("ot_kd", 0) or 0)
        ot_ke = float(raw_data.get("ot_ke", 0) or 0)
        ot_kf = float(raw_data.get("ot_kf", 0) or 0)
        ot_kh = float(raw_data.get("ot_kh", 0) or 0)
        ot_ki = float(raw_data.get("ot_ki", 0) or 0)
        ot_kj = float(raw_data.get("ot_kj", 0) or 0)
        ot_kk = float(raw_data.get("ot_kk", 0) or 0)

        sumproduct = (
            ot_kd * 1.0 +
            ot_ke * 1.0 +
            ot_kf * 1.5 +
            ot_kh * 2.0 +
            ot_ki * 1.3 +
            ot_kj * 2.0 +
            ot_kk * 2.7
        )

        luong_hr = self.HOURLY_RATE * sumproduct
        cong_hc  = (ot_kd + ot_ke + ot_ki) / 8
        total_days = float(raw_data.get("total_days", cong_hc) or cong_hc)

        # KT : Chuyên cần HR — theo công HC / KL (không phải absent_days)
        chuyen_can = self._chuyen_can(total_days)

        # KU : Phụ cấp soi kính — chỉ khi loại công việc chứa "soi kính"
        work_type = str(raw_data.get("work_type") or "")
        soi_kinh  = self._soi_kinh(work_type, total_days)

        # KV : Phụ cấp đời sống
        doi_song  = round(self.DOI_SONG_MONTHLY / 26 * total_days)

        # KX : Thâm niên — prorate theo KL
        tham_nien = self._tham_nien(
            raw_data.get("start_date"),
            raw_data.get("period_start"),
            total_days,
        )

        # KW : Phụ cấp nhà ở — INPUT
        nha_o = float(raw_data.get("phu_cap_nha_o", 0) or 0)

        allowance_items = [
            {"name": "Chuyên cần HR",     "qty": total_days, "rate": None,
             "total": chuyen_can},
            {"name": "Phụ cấp soi kính", "qty": total_days,
             "rate": self.SOI_KINH_MONTHLY / 26,
             "total": soi_kinh},
            {"name": "Phụ cấp đời sống", "qty": total_days,
             "rate": self.DOI_SONG_MONTHLY / 26,
             "total": doi_song},
            {"name": "Phụ cấp nhà ở",    "qty": None, "rate": None,
             "total": nha_o},
            {"name": "Phụ cấp thâm niên", "qty": total_days, "rate": None,
             "total": tham_nien},
        ]
        total_allowance = sum(i["total"] for i in allowance_items)

        # KY : Thanh toan = SUM(KS:KX) = Lương giờ + Tổng phụ cấp
        thanh_toan = luong_hr + total_allowance

        # KZ : Trừ ứng — INPUT
        tru_ung = float(raw_data.get("tru_ung", 0) or 0)
        deduction_items = [
            {"name": "Trừ ứng lương", "qty": None, "rate": None, "total": tru_ung},
        ]
        total_deduction = tru_ung

        # LA : Thực nhận = ROUNDDOWN(KY - KZ, -3)
        # ROUNDDOWN(x, -3): floor về bội số 1000 gần nhất về phía 0
        net_income = thanh_toan - total_deduction
        net_income_rounded = int(net_income // 1000) * 1000  # always floor
        rounding_delta = net_income_rounded - net_income

        return {
            "salaryItems": [
                {"name": "Lương giờ (HR SUMPRODUCT)",
                 "qty": sumproduct, "rate": self.HOURLY_RATE,
                 "total": luong_hr},
            ],
            "allowances": allowance_items,
            "deductions": deduction_items,
            "summary": {
                "salaryNormal": luong_hr,
                "thanhToan": thanh_toan,
                "totalDeduction": total_deduction,
                "netIncome": net_income_rounded,
                "roundingDelta": rounding_delta,
                "_note": (
                    "KT:Chuyên cần=IF(KL>25,400k,IF(KL>24,200k,0)). "
                    "KU:Soi kính=IF(loại='Soi kính',450k/26xKL,0). "
                    "KV:Đời sống=300k/26xKL. "
                    "KX:Thâm niên=mức/26xKL. "
                    "KY=SUM(KT:KX). LA=ROUNDDOWN(KY-KZ,-3)."
                ),
                "_cong_hc": cong_hc,
                "_sumproduct": sumproduct,
                "_holidays": raw_data.get("holidays", []),
            }
        }

    def _chuyen_can(self, total_workdays: float) -> float:
        # LCNT7.xlsx: IF(KL>25, 400000, IF(KL>24, 200000, 0))
        # Ví dụ:
        #   KL=25.875 → 400000 (25.875 > 25)
        #   KL=25.000 → 200000 (25 > 25 là FALSE, nhưng 25 > 24 là TRUE)
        #   KL=24.937 → 200000 (24.937 > 24)
        #   KL=24.000 → 0     (24 > 24 là FALSE, 24 > 24 là FALSE)
        if total_workdays > 25:
            return 400_000.0
        if total_workdays > 24:
            return 200_000.0
        return 0.0

    def _soi_kinh(self, work_type: str, total_workdays: float) -> float:
        import math
        bare = _strip_accents(work_type.casefold())
        # "Không soi kính" → không có phụ cấp
        # "Soi kính" → có phụ cấp 450k/26 x KL (Excel FLOOR = luôn làm tròn xuống)
        if "khong" in bare and "soi kinh" in bare:
            return 0.0  # "Không soi kính" = no allowance
        if "khong" in bare:
            return 0.0
        if "soi kinh" not in bare:
            return 0.0
        return math.floor(self.SOI_KINH_MONTHLY / 26 * total_workdays)

    def _tham_nien(
        self,
        start_date: str | None,
        period_start: str | None = None,
        total_workdays: float = 0.0,
    ) -> float:
        if not start_date:
            return 0.0
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return 0.0

        if period_start:
            try:
                reference_date = datetime.strptime(period_start, "%Y-%m-%d").date()
            except (ValueError, TypeError):
                reference_date = date.today()
        else:
            reference_date = date.today()

        seniority_days = (reference_date - start).days
        if seniority_days < self.THAM_NIEN_DAYS_THRESHOLD:
            return 0.0

        months = seniority_days / 30.0
        if months >= 12:
            monthly = 600_000.0
        elif months >= 6:
            monthly = 400_000.0
        else:
            monthly = 200_000.0

        return round(monthly / 26 * total_workdays)
