# STEP-06 Owner/OP revoke evidence template — masked

> Owner/OP only. Run only after STEP-05 is SMOKE_GREEN. Never include a password, credential fragment, DSN, endpoint, environment value, cookie, token, or request data.

## Precondition

- STEP-05 status: `SMOKE_GREEN | NOT_GREEN`
- if NOT_GREEN: STOP

## Revoke sequence

| Event | UTC timestamp | Result |
|---|---|---|
| old credential revoked/reset | `<utc>` | pass/fail |
| old credential negative probe | `<utc>` | expected authentication failure |
| new credential positive probe | `<utc>` | expected pass |
| sanitized helper with new credential | `<utc>` | expected exit 0 |

## Safe identifiers

- approved role label or role fingerprint: `<non-secret>`
- target fingerprint (8 chars): `<sha256 prefix>`
- old credential fingerprint (8 chars): `<sha256 prefix>`
- new credential fingerprint (8 chars): `<sha256 prefix>`

## Stop and rollback

- old credential still works: STOP and investigate;
- new credential fails: STOP and restore the last known-good deployment while preserving evidence masking;
- production smoke fails: STOP and follow the runbook recovery matrix.

Store only timestamps, non-reversible fingerprints, posture, exit status, and pass/fail.
