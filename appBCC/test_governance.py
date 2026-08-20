import unittest

from governance import (
    append_governance_event,
    make_governance_event,
    validate_publish_records,
)


class GovernanceTests(unittest.TestCase):
    def test_human_event_requires_actor_and_reason(self):
        with self.assertRaisesRegex(ValueError, "Thiếu người thực hiện"):
            make_governance_event(action="mapping_review", actor="", reason="Reviewed")

        with self.assertRaisesRegex(ValueError, "Thiếu lý do"):
            make_governance_event(action="mapping_review", actor="Payroll", reason="")

    def test_event_is_traced_without_changing_calculation(self):
        record = {
            "employeeCode": "E001",
            "payrollData": {"summary": {"netIncome": 1_000_000}},
        }
        event = make_governance_event(
            action="publish_review",
            actor="Payroll",
            reason="Reviewed before publishing",
        )

        append_governance_event(record, event)

        self.assertEqual(record["payrollData"]["summary"]["netIncome"], 1_000_000)
        self.assertEqual(record["governanceTrace"], [event])
        self.assertEqual(record["payrollData"]["governance"]["events"], [event])

    def test_publish_rejects_blocking_record(self):
        with self.assertRaisesRegex(ValueError, "E002"):
            validate_publish_records(
                [{"employeeCode": "E002", "hasError": True, "errorMsg": "Invalid BCC"}]
            )

    def test_publish_accepts_valid_records(self):
        validate_publish_records([{"employeeCode": "E003", "hasError": False}])


if __name__ == "__main__":
    unittest.main()
