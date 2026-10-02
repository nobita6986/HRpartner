# HRP Production Cutover Runbook

> **Tier 1 / Owner.** Thực thi theo thứ tự. Bước nào fail → DỪNG, đánh giá, quay lại step trước; KHÔNG BAO GIỜ bỏ qua backup.

Mục tiêu: chuyển `https://vieclammienbac.com.vn` từ preview (Basic Auth, synthetic DB) sang production (no Basic Auth, Neon writer URL).

---

## Stage 0 — Pre-flight (verify đầy đủ trước khi bắt đầu)

- [ ] PR #75 merged vào `main`; CI xanh.
- [ ] Image `ghcr.io/nobita6986/hrpartner:<merge-sha>` tồn tại trên GHCR.
- [ ] VPS secret files ở `/etc/hrp/secrets/{production,rate-limit,migration}.env` đúng permission.
- [ ] `hrpdeploy` user đã được tạo; SSH key + sudoers đã apply.
- [ ] `/opt/hrp/compose.production.yaml` + scripts đã install.
- [ ] GitHub environment `production` đã có secrets (`VPS_HOST`, `VPS_USER`, `VPS_SSH_PRIVATE_KEY`, `VPS_KNOWN_HOSTS`).
- [ ] Certbot certificates xanh.
- [ ] UFW chỉ mở SSH/HTTP/HTTPS.
- [ ] Đã có 1 owner sẵn sàng làm backup Neon (Neon console).

## Stage 1 — Backup (BẮT BUỘC trước mọi thay đổi)

```bash
# 1.1 Tạo Neon branch điểm khôi phục (khuyến nghị — nhanh nhất).
# Owner mở Neon console → branches → "Branch from production" → tên
#   hrp-pre-cutover-<release-sha>
# Ghi lại branch name + timestamp + tên người tạo.

# 1.2 Snapshot Postgres backup bằng admin URL (writer URL không đủ).
sudo bash deploy/vps-production/migrate-production.sh --backup-only \
  ghcr.io/nobita6986/hrpartner:<release-sha>
# Script đã có sẵn logic backup (pg_dump custom + pg_restore --list verify).

# 1.3 Verify backup file.
ls -la /srv/hrp/backups/
pg_restore --list /srv/hrp/backups/hrp-pre-cutover-*.dump | head
# Kỳ vọng: danh sách schema đầy đủ, không error.

# 1.4 Ghi nhật ký vào /srv/hrp/backups/MANIFEST.log:
echo "$(date -u +%Y%m%dT%H%M%SZ) backup-created-by=owner pre-cutover release_sha=<release-sha> branch=hrp-pre-cutover-<release-sha>" | sudo tee -a /srv/hrp/backups/MANIFEST.log
```

## Stage 2 — Kiểm tra migration status (read-only)

```bash
# 2.1 Chạy check-migration với image mới.
sudo /usr/local/sbin/hrp-check-migrations "ghcr.io/nobita6986/hrpartner:<release-sha>"
# Output kỳ vọng:
#   "Database schema is up to date!"  (không có pending)
# hoặc
#   danh sách migration pending — KHÔNG chạy deploy nếu còn pending, mà chạy migration workflow
#   trước.
```

Theo directive T0: production đang có đúng 58 migrations (khớp main). Kỳ vọng PASS không cần migrate.

## Stage 3 — Deploy production image

```bash
# 3.1 Từ CI workflow "Deploy HRP to VPS" (workflow_run sẽ auto-trigger nếu CI xanh;
#     nếu trigger thủ công dùng workflow_dispatch).
# Workflow tự chạy:
#   - resolve SHA → build GHCR image → push
#   - VPS pull → migrate-check → deploy-production.sh

# 3.2 Hoặc chạy thủ công từ VPS.
sudo /opt/hrp/deploy-production.sh "ghcr.io/nobita6986/hrpartner:<release-sha>"
```

Workflow/ script sẽ:
- Pull image theo SHA tag.
- Resolve sang immutable digest (`ghcr.io/nobita6986/hrpartner@sha256:<64-hex>`).
- Validate digest khớp pattern.
- `docker compose config --quiet`.
- `docker compose up -d --wait --remove-orphans`.
- Smoke test `/login` + `/viec-lam` (30 attempts × 2s).

Nếu bất kỳ bước nào fail, deploy-production.sh tự rollback tới image trước đó (xem `ROLLBACK.md`).

## Stage 4 — Switch Nginx site

```bash
# 4.1 Sao lưu site preview.
sudo cp /etc/nginx/sites-available/hrp-preview /etc/nginx/sites-available/hrp-preview.bak-$(date -u +%Y%m%dT%H%M%SZ)

# 4.2 Tắt site preview, bật site production.
sudo rm /etc/nginx/sites-enabled/hrp-preview
sudo ln -sf /etc/nginx/sites-available/hrp-production /etc/nginx/sites-enabled/hrp-production

# 4.3 Test + reload.
sudo nginx -t
sudo systemctl reload nginx

# 4.4 Verify từ Internet KHÔNG có Basic Auth.
curl -sI https://vieclammienbac.com.vn/ | head -10
# Kỳ vọng: HTTP/2 200; HSTS header; KHÔNG có WWW-Authenticate.
```

## Stage 5 — Verify HTTPS, session cookie, content

```bash
# 5.1 Verify TLS 1.2/1.3.
nmap --script ssl-enum-ciphers -p 443 vieclammienbac.com.vn
# Kỳ vọng: TLSv1.2 + TLSv1.3, KHÔNG có TLSv1.0/1.1.

# 5.2 Verify certificate chain.
openssl s_client -connect vieclammienbac.com.vn:443 -servername vieclammienbac.com.vn < /dev/null 2>&1 | openssl x509 -noout -subject -issuer -dates
# Kỳ vọng: subject = vieclammienbac.com.vn; issuer = Let's Encrypt; notAfter > 30 ngày.

# 5.3 Cookie flag.
curl -sI -c /tmp/cookies.txt https://vieclammienbac.com.vn/login -o /dev/null
grep -i session /tmp/cookies.txt
# Kỳ vọng: `#HttpOnly_<domain>	FALSE	/	TRUE	<expiry>	session	<value>`
# nghĩa là HttpOnly + Secure (TRUE ở cột secure).
```

## Stage 6 — Verify application routes

```bash
# 6.1 /, /login, /viec-lam.
for path in / /login /viec-lam; do
  echo "=== $path ==="
  curl -sI "https://vieclammienbac.com.vn$path" -o /dev/null -w "HTTP %{http_code} time=%{time_total}s\n"
done
# Kỳ vọng: 200 OK (không 401, không 503).

# 6.2 Marketplace động phụ thuộc dữ liệu JobPosting PUBLISHED.
# Tại thời điểm directive, production không có JobPosting PUBLISHED.
# /viec-lam phải trả 200 với empty state, KHÔNG 503.
# (Owner tự publish qua UI MP-1 hoặc qua API sau khi sẵn sàng.)

# 6.3 /admin không có auth → 401/redirect tới /login.
curl -sI "https://vieclammienbac.com.vn/admin" -o /dev/null -w "HTTP %{http_code}\n"
# Kỳ vọng: 200 (HTML form login) hoặc 307 redirect, KHÔNG phải 500.

# 6.4 Login thật.
# Dùng Owner account → verify vào /admin được.

# 6.5 Rate-limit counter.
# Trong một vòng 60s: 121 lần request tới /viec-lam từ cùng IP
# → request thứ 121 trở đi phải trả 429 (Too Many Requests).
ab -n 121 -c 1 -k https://vieclammienbac.com.vn/viec-lam 2>/dev/null | tail
# HOẶC dùng loop curl.
```

## Stage 7 — Verify rate-limit provider

```bash
# 7.1 Container logs.
sudo docker logs --tail 100 hrp-app | grep -iE 'rate.?limit|rl' || true
# Kỳ vọng: không có lỗi RATE_LIMIT_UNAVAILABLE ở request thường.

# 7.2 Counter thực sự ghi/read.
# Redis-cli trong container redis.
sudo docker exec hrp-redis redis-cli keys 'hrp:rl:*'
# Kỳ vọng: một số key sau khi đã hit /viec-lam nhiều lần.

# 7.3 SRH logs.
sudo docker logs --tail 100 hrp-rate-limit | tail -30
# Kỳ vọng: respond OK tới GET/SET/INCR commands.
```

## Stage 8 — Verify DB posture

```bash
# 8.1 Verify app dùng writer URL.
sudo docker exec hrp-app sh -c 'echo $DATABASE_URL' | head -c 50; echo "..."
# Kỳ vọng: postgresql://app_user_writer:***@<neon-host>/hrp
# (KHÔNG echo full — chỉ verify nó bắt đầu bằng app_user_writer.)

# 8.2 Verify KHÔNG có admin URL trong app env.
sudo docker exec hrp-app sh -c 'env | grep -i admin || echo "no admin URL in env"'
# Kỳ vọng: "no admin URL in env".

# 8.3 Verify migration status vẫn "up to date".
sudo /usr/local/sbin/hrp-check-migrations "ghcr.io/nobita6986/hrpartner:<release-sha>"
```

## Stage 9 — Verify network & security

```bash
# 9.1 UFW.
sudo ufw status
# Kỳ vọng:
#   To                         Action      From
#   --                         ------      ----
#   OpenSSH                    ALLOW       Anywhere
#   Nginx Full                 ALLOW       Anywhere
#   OpenSSH (v6)               ALLOW       Anywhere (v6)
#   Nginx Full (v6)            ALLOW       Anywhere (v6)

# 9.2 Docker networks.
sudo docker network ls | grep hrp-production
sudo docker network inspect hrp-production-backend --format '{{.Internal}}'
# Kỳ vọng: backend=true (không có egress ra ngoài); egress=false (cho phép egress).

# 9.3 Host ports.
sudo ss -lntp | grep -E ':(6379|8080|3000|3001)\b'
# Kỳ vọng:
#   - 127.0.0.1:3001 listen (docker compose app port forwarding)
#   - 0.0.0.0:80 + 0.0.0.0:443 listen (nginx)
#   - KHÔNG có 6379/8080 listen public.

# 9.4 Certbot renewal dry-run.
sudo certbot renew --dry-run
# Kỳ vọng: "Congratulations, all simulated renewals succeeded".

# 9.5 fail2ban.
sudo fail2ban-client status
# Kỳ vọng: sshd jail active với ban list.

# 9.6 Reverse proxy header trust.
curl -sI -H "X-Forwarded-For: 10.99.99.99" https://vieclammienbac.com.vn/login -o /dev/null -w "%{http_code}\n"
# Logged header KHÔNG được tin. Kiểm tra log rate-limit để xem IP nào được ghi.
# Kỳ vọng: ghi IP thật của VPS, KHÔNG phải 10.99.99.99 (vì Nginx overwrite X-Forwarded-For).
```

## Stage 10 — Publish go-live report

Sau khi tất cả verify PASS, Tier 1 ghi `HANDOFF.md` (cùng thư mục) với:

- Merge commit SHA.
- Image digest GHCR (`ghcr.io/nobita6986/hrpartner@sha256:<64-hex>`).
- Container status (`hrp-app`, `hrp-redis`, `hrp-rate-limit`).
- Smoke test result cho `/`, `/login`, `/viec-lam`.
- Cookie flag (HttpOnly, Secure, SameSite=Lax).
- Cert renewal dry-run result.
- UFW / network posture.
- Backup file path + size + verify result.
- Marketplace publish status (vẫn rỗng — Owner chưa publish).

---

## Definition of Done (ghi vào HANDOFF.md)

- [ ] Merge SHA recorded.
- [ ] Image digest recorded.
- [ ] 3 containers healthy (`docker ps --filter name=hrp-`).
- [ ] Smoke tests PASS for `/`, `/login`, `/viec-lam`.
- [ ] Session cookie `Secure`, `HttpOnly`, `SameSite=Lax`.
- [ ] HTTPS no Basic Auth.
- [ ] Rate-limit counter observed.
- [ ] Migration status clean.
- [ ] UFW + network posture safe.
- [ ] Cert renewal dry-run PASS.
- [ ] Backup verified (`pg_restore --list`).
- [ ] No secret leak (search GitHub Actions logs, /tmp, terminal history, journalctl).
- [ ] Working tree clean (Tier 1 commit đã merge).