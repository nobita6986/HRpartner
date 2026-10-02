# VPS Production Go-Live — Owner Operations Runbook

> **Owner-only runbook.** Tier 1 chỉ soạn, KHÔNG tự chạy các bước ở đây.
> Tất cả bước đều là thao tác vận hành trên VPS `vieclammienbac.com.vn` đã có sẵn.
> Mọi credential phải được cấp trực tiếp cho user `hrpdeploy`, KHÔNG đưa vào
> log, evidence, GitHub Actions logs, repo, chat hay terminal transcript.

---

## 1. Điều kiện tiên quyết trước khi bắt đầu

| # | Điều kiện | Verify |
|---|---|---|
| 1 | PR #75 (`ops(hrp): VPS production deployment infrastructure`) đã merge vào `main` | `git log --oneline -1 origin/main` |
| 2 | CI trên `main` xanh (Quality + Integration) sau merge | GitHub Actions UI |
| 3 | Image GHCR `ghcr.io/nobita6986/hrpartner:<merge-sha>` đã push | GitHub Packages page |
| 4 | VPS có Docker 29.1.3+ và Compose 2.40.3+ | `docker --version && docker compose version` |
| 5 | Certbot certificate hợp lệ cho `vieclammienbac.com.vn` + `www` | `sudo certbot certificates` |
| 6 | UFW mở `OpenSSH`, `HTTP Full`, `HTTPS Full` | `sudo ufw status` |
| 7 | File `C:\vps-hrp.txt` chứa SSH credential tạm thời cho root (Owner giữ) | file exists |
| 8 | Production Neon DB URL writer có sẵn (KHÔNG echo, log, commit) | Owner có sẵn từ Neon dashboard |
| 9 | Production Neon DB URL admin có sẵn (CHỈ dùng cho migration environment) | Owner có sẵn từ Neon dashboard |
| 10 | JWT secret mới (>= 32 ký tự, KHÔNG dùng JWT secret cũ của preview) | Owner tự sinh |
| 11 | Rate-limit hash secret mới (>= 32 ký tự, KHÔNG trùng JWT secret) | Owner tự sinh |
| 12 | Upstash/SRH token mới (mỗi lần rotate là tạo mới ở Provider side) | Owner tự sinh |

## 2. Tạo dedicated deploy user

Trên VPS, với quyền `root`:

```bash
# 2.1 Tạo user không có password, chỉ SSH key.
sudo adduser --system --shell /usr/sbin/nologin --home /opt/hrp --group hrpdeploy

# 2.2 Tạo thư mục .ssh và dán public key của Owner (sinh cục bộ, ed25519 ưu tiên).
sudo install -d -m 750 -o hrpdeploy -g hrpdeploy /home/hrpdeploy/.ssh
sudo tee /home/hrpdeploy/.ssh/authorized_keys <<'EOF'
ssh-ed25519 AAAA... hrp-deploy@owner-workstation
EOF
sudo chmod 640 /home/hrpdeploy/.ssh/authorized_keys
sudo chown hrpdeploy:hrpdeploy /home/hrpdeploy/.ssh/authorized_keys
```

## 3. Tạo cấu trúc thư mục + sudoers giới hạn

```bash
# 3.1 Thư mục persistent data + state.
sudo install -d -m 755 -o hrpdeploy -g hrpdeploy /opt/hrp
sudo install -d -m 755 -o root       -g root    /srv/hrp/redis
sudo install -d -m 755 -o root       -g root    /srv/hrp/evidence
sudo install -d -m 700 -o root       -g root    /srv/hrp/backups

# 3.2 Copy compose production từ repo vào /opt/hrp.
sudo install -m 644 -o root -g root \
  /opt/hrp-tmp-source/deploy/vps-production/compose.yaml /opt/hrp/compose.production.yaml
# Thay thế /opt/hrp-tmp-source bằng đường dẫn git checkout tạm thời của main.
# Hoặc dùng `sudo install -m 644 <(curl ...)` sau khi main chứa compose đã merge.

# 3.3 Symlink tới shell scripts đã merge.
sudo install -m 755 -o root -g root \
  /opt/hrp-tmp-source/deploy/vps-production/deploy-production.sh \
  /opt/hrp/deploy-production.sh
sudo install -m 755 -o root -g root \
  /opt/hrp-tmp-source/deploy/vps-production/check-migrations.sh \
  /opt/hrp/check-migrations.sh
sudo install -m 755 -o root -g root \
  /opt/hrp-tmp-source/deploy/vps-production/migrate-production.sh \
  /opt/hrp/migrate-production.sh

# 3.4 Sudoers giới hạn — KHÔNG cấp shell sudo rộng.
sudo tee /etc/sudoers.d/hrpdeploy <<'EOF'
hrpdeploy ALL=(root) NOPASSWD: /usr/local/sbin/hrp-check-migrations
hrpdeploy ALL=(root) NOPASSWD: /usr/local/sbin/hrp-migrate-production
Defaults!/usr/local/sbin/hrp-check-migrations !requiretty
Defaults!/usr/local/sbin/hrp-migrate-production !requiretty
EOF
sudo chmod 440 /etc/sudoers.d/hrpdeploy
sudo install -d -m 755 /usr/local/sbin

# 3.5 Wrapper sudo gọi script trong /opt/hrp (kiểm tra HRP_IMAGE ngay tại wrapper).
sudo tee /usr/local/sbin/hrp-check-migrations <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
[[ "$#" -eq 1 ]] || { echo "usage: hrp-check-migrations <ghcr-ref>" >&2; exit 64; }
exec /opt/hrp/check-migrations.sh "$1"
EOF
sudo tee /usr/local/sbin/hrp-migrate-production <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
[[ "$#" -eq 1 ]] || { echo "usage: hrp-migrate-production <ghcr-ref>" >&2; exit 64; }
exec /opt/hrp/migrate-production.sh "$1"
EOF
sudo chmod 755 /usr/local/sbin/hrp-check-migrations /usr/local/sbin/hrp-migrate-production
```

Verify:

```bash
sudo -u hrpdeploy sudo -n /usr/local/sbin/hrp-check-migrations ghcr.io/nobita6986/hrpartner:0000000000000000000000000000000000000000
# Kỳ vọng: refusing unexpected image reference (đúng 64), KHÔNG hỏi password.
sudo -u hrpdeploy -i
sudo -n /usr/bin/bash -c 'echo ALLOWED'   # phải fail với message "no password"
```

## 4. Tạo secret files (KHÔNG echo, KHÔNG log)

```bash
# 4.1 /etc/hrp/secrets/production.env — CHỨA writer URL + runtime env.
sudo install -d -m 750 /etc/hrp/secrets
sudo install -d -m 750 /etc/hrp

sudo tee /etc/hrp/secrets/production.env >/dev/null <<EOF
DATABASE_URL=postgresql://app_user_writer:REDACTED-${RANDOM}@ep-redacted-host.neon.tech/hrp?sslmode=require
JWT_SECRET=REDACTED-${RANDOM}-${RANDOM}-${RANDOM}
NODE_ENV=production
VERCEL_ENV=production
UPSTASH_REDIS_REST_URL=http://rate-limit
UPSTASH_REDIS_REST_TOKEN=REDACTED-${RANDOM}
RATE_LIMIT_HASH_SECRET=REDACTED-${RANDOM}-${RANDOM}
RATE_LIMIT_ALLOW_PRIVATE_HTTP=true
HRP_EVIDENCE_ROOT=/data/hrp/evidence
# Runtime secret khác nếu có (vd VERCEL/POSTHOG key) — KHÔNG truyền admin URL.
EOF
# Owner thay thế REDACTED-* bằng giá trị thật trước khi save.
# KHÔNG dùng "echo ... TO LOG"; KHÔNG `cat` sau khi save.

sudo chmod 640 /etc/hrp/secrets/production.env
sudo chown root:hrpdeploy /etc/hrp/secrets/production.env

# 4.2 /etc/hrp/secrets/rate-limit.env — SRH token.
sudo tee /etc/hrp/secrets/rate-limit.env >/dev/null <<EOF
SRH_TOKEN=REDACTED-${RANDOM}
SRH_CONNECTION_STRING=redis://redis:6379
SRH_MODE=env
EOF
sudo chmod 640 /etc/hrp/secrets/rate-limit.env
sudo chown root:hrpdeploy /etc/hrp/secrets/rate-limit.env

# 4.3 /etc/hrp/secrets/migration.env — ADMIN URL (CHỈ dùng cho backup/migration).
sudo tee /etc/hrp/secrets/migration.env >/dev/null <<EOF
DATABASE_URL_ADMIN=postgresql://neondb_owner:REDACTED-${RANDOM}@ep-redacted-host.neon.tech/hrp?sslmode=require
EOF
sudo chmod 600 /etc/hrp/secrets/migration.env
sudo chown root:root /etc/hrp/secrets/migration.env
# File này KHÔNG được mount vào container app.
```

Verify quyền:

```bash
ls -la /etc/hrp/secrets/    # production.env + rate-limit.env: 640 root:hrpdeploy; migration.env: 600 root:root
stat -c '%a %U:%G' /etc/hrp/secrets/production.env /etc/hrp/secrets/rate-limit.env /etc/hrp/secrets/migration.env
```

## 5. Cấu hình Nginx site

```bash
# 5.1 Sao lưu site preview hiện tại (vẫn đang serve Basic Auth).
sudo cp /etc/nginx/sites-available/hrp-preview /etc/nginx/sites-available/hrp-preview.bak-$(date -u +%Y%m%dT%H%M%SZ)

# 5.2 Tắt site preview (chỉ để khi cần rollback preview).
sudo rm -f /etc/nginx/sites-enabled/hrp-preview

# 5.3 Cài site production mới.
sudo tee /etc/nginx/sites-available/hrp-production <<'EOF'
# Lấy từ deploy/vps-production/nginx.conf đã merge.
EOF
# (Owner chép nội dung file deploy/vps-production/nginx.conf vào đây.)

sudo ln -sf /etc/nginx/sites-available/hrp-production /etc/nginx/sites-enabled/hrp-production

# 5.4 Test config rồi reload.
sudo nginx -t
sudo systemctl reload nginx
```

## 6. Backup production Neon (trước cutover)

```bash
# 6.1 Backup bằng role admin (KHÔNG dùng writer).
sudo mkdir -p /srv/hrp/backups
sudo chmod 700 /srv/hrp/backups

BACKUP_FILE=/srv/hrp/backups/hrp-pre-cutover-$(date -u +%Y%m%dT%H%M%SZ).dump

docker pull postgres:18-alpine
docker run --rm \
  --env-file /etc/hrp/secrets/migration.env \
  -v /srv/hrp/backups:/backup \
  postgres:18-alpine \
  sh -ceu 'pg_dump "$DATABASE_URL_ADMIN" --format=custom --file="/backup/'"$(basename "$BACKUP_FILE")"'"; pg_restore --list "/backup/'"$(basename "$BACKUP_FILE")"'" >/dev/null'

sudo chmod 600 "$BACKUP_FILE"

# 6.2 Verify file dump đọc được.
pg_restore --list "$BACKUP_FILE" | head
# Kỳ vọng: danh sách tables/views/sequences của HRP.
ls -la "$BACKUP_FILE"
```

## 7. Cấu hình GitHub Environment + Secrets

Trên GitHub repository `nobita6986/HRpartner`, Settings → Environments → New environment:

- Name: `production`
- Required reviewers: Owner(s) (Tier 0 theo — gate mọi merge vào main và mọi deploy).
- Wait timer: 0 (cho phép immediate chạy sau approve).
- Deployment branches: chỉ `main`.

Secrets ở environment `production`:

| Secret | Mô tả | Cách lấy |
|---|---|---|
| `VPS_HOST` | IP/DNS VPS | `dig +short vieclammienbac.com.vn @1.1.1.1` |
| `VPS_USER` | SSH user | `hrpdeploy` |
| `VPS_SSH_PRIVATE_KEY` | SSH private key (ed25519) | sinh local, `cat ~/.ssh/id_ed25519_hrprod` |
| `VPS_KNOWN_HOSTS` | `known_hosts` cho `VPS_HOST` | `ssh-keyscan -t ed25519 <VPS_HOST>` rồi lưu; verify khớp với host key thật |

Repository secrets không tăng; workflow dùng `GITHUB_TOKEN` (built-in) để login GHCR, và `secrets.GITHUB_TOKEN` được workflow nhân bản sang VPS để docker login (đã được workflow `packages: write`).

Verify no PUBLIC KEY (GHCR) cần public — nếu repo là PUBLIC, image sẽ public. Nếu repo là PRIVATE, workflow hiện dùng `GITHUB_TOKEN` của job `release` để push; nhưng việc truyền `GITHUB_TOKEN` sang VPS runner cho docker login cần `packages: read` trên GITHUB_TOKEN. Có hai lựa chọn:

- (a) Đổi package GHCR sang public cho `nobita6986/hrpartner`. Image chứa Next.js bundle, không có secret.
- (b) Tạo PAT riêng (`VPS_GHCR_TOKEN`) với `packages: read` + nếu cần push.

Owner chọn một trong hai và set secret tương ứng. Nếu (b), cần sửa workflow `deploy-vps.yml` và `migrate-vps.yml` để dùng `VPS_GHCR_TOKEN` thay `GITHUB_TOKEN` cho docker login trên VPS.

## 8. Smoke test thủ công (chạy trên VPS)

```bash
# Verify ports đang đóng/mở đúng.
sudo ss -lntp | grep -E ':(80|443|3001|6379|8080)\b' || true
# Kỳ vọng: 80/443 listen (nginx), KHÔNG có 6379/3001/8080 trừ khi docker mapping.

# Verify UFW.
sudo ufw status verbose
# Kỳ vọng: OpenSSH + Nginx Full (HTTP + HTTPS), mọi policy khác deny.

# Verify docker networks.
sudo docker network ls | grep hrp-production
# Kỳ vọng: hrp-production-backend (internal) + hrp-production-egress.

# Verify không có container preview nào còn chạy.
sudo docker ps --filter name=hrp-preview
# Kỳ vọng: rỗng (preview đã tắt).

# Verify chứng chỉ TLS.
sudo certbot certificates
# Kỳ vọng: 2 cert (vieclammienbac + www), expiry > 30 ngày.
```

## 9. Lần đầu cutover (chạy đúng thứ tự)

> **Quan trọng:** Bước này thực hiện SAU khi PR #75 merge vào main và GHCR có image.

1. (Owner) Đăng nhập GitHub → Actions → "Deploy HRP to VPS" → Run workflow:
   - `commit_sha`: bỏ trống → workflow lấy HEAD của main.
   - Approve (vì environment `production` yêu cầu reviewer).
2. Workflow tự chạy:
   - Resolve release SHA → checkout → build → push GHCR (job `release`).
   - VPS pull image → `sudo hrp-check-migrations` → `/opt/hrp/deploy-production.sh`.
3. Khi workflow hoàn tất, kiểm tra Tier 1 tự smoke test `/login` + `/viec-lam` đã PASS.

## 10. Verify post-cutover (Owner thao tác thủ công)

```bash
# 10.1 HTTPS không còn Basic Auth.
curl -sI https://vieclammienbac.com.vn/ | head -20
# Kỳ vọng: HTTP/2 200, có Strict-Transport-Security, KHÔNG có 401.

# 10.2 Cookie flags.
curl -sI -c /tmp/cookies.txt https://vieclammienbac.com.vn/login -o /dev/null
cat /tmp/cookies.txt | grep -i session
# Kỳ vọng: HttpOnly + SameSite=Lax (Secure chỉ qua HTTPS).

# 10.3 Rate limiter ghi/read counter.
# Truy cập /viec-lam 5 lần từ cùng IP, kiểm tra response time + headers (X-RateLimit-* nếu có).
for i in $(seq 1 5); do
  curl -sI https://vieclammienbac.com.vn/viec-lam -o /dev/null -w "attempt=$i status=%{http_code} time=%{time_total}\n"
done

# 10.4 Login thật.
# Dùng tài khoản Owner (KHÔNG seed) để login thật từ browser, verify /admin/* mở được.

# 10.5 Marketplace (/viec-lam) rỗng đúng kỳ vọng.
# Hiện không có JobPosting PUBLISHED, danh sách phải hiển thị empty state, KHÔNG 503.

# 10.6 Container healthy.
sudo docker ps --filter name=hrp-
sudo docker inspect --format '{{.State.Health.Status}}' hrp-app
sudo docker logs --tail 50 hrp-app

# 10.7 Rate-limit provider hoạt động.
sudo docker exec hrp-app sh -c 'echo OK'
sudo docker logs --tail 100 hrp-rate-limit
# Kỳ vọng: SRH respond OK tới upstream Upstash-style commands.
```

## 11. Rollback preview nếu cần (chỉ trong trường hợp production fail)

Xem `ROLLBACK.md` cùng thư mục.