# VPS Production Rollback Procedure

> **Mục đích:** Quay lại image GHCR ngay trước đó (hoặc revert về preview nếu production hoàn toàn không lên được). KHÔNG chạm production DB — read-only operations only.

---

## Trường hợp 1: deploy-production.sh tự rollback (đã tích hợp)

`deploy-production.sh` đã cài `trap 'rc=$?; if [[ $rc -ne 0 ]]; then rollback; fi; exit $rc' EXIT`. Nếu bất kỳ bước nào fail sau khi đã pull image mới, script TỰ:

1. Đọc lại `HRP_IMAGE` từ `/opt/hrp/.release.env` (image trước).
2. Ghi `HRP_IMAGE=<previous>` vào `.release.env`.
3. `docker compose ... up -d --wait --remove-orphans`.

Nếu workflow job chạy hết nhưng exit code != 0, workflow FAIL → Owner xem logs tại `/opt/hrp/deploy-production.sh` để biết rollback đã chạy đến đâu.

Nếu rollback cũng fail (image trước cũng hỏng), chuyển sang Trường hợp 2.

---

## Trường hợp 2: rollback thủ công tới image cũ

```bash
# 2.1 Xem .release.env hiện tại để biết image trước đó.
sudo cat /opt/hrp/.release.env
# Kỳ vọng:
# HRP_IMAGE=ghcr.io/nobita6986/hrpartner@sha256:<digest cũ>

# 2.2 Nếu file không tồn tại → kiểm tra GitHub Actions → "Deploy HRP to VPS" → previous run → release SHA.
# Hoặc tìm trong container hrp-app image hiện tại.
sudo docker inspect hrp-app --format '{{.Image}}'

# 2.3 Quay lại image cũ bằng deploy script.
sudo /opt/hrp/deploy-production.sh "ghcr.io/nobita6986/hrpartner:<40-char-sha-cũ>"

# 2.4 Verify.
sudo docker ps --filter name=hrp-
curl -sI https://vieclammienbac.com.vn/login | head -5
# Expect 200 OK.
```

## Trường hợp 3: roll back về preview cũ (chỉ khi production hoàn toàn không khả thi)

> Đây là fallback cuối cùng. Tốt nhất KHÔNG BAO GIỜ chạy trừ khi:
> - Production SQL đã không kết nối được và DB writer rollback không an toàn.
> - Hoặc Owner quyết định đình chỉ go-live.

```bash
# 3.1 Tắt site production nginx.
sudo rm /etc/nginx/sites-enabled/hrp-production
sudo ln -s /etc/nginx/sites-available/hrp-preview /etc/nginx/sites-enabled/hrp-preview  # nếu đã gỡ
sudo nginx -t
sudo systemctl reload nginx

# 3.2 Tắt compose production.
sudo -u hrpdeploy docker compose -f /opt/hrp/compose.production.yaml --env-file admin down
# (HOẶC: docker compose down bằng root nếu hrpdeploy user không có docker group.)
# Thực tế: cấu hình docker group cho hrpdeploy, hoặc dùng sudo docker — nhưng sudoers.d hiện chỉ
# cho phép hrp-check-migrations và hrp-migrate-production. Nếu cần docker rộng cho rollback preview,
# Owner đăng nhập root.

# 3.3 Khởi động lại preview container (compose .yaml cũ + env preview).
sudo docker compose -f /opt/hrp/compose.preview.yaml up -d

# 3.4 Verify preview serve Basic Auth.
curl -sI https://vieclammienbac.com.vn/ | head -5
# Expect 401 (Basic Auth).
```

## Trường hợp 4: rollback DB (chỉ khi migration lỗi và đã apply thay đổi schema)

> Migration KHÔNG chạy trong deploy thường. Nó chỉ chạy qua workflow `Migrate production database` (manual dispatch). Nếu migration fail giữa chừng:

```bash
# 4.1 Migration atomicity.
# - Migrations của HRP dùng `prisma migrate deploy` → mỗi migration một transaction.
# - Fail tại migration thứ k → mọi migration < k đã apply thật; restore từ backup Neon branch.

# 4.2 Neon branch (Stage 1 của prod-db-remediation-mp2 runbook) là điểm khôi phục an toàn.
# Owner tạo Neon branch trước khi bắt đầu workflow run.
# → Khi fail: chuyển Neon endpoint về branch pre-migration; rebuild image (không cần code change);
#   chạy lại workflow deploy với image cũ.

# 4.3 Backup file dump cũng dùng để restore manual.
pg_restore --create --dbname=postgres \
  --no-owner --no-privileges \
  -h <neon-host> -U neondb_owner -d hrp \
  /srv/hrp/backups/hrp-before-migrate-<stamp>.dump
# (Lệnh chính xác tùy Neon config; Owner xem Neon docs.)
```

## Trường hợp 5: certificate revoke / TLS handshake fail

```bash
# 5.1 Nếu certbot renewal fail.
sudo certbot renew --dry-run
# Output báo cáo lỗi cụ thể; xem Nginx config / file ownership.

# 5.2 Nếu trong vòng 30 ngày tới cert hết hạn.
sudo certbot certificates
# Owner runbook bổ sung: rotate cert sớm hoặc thay CA.

# 5.3 Nếu NGINX TLS fail ngay sau deploy.
sudo nginx -t
sudo journalctl -u nginx -n 50
# Lỗi thường gặp: thiếu file ssl_certificate; kiểm tra /etc/letsencrypt/live/<domain>/.
```

## Trường hợp 6: rate limiter provider fail sau cutover

```bash
# 6.1 Production KHÔNG có memory fallback (DEC-02) → sẽ trả 503 RATE_LIMIT_UNAVAILABLE.
# Đây là kỳ vọng đúng khi Upstash/SRH không khả dụng.

# 6.2 Verify SRH container logs.
sudo docker logs --tail 200 hrp-rate-limit

# 6.3 Verify Redis container logs + health.
sudo docker logs --tail 100 hrp-redis
sudo docker exec hrp-redis redis-cli ping
# Kỳ vọng: PONG.

# 6.4 Verify docker network giữa app ↔ rate-limit ↔ redis.
sudo docker network inspect hrp-production-backend | grep -A 3 Containers
# Kỳ vọng: 3 containers attached.

# 6.5 Nếu SRH bị break nhưng Redis còn → fallback vẫn không khả dụng.
# Decision Owner: (i) chờ SRH fix; (ii) cho phép RAM fallback tạm (vi phạm DEC-02,
# cần audit-note); (iii) rollback.
```

## Trường hợp 7: rollback sau khi rotate secret mới gây outage

```bash
# 7.1 Owner xác minh secret mới đã ở đúng path + permission.
sudo ls -la /etc/hrp/secrets/
# Kỳ vọng: production.env + rate-limit.env: -rw-r----- root:hrpdeploy; migration.env: -rw------- root:root.

# 7.2 Re-pull image (env không bị bundle vào image).
sudo /opt/hrp/deploy-production.sh "ghcr.io/nobita6986/hrpartner:<sha>"

# 7.3 Nếu vẫn fail sau rotate → tạm restore secret cũ (KHÔNG commit qua use cases).
```

---

## Quan trọng cho Tier 1 / Owner

- **Không xóa /srv/hrp/backups** trong vòng 30 ngày sau cutover.
- **Không xóa .release.env** nếu chưa verify rollback image trước đó đã obsolete.
- **Mọi rollback KHÔNG chạm production DB**: chỉ rollback app image. Nếu cần rollback DB, dùng Neon branch đã tạo trước migrate.
- **Ghi nhật ký** (redo file, host) mỗi rollback vì mục đích audit: ai rollback, lúc nào, vì lý do gì.
- **Mọi secret** KHÔNG echo vào log, evidence, GitHub Actions output, repo, chat.