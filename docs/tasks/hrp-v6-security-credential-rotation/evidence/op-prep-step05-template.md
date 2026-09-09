# STEP-05 Owner/OP evidence template — masked

> Owner/OP only. Do not include passwords, credential fragments, DSNs, endpoints, environment values, cookies, tokens, or request data.

## Preconditions

- current approved maintenance window: `<approval reference only>`
- restore point checked: `yes | no`
- old credential state by out-of-band fingerprint: `ACTIVE | ALREADY_REVOKED | UNKNOWN`
- if UNKNOWN or window not approved: STOP

## State transitions

| State | UTC timestamp | Result |
|---|---|---|
| NEW_CREATED | `<utc>` | pass/fail |
| NEW_VERIFIED | `<utc>` | pass/fail |
| DEPLOYED | `<utc>` | pass/fail |
| SMOKE_GREEN | `<utc>` | pass/fail |

## Masked posture

- approved role label or role fingerprint: `<non-secret>`
- target fingerprint (8 chars): `<sha256 prefix>`
- new credential fingerprint (8 chars): `<sha256 prefix>`
- BYPASSRLS: `no`
- NOSUPERUSER: `yes`
- LOGIN: `yes`

## Smoke

- sanitized helper with canonical secret source: `pass | fail`
- production route matrix: `pass | fail`
- output contains no secret: `yes | no`

If any check fails, do not revoke the old credential. Record only state, timestamps, fingerprints, and pass/fail.
