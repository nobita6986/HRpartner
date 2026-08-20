from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


BLOCKING_ERROR_MESSAGE = "Không thể thực hiện khi còn nhân viên có lỗi dữ liệu."


def make_governance_event(
    *,
    action: str,
    actor: str,
    reason: str,
    source: str = "human",
) -> dict[str, str]:
    """Create an auditable human decision event for any payroll plugin."""
    normalized_actor = actor.strip()
    normalized_reason = reason.strip()
    if not normalized_actor:
        raise ValueError("Thiếu người thực hiện.")
    if not normalized_reason:
        raise ValueError("Thiếu lý do xác nhận.")
    if source != "human":
        raise ValueError("Chỉ quyết định đã được con người xác nhận mới được ghi nhận.")

    return {
        "action": action,
        "actor": normalized_actor,
        "reason": normalized_reason,
        "source": source,
        "recordedAt": datetime.now(timezone.utc).isoformat(),
    }


def append_governance_event(record: dict[str, Any], event: dict[str, str]) -> None:
    """Attach review evidence without changing a plugin's calculation inputs."""
    trace = record.setdefault("governanceTrace", [])
    trace.append(event)

    payroll_data = record.get("payrollData")
    if isinstance(payroll_data, dict):
        governance = payroll_data.setdefault("governance", {})
        governance["events"] = list(trace)


def validate_publish_records(records: list[dict[str, Any]]) -> None:
    """Block shared publish/export actions when any selected record is invalid."""
    if not records:
        raise ValueError("Không có bản ghi nào để thực hiện.")

    invalid = [
        f"{record.get('employeeCode', 'Không rõ mã')} ({record.get('errorMsg', 'Lỗi dữ liệu')})"
        for record in records
        if record.get("hasError")
    ]
    if invalid:
        raise ValueError(f"{BLOCKING_ERROR_MESSAGE} {'; '.join(invalid)}")
