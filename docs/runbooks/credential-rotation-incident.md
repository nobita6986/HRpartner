# Runbook: Credential Rotation Incident — repository credential exposure

> **Audience:** Owner/OP executing STEP-05/06 of `hrp-v6-security-credential-rotation`.
> Tier 2 KHÔNG có quyền mutate Neon; Owner chỉ chạy các bước production trong maintenance window được phê duyệt.
>
> **State machine cho owner-role credential:** `NEW_CREATED → NEW_VERIFIED → DEPLOYED → SMOKE_GREEN → OLD_REVOKED`. Cấm nhảy thẳng từ `created` sang `revoked`. Cấm chạy hai OP step đồng thời.

## 0. Phạm vi và tên

- **Role:** owner role được TASK chỉ định; không đổi sang runtime role khác.
- **Target:** endpoint/database production do Owner xác minh ngoài evidence; không ghi hostname hoặc DSN vào artifact.
- **Old credential identity:** chỉ dùng fingerprint SHA-256 không đảo ngược do Owner/Tier 3 giữ; không ghi raw value hoặc fragment có thể dùng xác thực.
- **New credential:** Owner-generated; KHÔNG ghi value vào bất kỳ evidence/commit nào.
- **Project đang phục vụ production:** Owner xác minh trong dashboard; evidence chỉ ghi project fingerprint hoặc approved label.
- **Maintenance window:** dùng cửa sổ hiện hành được Owner phê duyệt; nếu cửa sổ trong TASK đã qua thì phải có phê duyệt mới trước khi thao tác.
- **Restore point/PITR:** Owner xác minh ngay trước execution; bằng chứng chỉ ghi retention và timestamp.

## 1. Incident timeline và pre-flight (Owner)

| Check | Command (key/path-only) | Expected |
|---|---|---|
| Incident timeline | Ghi thời điểm phát hiện, sanitize/untrack, rotate, deploy, smoke và revoke bằng UTC | Các mốc theo đúng state machine, không có secret |
| Old credential state | Neon dashboard → target role; so sánh fingerprint ngoài artifact | `ACTIVE` hoặc `ALREADY_REVOKED` |
| PITR/restore point | Dashboard hoặc safe metadata probe | restore point nằm trong retention window |
| `check_rls.cjs` untracked in repo | `git ls-files check_rls.cjs` | output rỗng |
| `.gitignore` covers root script | `git check-ignore -v check_rls.cjs` | đúng rule được TASK chấp nhận |
| Bốn file canary chưa sửa | Chạy phép đo path-only theo TASK | mỗi file đạt expected count |
| Production secret store ready | Dashboard, không in value | canonical key hiện diện |
| Tier 3 fingerprint scan độc lập | Tier 3 chạy sau Owner evidence | chưa cần pre-check |

**Nếu một check FAIL hoặc cửa sổ đã hết hạn:** DỪNG, ghi blocker, không vào bước 2.

**Nếu một check FAIL:** DỪNG, ghi finding, không vào bước 2.

## 2. STEP-05 — Rotate target owner credential (masked)

Tạo credential mới cho target owner role. Đi qua state machine:

1. **NEW_CREATED**: tạo credential mới trong Neon dashboard. Lưu vào password manager. KHÔNG in ra log/evidence. Fingerprint mới = `sha256("new_password")` (8-char prefix only).
2. **NEW_VERIFIED**: probe identity/posture KHÔNG in value. Kết quả ghi:
   - role fingerprint hoặc approved label (không ghi credential)
   - target fingerprint không đảo ngược
   - timestamp UTC
   - posture: `BYPASSRLS=no`, `NOSUPERUSER=yes`, `LOGIN=yes`

Bảng mẫu:

```
role_label          target_fp (8 chars) timestamp (UTC)           BYPASSRLS  NOSUPERUSER  LOGIN  new_pw_fp
<approved_label>    <target_8>          <utc_timestamp>           no         yes          yes    <new_pw_8>
```

Lệnh probe (masked; chạy trong `psql` với new credential):
```sql
SELECT current_user, session_user, current_setting('is_superuser') AS issuper,
       current_setting('session_authorization') AS sessauth;
```

**Posture phải là:** đúng target role được Owner phê duyệt, KHÔNG đổi role khác. **Nếu posture lệch:** STOP, vô hiệu credential mới, không deploy.

3. **DEPLOYED**: cập nhật secret store / Vercel env / `.env.local` (Owner tự quyết định nơi lưu). Mỗi nơi dùng `process.env.DATABASE_URL` (per TASK DEC-07 + file `check_rls.cjs` sanitized).
4. **SMOKE_GREEN**: chạy `node check_rls.cjs` với credential mới (set `DATABASE_URL` qua env), verify:
   - exit 0
   - output là danh sách policies từ `pg_policies WHERE schemaname = 'public'`
   - không có stack trace lỗi

## 3. STEP-06 — Revoke old credential

Chỉ chạy khi STEP-05 SMOKE_GREEN:

1. Revoke old credential trong Neon dashboard theo fingerprint đã giữ ngoài artifact; ghi nhận fingerprint mới sẽ là random.
2. Masked negative probe: thử connect với old credential thông qua secret source tạm thời không log, phải fail với lỗi authentication.
3. Masked positive probe: thử connect với new credential thông qua canonical secret source, phải pass.
4. Ghi timestamp UTC của lệnh revoke.

## 4. Smoke matrix

| Test | Method | Pass condition |
|---|---|---|
| `node check_rls.cjs` với `DATABASE_URL` mới | Owner shell | exit 0, output policies[] |
| `node check_rls.cjs` không có `DATABASE_URL` env | Owner shell | exit non-zero, error message "DATABASE_URL is not set" (fail-closed per TASK DEC-07) |
| `node check_rls.cjs` với `DATABASE_URL` cũ qua secret source không log | Owner shell | exit non-zero, lỗi authentication (revoke verified) |
| Neon role posture | masked identity probe | đúng approved role, BYPASSRLS=no, NOSUPERUSER=yes, LOGIN=yes |

**Nếu một test FAIL:** STOP, KHÔNG commit final evidence; xử lý theo rollback matrix §5.

## 5. Rollback / Recovery

| Lỗi phát hiện | Hành động rollback |
|---|---|
| Smoke fail sau rotate | Vô hiệu credential mới; restore `.env.local`/secret store về credential cũ (nếu còn) |
| Posture lệch (BYPASSRLS=yes hoặc SUPERUSER=yes) | DROP credential mới; reissue grant đúng role |
| Old credential vẫn dùng được sau revoke | Investigate (có thể còn connection pool cached); force disconnect; revoke lại |
| `node check_rls.cjs` thiếu `DATABASE_URL` mà KHÔNG throw fail-closed | STOP; file bị modify sai; restore từ HEAD~1 (`4a56122`) |
| Production mất DB connection giữa rotation | Restore credential cũ (Neon restore từ history); rebuild `check_rls.cjs` từ HEAD~1 |

## 6. Evidence Owner cần xuất (Owner/OP)

Mỗi OP step xuất evidence key/path-only vào:

- `evidence/ac06-rotation.txt` — Owner/OP state transitions, masked role/target fingerprints, posture, smoke và revoke timestamps

Mọi evidence này KHÔNG chứa new password, old password, connection string đầy đủ, endpoint, hoặc secret dưới mọi hình thức. Chỉ:
- credential fingerprint = `sha256(value)[0:8]`
- target fingerprint = `sha256(target_identifier)[0:8]`
- timestamp UTC
- pass/fail

## 7. References

- TASK: `docs/tasks/hrp-v6-security-credential-rotation/TASK.md` v1.2
- Sanitized `check_rls.cjs` (worktree, untracked; dùng canonical `DATABASE_URL`)
- Canary allowlist: bốn path chỉ-read trong TASK
- Task liên quan: `docs/runbooks/credential-hygiene-cutover.md`; không trộn credential hoặc evidence giữa hai task
