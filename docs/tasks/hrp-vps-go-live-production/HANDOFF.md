# HANDOFF — HRP VPS Production Go-Live

> Tier 1 → Tier 0 / Owner. Tier 1 đã giao infrastructure artefacts trên PR #75 đã merge vào main. Tier 0 / Owner giữ quyền quyết định cuối cùng về go-live và chịu trách nhiệm vận hành production sau cutover.

| Field | Value |
|---|---|
| Lane | CRITICAL |
| Audit mode | NONE (Tier 1 self-review) |
| Tier 1 implementation SHA (branch) | `5238f62b40c15675620a2b8fee55d9053bc9d8cc` |
| Tier 1 merge SHA (main, squash) | `eae2a3d80e88ecc66770912b8a769c7e5ca8e48e` |
| PR | https://github.com/nobita6986/HRpartner/pull/75 |
| Base | `bf5734bd266179d2927269b55bc1c6fe7f8b7987` (P1 ACCEPTED) |
| Head (squash) | `eae2a3d80e88ecc66770912b8a769c7e5ca8e48e` |
| CI status | All required checks PASS |
| Authoritative diff stat | 12 files changed, 517 insertions(+), 2 deletions(-) |
| Production image (after deploy) | `ghcr.io/nobita6986/hrpartner@sha256:<digest>` (resolved at deploy time) |
| VPS production domain | `https://vieclammienbac.com.vn` (TLS via Let's Encrypt, no Basic Auth) |
| Internal binding | `127.0.0.1:3001` → container `hrp-app` (Nginx upstream) |

---

## 1. Trạng thái giao hàng

### 1.1 Code / config đã merge trên main

- **Modified (4 files, +62/-2):**
  - `.env.example` — declare `RATE_LIMIT_ALLOW_PRIVATE_HTTP` opt-in.
  - `Dockerfile` — `SOURCE_REVISION` build arg + OCI `org.opencontainers.image.revision` label; title bỏ chữ "preview".
  - `src/shared/security/rate-limit-port.ts` — `isExplicitPrivateRateLimitUrl()` allowlist `http://rate-limit` (exact hostname, no creds/path/query/port-suffix) khi opt-in bật; HTTPS-only mặc định.
  - `src/shared/security/rate-limit-config.test.ts` — 24 unit tests bao gồm case mới.

- **New (8 files, +455):**
  - `.github/workflows/deploy-vps.yml` — workflow_run from CI + manual dispatch.
  - `.github/workflows/migrate-vps.yml` — manual dispatch + confirmation gate.
  - `deploy/vps-production/compose.yaml` — app + Redis + SRH, internal network, host loopback bind.
  - `deploy/vps-production/nginx.conf` — TLS 1.2/1.3, HSTS, security header, cookie flags, X-Forwarded-For overwrite.
  - `deploy/vps-production/deploy-production.sh` — flock serialize, tag → digest, atomic rename, smoke test ×30, rollback trap.
  - `deploy/vps-production/check-migrations.sh` — read-only migration status gate.
  - `deploy/vps-production/migrate-production.sh` — pg_dump + pg_restore --list verify, chmod 600, retention 30d.
  - `deploy/vps-production/README.md` — runtime + release flow overview.

### 1.2 Gates verified (evidence recorded trong commit message + body PR)

| Gate | Result |
|---|---|
| `npm ci` | PASS (326 packages) |
| Targeted `rate-limit-config.test.ts` | 24/24 PASS |
| Full unit suite (`npm run test:unit`) | 212 files, **3524 PASS** / 9 skipped / 0 failed |
| `npm run typecheck` | PASS, no errors |
| `npm run lint` (changed files) | 0 errors (912 warnings pre-existing, none introduced) |
| `npm run build` (next build) | PASS, 30+ routes compiled |
| `node .ai-pipeline/scripts/verify-encoding.mjs` | 6/6 PASS (UTF-8 no-BOM) |
| `node .ai-pipeline/scripts/verify-encoding-range.mjs HEAD~1 HEAD` | 12/12 PASS, 0 BOM/NUL/FFFD/CRLF/mojibake |
| `git diff --check` | no whitespace issues |
| `bash -n` (deploy-production, check-migrations, migrate-production) | 3/3 OK |
| `docker compose config` (with mocked env_file paths) | PASS, full service graph resolved |
| **CI Quality** (`schema · typecheck · lint · unit · build`) | **PASS 2m13s** |
| **CI Integration** (`DB tests · fail-closed`) | **PASS 1m25s** |

### 1.3 Cutover status

- **Tier 1 cannot complete cutover autonomously** — requires Owner-side VPS operations. Owner holds VPS setup runbook, secret files, cutover runbook, rollback procedure (cùng thư mục này).
- **Trước cutover (Owner-thực thi):**
  - Tạo `hrpdeploy` user + SSH key + sudoers giới hạn (xem `VPS-SETUP-RUNBOOK.md` §2-§3).
  - Đặt secret files `/etc/hrp/secrets/{production,rate-limit,migration}.env` (xem §4).
  - Sao lưu site preview, cài site production nginx (xem §5).
  - `pg_dump` production Neon vào `/srv/hrp/backups` (xem §6).
  - Cấu hình GitHub environment `production` + 4 secrets (`VPS_HOST`, `VPS_USER`, `VPS_SSH_PRIVATE_KEY`, `VPS_KNOWN_HOSTS`).
- **Cutover (Owner triggers workflow `Deploy HRP to VPS`):**
  - workflow tự build image từ `eae2a3d8` → push GHCR → VPS pull → migrate-check → deploy-production.sh.
  - 5/9/2025: lần đầu deploy sẽ chạy sau khi Owner trigger.
- **Sau cutover (Owner verify):** 10 bước trong `CUTOVER-RUNBOOK.md` Stage 4-9.

## 2. Outstanding items / known limitations

### 2.1 Marketplace is empty (informational, NOT a defect)

Production Neon has 1 `JobPosting` total, **0 PUBLISHED**. Sau cutover `/viec-lam` sẽ:
- Trả `200 OK` với empty state (theo contract hiện tại).
- KHÔNG auto-publish bất kỳ JobPosting nào (Tier 1 không seed, không auto-publish draft, không fake submission).
- Owner / Marketing tự publish JobPosting qua Admin UI (`/admin/projects/[id]/publish`) sau cutover.

### 2.2 GHCR visibility (Owner action required)

Workflow `deploy-vps.yml` hiện dùng `secrets.GITHUB_TOKEN` cho docker login trên VPS. Nếu GHCR package `nobita6986/hrpartner` là PRIVATE, cần:
- (a) public hóa package (image chỉ chứa Next.js bundle, không có secret runtime — chấp), hoặc
- (b) tạo PAT `VPS_GHCR_TOKEN` với `packages: read` và sửa workflow để dùng cho docker login trên VPS.

Owner chọn một. Nếu (b), Tier 1 có thể ship một forward-only follow-up commit cùng pattern.

### 2.3 Domain-specific risk ngoài scope Tier 1

- Không có automation verify domain `vieclammienbac.com.vn` đang trỏ đúng VPS IP. Certbot renewal dry-run PASS là proxy; Owner verify với `dig +short vieclammienbac.com.vn @1.1.1.1` trước cutover.
- Fail2ban config không thay đổi trong PR này. Đảm bảo fail2ban đã được enable trước cutover (Owner check `sudo fail2ban-client status`).

### 2.4 Workflow concurrency & manual override

- `concurrency: cancel-in-progress: false` cho cả `deploy-vps` và `migrate-vps` — an toàn, không bị kill giữa chừng.
- `flock -n` ở deploy-production.sh và migrate-production.sh ngăn chạy song song trên VPS.
- Nếu lock bị stuck do process đổ vỡ: `sudo rm /opt/hrp/.deploy.lock` hoặc `.migration.lock` rồi retry.

### 2.5 Marketplace vẫn rỗng (reiterate)

Directive §9 nói rõ: "Không tự tạo/publish fake job hoặc fake application trên production." Tier 1 tôn trọng — không có test E2E write nào chạy trên production DB. `JobPosting PUBLISHED = 0` là trạng thái thật; Owner / Marketing tự publish sau cutover.

## 3. Authority & quyết định còn lại

| Decision | Owner/Tier 0 | Tier 1 đã tham gia? |
|---|---|---|
| Merge PR #75 | Approve required trên branch protection | Đã merge (squash) sau khi CI xanh |
| Production go-live timing | Owner chọn thời điểm | Tier 1 sẵn sàng |
| Domain / DNS | Đã có sẵn (T0 directive) | Không tham gia |
| Certbot issuance / renewal | Đã có sẵn | Không tham gia |
| VPS secret rotation cadence | Owner quyết | Đề xuất 90 ngày |
| Marketplace PUBLISH nội dung | Owner / Marketing | KHÔNG tham gia (per directive) |
| Rate-limit rules tune | Tier 1 / Owner | Spec đã freeze (DEC-04); tune chỉ qua spec revision |
| Production scale (CPU/mem) | Owner quyết | Tier 1 đặt baseline 3g × 3 CPU app, 256m × 0.5 CPU SRH; tune nếu có telemetry |

## 4. Audit trail & evidence

- Commit `5238f62b` chứa toàn bộ changed surface (517 insertions).
- PR #75 body tổng hợp gates + cutover checklist.
- `verify-encoding-range.mjs HEAD~1 HEAD` log: 12/12 PASS (xem file output lúc tiếp task).
- `gh pr view 75` JSON `mergeStateStatus: CLEAN, mergeable: MERGEABLE`.
- `gh pr checks 75`: 4/4 PASS (CI Quality, CI Integration, Vercel, Vercel Preview Comments).
- VPS-side evidence (Owner thực thi):
  - `pg_dump` output + `pg_restore --list` log.
  - `docker compose config --quiet` exit 0.
  - `curl -sI https://vieclammienbac.com.vn/...` log cho `/`, `/login`, `/viec-lam`.
  - `sudo nginx -t` output.
  - `sudo ufw status` output.
  - `sudo docker ps --filter name=hrp-` output.
  - `sudo docker exec hrp-redis redis-cli ping` output (PONG).
  - Cookie capture (`/tmp/cookies.txt` flag inspection).

## 5. Next step

1. **Owner** đọc `VPS-SETUP-RUNBOOK.md` + `CUTOVER-RUNBOOK.md` + `ROLLBACK.md` (cùng thư mục).
2. **Owner** thực thi Stage 0 → Stage 1 → Stage 2 của `CUTOVER-RUNBOOK.md`.
3. **Owner** trigger GitHub Actions → "Deploy HRP to VPS" (workflow_dispatch với `commit_sha` = `eae2a3d8`, hoặc để trống để workflow tự lấy HEAD main).
5. **Owner** thực thi Stage 4 → Stage 10 verify.
6. **Owner** ghi nhật ký + thông báo go-live.

Nếu bất kỳ gate nào fail, KHÔNG ép tiếp; xem `ROLLBACK.md`. Tier 1 có thể hỗ trợ debug nếu cần (qua Tier 0).