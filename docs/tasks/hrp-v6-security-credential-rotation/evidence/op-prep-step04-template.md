# STEP-04 runbook verification record

STEP-04 is Tier 2 static/tabletop verification under TASK v1.2; it is not an Owner credential mutation step.

Canonical evidence: `evidence/ac08-runbook.txt`.

Required checks:
- incident timeline section exists;
- ordered state machine exists;
- smoke matrix exists;
- rollback/recovery exists;
- masked evidence format exists;
- no credential, endpoint, DSN, environment value, or reversible identifier appears;
- expired maintenance windows are not reused.

Production actions remain Owner/OP-only and are not performed from this template.
