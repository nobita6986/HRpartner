# RUNBOOK — Production DB Remediation: resolve failed `mp2` + apply 8 pending migrations

> **Deliverable Tier 1.** Đây là *thủ tục vận hành* cho một hành động **OWNER OP có rủi ro cao trên PRODUCTION**. Tier 1/2/3 **KHÔNG** tự chạy; chỉ **Owner (sếp)** thực thi sau khi ủy quyền rõ trong lượt hiện tại (`UNIFIED_PLAN_v5.md §9.1` — "task không được tự deploy production"; `PLANNER_HANDOVER §9`).

| Trường | Giá trị |
|---|---|
| Runbook version | v1.0 |
| Soạn ngày | 2026-08-28 (Asia/Bangkok) |
| Target | PRODUCTION `neondb` (endpoint mà `hrpartner.vn` dùng — sếp xác nhận 28/08) |
| Owner thực thi | Sếp (OP). Backup + DDL do sếp bấm. |
| Rủi ro | **CAO** — DDL trên prod đang phục vụ traffic thật |
| State verified | 2026-08-28 qua `_prisma_migrations` + `information_schema`. **PHẢI re-verify tại thời điểm chạy** (STEP 0) — không tin snapshot này. |
| Prereq nghiệp vụ | MP-2/3A/3B/3C, g0-reconcile, M1-07a/07b đều đã `ACCEPTED` → mọi migration pending đã qua audit. Pipeline-first gate: THỎA. |

---

## 1. Phạm vi & không-phạm-vi

**Trong phạm vi:** đưa schema prod từ mốc `20260821103500_m13_restore_rls_matrix` lên ngang `main` bằng cách (a) gỡ trạng thái FAILED của `mp2_apply_tracking`, (b) áp đúng 8 migration đang thiếu theo thứ tự, (c) verify hết drift.

**Ngoài phạm vi (mỗi thứ là quyết định/khối việc riêng):**
- **Seed dữ liệu chợ việc** — xem STEP 5: mặc định **KHÔNG** chạy `npm run seed` trên prod (nhồi mock fixtures). Job thật lên qua MP-1 Admin Publish.
- **Ops runbook launch-gate §7.9.7 criterion 7** đã được soạn riêng tại `docs/runbooks/marketplace-launch-operations.md`; chờ Owner drill/sign-off.
- Thay đổi code / deploy Vercel.

---

## 2. Bản đồ trạng thái (verified 28/08 — re-verify ở STEP 0)

- **Đã áp OK, mốc cuối:** `20260821103500_m13_restore_rls_matrix`.
- **8 migration đang thiếu** (theo thứ tự timestamp = thứ tự áp):

  | # | Migration | Cách áp | Ghi chú |
  |---|---|---|---|
  | 1 | `20260823101500_mp2_apply_tracking` | **SQL-direct + resolve --applied** | Đang **FAILED** (`finished_at NULL`). Rollback sạch (DDL trong transaction). Cần role `hrp_public_rpc` + chuyển OWNER function. |
  | 2 | `20260824130000_mp3_submission_lifecycle` | `migrate deploy` | phụ thuộc mp2 |
  | 3 | `20260824143000_mp3_conversion_worker_link` | `migrate deploy` | |
  | 4 | `20260824161500_g0_schema_reconcile` | `migrate deploy` | có GRANT bảng cho app-role (owner-role chạy được) |
  | 5 | `20260824163000_g0_portal_timesheet_index_reconcile` | `migrate deploy` | |
  | 6 | `20260825090000_mp3c_assignment_placement_links` | `migrate deploy` | thêm `project_assignments.submission_id` + `staffing_order_slot_id` |
  | 7 | `20260826120000_m1_07a_ticket_rls_backstop` | `migrate deploy` | RLS |
  | 8 | `20260827160000_m1_07b_rls_runtime_posture_closure` | `migrate deploy` | RLS |

- **Kết luận then chốt:** chỉ **`mp2`** cần đường đặc biệt (SQL-direct qua `DATABASE_URL_ADMIN` + `prisma migrate resolve --applied`, theo header của chính migration + DEC-NEW-04/05, vì nó chuyển OWNER function sang role `hrp_public_rpc`). **7 migration còn lại đi `prisma migrate deploy` chuẩn** (đã grep: không có `OWNER TO` / role-membership / `hrp_public_rpc` trong nhóm 7 này).
- Prisma dùng `directUrl = env("DATABASE_URL_ADMIN")` cho migrate/introspect (xác nhận ở `schema.prisma`) → `migrate deploy` tự chạy qua ADMIN URL.

> **KHÔNG bao giờ** chạy `prisma migrate deploy` khi `mp2` vẫn FAILED — Prisma sẽ **từ chối toàn bộ**. Thứ tự bắt buộc: **STEP 2 (gỡ mp2) → STEP 3 (deploy 7 cái)**.

---

## STEP 0 — Re-verify prod state (READ-ONLY, bắt buộc)

Chạy bằng `psql "$DATABASE_URL_ADMIN"` (chỉ đọc; **không in giá trị connection string ra log/PR**). Đối chiếu với "kỳ vọng" — lệch là **DỪNG, re-plan**, không áp DDL.

```sql
-- (a) migration nào đang dở/hỏng?
SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count
FROM _prisma_migrations
WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL
ORDER BY started_at;
-- KỲ VỌNG: đúng 1 dòng mp2_apply_tracking, finished_at NULL, rolled_back_at NULL.

-- (b) mốc áp OK gần nhất
SELECT migration_name, finished_at FROM _prisma_migrations
WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 3;
-- KỲ VỌNG: trên cùng = 20260821103500_m13_restore_rls_matrix.

-- (c) role tiên quyết cho mp2 (OP-01) đã tồn tại?
SELECT rolname, rolcanlogin, rolbypassrls FROM pg_roles
WHERE rolname IN ('hrp_public_rpc','app_user','app_user_writer');
-- KỲ VỌNG: có hrp_public_rpc (NOLOGIN, BYPASSRLS) + app_user + app_user_writer.

-- (d) xác nhận mp2 CHƯA áp (rollback sạch)
SELECT column_name FROM information_schema.columns
WHERE table_name='candidate_submissions' AND column_name IN ('slot_id','public_tracking_code');
-- KỲ VỌNG: 0 dòng.
SELECT proname FROM pg_proc
WHERE proname IN ('hrp_public_apply_submission','hrp_public_tracking_projection');
-- KỲ VỌNG: 0 dòng.

-- (e) xác nhận mp3c chưa áp
SELECT column_name FROM information_schema.columns
WHERE table_name='project_assignments' AND column_name IN ('submission_id','staffing_order_slot_id');
-- KỲ VỌNG: 0 dòng.
```

**Bổ sung ngữ cảnh runtime (không phải DDL):** xác nhận commit Vercel đang deploy trên prod. Nếu prod đang chạy `main` (code kỳ vọng cột chưa có) thì các trang marketplace/assignment/commission **có thể đang 500** → remediation này cũng là fix outage. Nếu prod đang chạy commit cũ ≤ 21/08 thì prod nhất quán nhưng "chưa có" chợ việc — vẫn áp được, chỉ khác kỳ vọng về downtime.

---

## STEP 1 — Backup checkpoint (OWNER, bắt buộc trước MỌI DDL)

1. Tạo **Neon branch** từ nhánh prod hiện tại (ví dụ tên `pre-mp2-remediation-2026-08-28`) **HOẶC** ghi lại **PITR restore point** (timestamp + LSN). Neon branch là cách khôi phục nhanh nhất.
2. Ghi vào nhật ký thực thi: tên branch / timestamp / LSN, và người tạo.
3. Xác nhận backup **khôi phục được** (mở nhanh branch, `SELECT 1`). Backup không verify = coi như chưa có backup.

> Chưa có checkpoint verify được thì **DỪNG** — không sang STEP 2.

---

## STEP 2 — Gỡ trạng thái FAILED của `mp2` (SQL-direct + resolve)

**2a. Precondition:** STEP 0(c) phải cho thấy role `hrp_public_rpc` tồn tại. Nếu **thiếu**, tạo trước bằng script OP-01 `scripts/create-public-rpc-role.cjs` (OWNER OP; migration `mp2` cố tình KHÔNG tạo role — DEC-09). Không có role → mp2 sẽ fail lại ở bước `ALTER FUNCTION ... OWNER TO hrp_public_rpc`.

**2b. Áp `mp2` SQL-direct qua ADMIN, một transaction (atomic):**

```bash
# directUrl = DATABASE_URL_ADMIN. --single-transaction + ON_ERROR_STOP=1
# => lỗi bất kỳ là rollback SẠCH, không để lại partial.
psql "$DATABASE_URL_ADMIN" --single-transaction -v ON_ERROR_STOP=1 \
  -f prisma/migrations/20260823101500_mp2_apply_tracking/migration.sql
```

- Migration này **additive** (cột nullable, bảng mới `application_status_history`, 2 function SECURITY DEFINER, chuyển OWNER sang `hrp_public_rpc`, GRANT tối thiểu). Không sửa/không xoá dữ liệu sẵn có.
- **Nếu fail:** transaction rollback → prod về đúng trạng thái trước 2b. Bắt log lỗi, KHÔNG chạy 2c. Lỗi ở bước OWNER/role → quay lại 2a (role/membership/ADMIN-option). Sửa xong retry từ 2b.

**2c. Ghi nhận vào lịch sử migration của Prisma (để `deploy` bỏ qua mp2):**

```bash
npx prisma migrate resolve --applied 20260823101500_mp2_apply_tracking
```

> Dùng `--applied` (KHÔNG `--rolled-back`): ta đã tự áp SQL ở 2b nên đánh dấu **đã hoàn tất**; `--rolled-back` sẽ khiến `deploy` chạy lại mp2 qua connection thường (có thể thiếu quyền OWNER → fail lại).

**2d. Verify STEP 2:**

```sql
SELECT migration_name, finished_at FROM _prisma_migrations
WHERE migration_name='20260823101500_mp2_apply_tracking';         -- finished_at KHÁC NULL
SELECT column_name FROM information_schema.columns
WHERE table_name='candidate_submissions' AND column_name='slot_id';  -- 1 dòng
SELECT proname FROM pg_proc WHERE proname='hrp_public_apply_submission'; -- 1 dòng
```

---

## STEP 3 — Áp 7 migration còn lại (`migrate deploy` chuẩn)

Chỉ chạy sau khi STEP 2d PASS.

```bash
npx prisma migrate status   # kỳ vọng: liệt kê đúng 7 migration pending (mp2 KHÔNG còn trong "failed")
npx prisma migrate deploy   # áp mp3_submission_lifecycle ... m1_07b theo thứ tự
```

- `deploy` áp **từng migration một transaction**; dừng ngay khi có migration fail (các cái trước đó vẫn giữ).
- Các migration này phụ thuộc object của mp2 (`candidate_submissions.slot_id`, `application_status_history`) — mp2 đã áp thật ở STEP 2 nên thoả.

**Verify STEP 3:**

```bash
npx prisma migrate status   # kỳ vọng: "Database schema is up to date!"
```

---

## STEP 4 — Verify drift (đảm bảo ngang `main`)

```sql
-- mp3c: cột placement đã có
SELECT column_name FROM information_schema.columns
WHERE table_name='project_assignments' AND column_name IN ('submission_id','staffing_order_slot_id'); -- 2 dòng
-- RLS đã bật trên bảng mới
SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
WHERE relname IN ('application_status_history','candidate_submissions');
```

- (Tuỳ chọn, mạnh nhất) so schema thật với `schema.prisma`:
  `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma` — thực tế dùng `migrate status` là đủ cho gate này; `db pull` vào một nhánh tạm nếu muốn diff sâu (đừng ghi đè `schema.prisma`).

---

## STEP 5 — Seed: **MẶC ĐỊNH KHÔNG CHẠY trên prod** (review-gated)

Đã đọc `prisma/seed.mjs`: **toàn upsert idempotent, KHÔNG có `deleteMany`/`TRUNCATE`** (an toàn về mặt không xoá dữ liệu), tự gán `app.role=ADMIN` cho session seed. **Nhưng** nó nhồi **MOCK fixtures** ("CANONICAL MOCK ONLY - no real PII"): project giả (`DA-2026-018`, `PRJ-SV-014`…), client `CC-SEED-*`, worker/vendor/statement/submission demo, staffing order OPEN.

- Mọi project seed đặt `isPublic=false` (AUD-004) → **không** rò rỉ ra public, nhưng vẫn **làm bẩn prod** bằng dữ liệu giả.
- `seed.mjs` cũng upsert **Permission catalog + RolePermission matrix** — phần cấu hình RBAC **thật sự cần**, và nhiều khả năng **đã có sẵn trên prod** (idempotent, chạy lại vô hại).

**Khuyến nghị:**
1. **Go-live thật:** **KHÔNG** `npm run seed`. Tạo job thật qua **MP-1 Admin Publish**. Nếu nghi ngờ permission matrix thiếu → kiểm tra read-only (`SELECT count(*) FROM permissions; SELECT count(*) FROM role_permissions;`) rồi chỉ nạp lại phần permission nếu cần (tách `seedPermissions()`), không chạy cả file.
2. Nếu sếp **cố ý** muốn dữ liệu demo trên prod (soft-launch/demo) → đó là quyết định riêng, ghi rõ trước khi chạy; mock fixtures đều `isPublic=false` nên phải publish thủ công qua Admin mới hiện public.

---

## STEP 6 — Smoke check sau remediation (prod, ưu tiên đọc)

- Trang danh sách job public: HTTP 200 (hết 500 do thiếu cột — nếu trước đó prod chạy `main`).
- Trang tracking ứng viên (`/tracking/...`) resolve được (RPC `hrp_public_tracking_projection` tồn tại).
- Admin: mở trang assignment/commission không 500 (Prisma Client trên `main` đọc được `project_assignments.submission_id`).
- Apply flow: submit thử 1 đơn qua slot công khai (nếu có job public) hoặc xác nhận RPC callable — **không** để lại dữ liệu rác thật.

---

## 9. Rollback

- **Sự cố bất kỳ trong STEP 2–4:** khôi phục từ **Neon branch/PITR** ở STEP 1. Đây là đường lùi chính và chắc chắn nhất.
- **mp2 (STEP 2b):** đã `--single-transaction` → fail là rollback sạch, không cần lùi backup, chỉ sửa precondition và retry.
- **deploy (STEP 3):** mỗi migration một transaction. Nếu cái thứ k fail: các cái < k đã áp thật. Fix nguyên nhân rồi `migrate deploy` tiếp; nếu không sửa được nhanh → khôi phục backup và re-plan. **Không** `migrate resolve --applied` bừa để "nhảy qua" một migration fail thật.
- Sau khi khôi phục backup: kiểm tra `_prisma_migrations` khớp trạng thái backup trước khi thử lại.

## 10. Sign-off & post-conditions

- [ ] `npx prisma migrate status` = "up to date".
- [ ] STEP 4 + STEP 6 verify PASS.
- [ ] Ghi nhật ký: người thực thi, thời điểm, tên Neon backup/branch, kết quả từng STEP.
- [ ] Cập nhật `PLANNER_HANDOVER.md §0` cursor: gate `BLOCKED_OWNER` → gate kế (ví dụ `PHASE_REVIEW` / chọn task launch-gate còn lại) — **Tier 1 làm sau khi sếp báo OP xong**.
- [ ] Không commit/push gì từ runbook này (đây là OP trên DB, không phải thay đổi repo). File runbook có thể commit riêng nếu sếp yêu cầu.

## 11. Ràng buộc pipeline (bất biến)

- Chỉ **Owner** chạy STEP 1–6. Tier 1/2/3 tuyệt đối **không** tự chạy prod DDL/seed (`§9.1`, `PLANNER_HANDOVER §9`).
- **Không in** giá trị `DATABASE_URL*` / secret / token / PII ra log, PR, hay chat. Chỉ tham chiếu **tên biến**.
- Mỗi lần thực thi cần **ủy quyền đích danh trong lượt hiện tại** + backup verify được.

## 12. Việc kế tiếp liên quan (không thuộc runbook này)

- **Ops runbook launch-gate §7.9.7 criterion 7** đã soạn tại `docs/runbooks/marketplace-launch-operations.md`; chờ Owner drill/sign-off.
- Sau khi prod ngang `main`: rà 8 tiêu chí §7.9.7 để chốt cửa go-live; ứng viên hardening code-only còn mở: **OPS-06** (rate-limit + upload magic-bytes/size — phục vụ trực tiếp tiêu chí 1–2), OPS-04b, G0-04b CI.
