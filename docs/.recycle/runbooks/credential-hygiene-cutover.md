# Runbook: Credential Hygiene Cutover

> **Audience:** Owner/OP executing `STEP-07..11` của `hrp-v5-go-live-21-credential-hygiene-closure`. Tier 2
> không có quyền mutate Neon/Vercel/production; Owner chạy runbook này.
>
> **State machine cho mỗi credential:** `NEW_CREATED → NEW_VERIFIED → DEPLOYED → SMOKE_GREEN → OLD_REVOKED`.
> Cấm nhảy thẳng từ `created` sang `revoked`. Cấm chạy hai OP step đồng thời.

## 0. Phạm vi và tên

- **Provider:** Neon (3 role) + Vercel (1 project) + Vercel env (`DB_DIAG_TOKEN` xoá) + local `.env*.local` + Neon branch xoá + DEMO rows.
- **Project Vercel duy nhất:** đã xác nhận qua `Q-01`. Project name ghi ở `## 6 References` cuối runbook.
- **Branch Neon cần xoá exact:** `pre-mp2-remediation-2026-08-28`.
- **Branch Neon KHÔNG ĐƯỢC chạm:** `hrp_mp2_test`.

## 1. Pre-flight (Owner)

| Check | Command (key/path-only) | Expected |
|---|---|---|
| Project Vercel đang serve `hrpartner.vn` | `vercel ls` (hoặc dashboard) | một project duy nhất, môi trường Production |
| Neon role số lượng | `psql ... -c "\du"` | ít nhất 3 role: `neondb_owner`, `cloud_admin`, `app_user_writer` |
| `hrp_mp2_test` branch | `neon branches list` | branch name exact, không đổi |
| Local `.env*.local` disposition | `cat docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/evidence/go21-s04-disposition.md` | mỗi file có `KEEP` hoặc `DELETE` |

**Nếu một check FAIL:** DỪNG, ghi finding, không vào bước 2.

## 2. STEP-07 — Rotate 3 Neon role (masked)

Tạo credential mới cho 3 role. Mỗi role đi qua:

1. **NEW_CREATED**: tạo credential, lưu vào password manager. KHÔNG in ra log/evidence.
2. **NEW_VERIFIED**: probe identity/posture mà KHÔNG in value. Kết quả ghi:
   - role name
   - host fingerprint (sha-256 của `host:port`, không in `host:port`)
   - timestamp UTC
   - posture: `BYPASSRLS=no|yes`, `NOSUPERUSER=yes`, `LOGIN=yes`

Bảng mẫu:

```
role              host_fp (8 chars)  timestamp (UTC)           BYPASSRLS  NOSUPERUSER  LOGIN
neondb_owner      1a2b3c4d           2026-09-08T03:00:00Z      no         yes          yes
cloud_admin       5e6f7a8b           2026-09-08T03:01:00Z      no         yes          yes
app_user_writer   9c0d1e2f           2026-09-08T03:02:00Z      no         yes          yes
```

Lệnh probe (masked; chạy trong `psql`):
```sql
SELECT current_user, session_user, current_setting('is_superuser') AS issuper,
       current_setting('session_authorization') AS sessauth;
```

Posture phải là: runtime dùng role `app_user_writer` hoặc role có grant `app_user_role`, KHÔNG là `neondb_owner`, KHÔNG phải role BYPASSRLS, KHÔNG phải SUPERUSER. **Nếu posture lệch:** STOP, rollback credential mới, không deploy.

## 3. STEP-08 — Vercel env update + redeploy + smoke

Vercel project đã xác nhận ở `## 1`. Thứ tự cập nhật:

1. Cập nhật `DATABASE_URL` với credential mới (writer role).
2. Cập nhật `DATABASE_URL_ADMIN` với credential mới (admin role, cùng host, role khác).
3. Xoá `DB_DIAG_TOKEN` (ghi nhận trước khi xoá: `present=yes|no`).
4. Redeploy production.
5. Smoke test trước revoke (xem bảng dưới).

Smoke matrix (chạy bằng API/curl/browser tự động, KHÔNG dùng giá trị thật):

| Route | Method | Pass condition |
|---|---|---|
| `/` (public job board) | GET | 200, có job title từ DB |
| `/api/jobs` | GET | 200, JSON có `jobs[]` length > 0 |
| `/login` | POST (masked credentials) | 200 hoặc 302 đến dashboard |
| `/api/admin/jobs` (admin only) | GET | 200, JSON |
| `/api/worker/apply` (worker) | POST | 200 hoặc 4xx có message |
| `/track` (tracking) | GET | 200, không lộ PII |

**Nếu một route P0 đỏ:** rollback deployment (`vercel rollback`), KHÔNG revoke credential cũ.

## 4. STEP-09 — Revoke old credentials

Chỉ chạy khi STEP-08 smoke green:

1. Vô hiệu hoá role cũ `app_user_writer`: `ALTER ROLE old_app_user_writer NOLOGIN;`
2. Vô hiệu hoá role cũ `cloud_admin`: `ALTER ROLE old_cloud_admin NOLOGIN;`
3. Vô hiệu hoá role cũ `neondb_owner` (cẩn thận — cần khẳng định app không còn grant nào tới role này): `ALTER ROLE old_neondb_owner NOLOGIN;`
4. Masked negative probe: thử login với credential cũ, phải fail.
5. Masked positive probe: thử login với credential mới, phải pass.

Lưu timestamp UTC của lệnh revoke cuối.

## 5. STEP-10 — Local files, scratch/root artifacts, Neon branch

Chạy `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/evidence/go21-s04-disposition.md` để biết
DELETE vs KEEP cho `.env*.local`. Sau đó:

| Path | Hành động |
|---|---|
| `.env.local` | tuỳ disposition |
| `.env.ops06a-test.local` | tuỳ disposition (ưu tiên KEEP vì `hrp_mp2_test`) |
| `.env.production.local` | tuỳ disposition |
| `pre-mp2-remediation-2026-08-28` (Neon branch) | `DROP BRANCH pre-mp2-remediation-2026-08-28` |
| `hrp_mp2_test` (Neon branch) | KHÔNG chạm; verify connection test vẫn xanh |
| `scratch/*` paths Owner DELETE | xoá từng path literal; KHÔNG dùng `git clean` |
| Root one-shot artifacts DELETE | xoá từng path literal |

**Post-check:** `Test-Path` từng literal DELETE path → FALSE. `Test-Path` từng KEEP path → TRUE. `neon branches list` không có `pre-mp2-remediation-2026-08-28`.

## 6. STEP-11 — Production DEMO rows

Chạy script `scripts/ops/demo-cleanup.mjs` (Tier 2 prep):

1. Dry-run hai lần — counts phải khớp. Nếu drift → STOP.
2. Owner duyệt manifest `evidence/go21-s05-demo-manifest.json`.
3. Apply một lần trong transaction (advisory lock hoặc equivalent).
4. Post-check: count allowlisted DEMO rows = 0; count non-DEMO sentinel rows không đổi.
5. Nếu drift → rollback transaction.

## 7. Rollback / Recovery

| Lỗi phát hiện | Hành động rollback |
|---|---|
| Smoke đỏ sau redeploy | `vercel rollback` đến deployment cũ, KHÔNG revoke credential cũ |
| Role posture lệch (BYPASSRLS=yes hoặc SUPERUSER=yes) | DROP credential mới; reissue grant đúng |
| DEMO count drift | `ROLLBACK` transaction; restore từ PITR nếu đã commit |
| Neon branch xoá nhầm | restore từ parent branch (PITR) |
| Local file xoá nhầm | Tier 2 sẽ phục hồi từ commit (tracked) hoặc Owner cung cấp lại (untracked) |

## 8. Evidence Owner cần xuất (Owner/OP)

Mỗi OP step xuất evidence key/path-only vào:

- `evidence/go21-s07-rotation.txt` — role x host_fp x timestamp x posture matrix
- `evidence/go21-s08-deploy.txt` — deployment ID, env name-only, smoke matrix
- `evidence/go21-s09-revoke.txt` — masked negative/positive probe results
- `evidence/go21-s10-cleanup.txt` — exact path set before/after
- `evidence/go21-s11-demo.txt` — manifest hash, before/after counts

Mọi evidence này KHÔNG chứa password, connection string, host hoặc secret dưới mọi hình thức.

## 9. References

- TASK: `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/TASK.md`
- Tier 2 prep evidence: `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/evidence/`
- Disposition table: `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/evidence/go21-s04-disposition.md`
- DEMO manifest: `docs/tasks/hrp-v5-go-live-21-credential-hygiene-closure/evidence/go21-s05-demo-manifest.json`
- DEMO cleanup script: `scripts/ops/demo-cleanup.mjs`
- PLANNER_HANDOVER §13: danh sách 11 mục gốc
