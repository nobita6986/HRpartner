# T0 VERIFICATION — AFF-03 — KẾT QUẢ: STOP (CHẶN MERGE / DEPLOY)

| Field | Value |
|---|---|
| Task | `hrp-v6-n2-aff-03-apply-attribution` |
| Loại | T0 verification / runbook execution + verdict |
| Ngày | 2026-09-19 (GMT+7) |
| Người thực thi | T0 (dự phòng) |
| Commit kiểm | `1059f6669482efac5b7956ef25d43996ca59d515` |
| PR | #20 `nobita6986/HRpartner` (MERGED, chưa deploy) |
| Staging preflight | `ep-empty-forest-azlhfyo9` (WRITABLE) |
| Production DB | `ep-shy-tree-az32as2c` |
| **Kết quả cuối** | ❌ **STOP tại Bước 5 — KHÔNG merge thêm, KHÔNG deploy, AFF-03 CHƯA go-live** |

---

## 1. Tóm tắt

- **Bước 0 (checkout) — PASS.** HEAD = `1059f666…`.
- **Bước 1 (preflight staging WRITABLE) — PASS.** Sau deploy: 41 migration, up-to-date, không drift; 2 policy writer; `relforcerowsecurity=t`.
- **Bước 2 (apply migration lên prod) — PASS.** Apply đúng `20260918100000_aff03_writer_select_on_referral_attributions`; 2 policy writer; `relforcerowsecurity=t`.
- **Bước 5 (smoke) — FAIL.** Cả forged lẫn valid cookie đều trả **HTTP 500** do **vi phạm RLS (`42501`) trên bảng `labor_profiles`**.

→ Đây là **code defect P0** ở đường public intake, **không phải** lỗi migration. Migration prod đúng và được **giữ nguyên**.

---

## 2. Chi tiết thực thi

### Bước 0 — Đồng bộ checkout
```
git fetch origin
git checkout 1059f6669482efac5b7956ef25d43996ca59d515
git rev-parse HEAD   → 1059f6669482efac5b7956ef25d43996ca59d515   ✅
```

### Bước 1 — Preflight staging WRITABLE (ep-empty-forest-azlhfyo9)
- Trước deploy: thư mục có 41 migration, nhưng **2 migration chưa apply**:
  - `20260918000000_aff05a_labor_profile_handling_assignment`
  - `20260918100000_aff03_writer_select_on_referral_attributions`
  → `_prisma_migrations` = **39**.
- `npx prisma migrate deploy` → apply cả 2 migration.
- Sau deploy: **41 migration · up-to-date · không drift · không pending · KHÔNG cần `migrate resolve`.** ✅
- `pg_policies` (`referral_attributions`):
  - `hrp_ra_select_writer` / **SELECT** ✅
  - `hrp_ra_update_writer` / **UPDATE** ✅
- `pg_class.relforcerowsecurity` (`referral_attributions`) = **t** ✅

### Bước 2 — Apply migration lên prod (ep-shy-tree-az32as2c)
- Trạng thái TRƯỚC: 1 migration pending = `20260918100000_aff03_writer_select_on_referral_attributions` (đúng kỳ vọng).
- `npx prisma migrate deploy` → **apply đúng 1 migration**, thành công.
- Sau apply: `pg_policies` đủ **2 policy writer**; `relforcerowsecurity` = **t** ✅
- **Quan sát:** `_prisma_migrations` trên prod đếm được **46 dòng** (nhiều hơn 41 migration) — do các bản ghi `resolve`/rolled-back lịch sử. `migrate status` **không** báo drift/pending → chấp nhận. (Cần T1B xác nhận nguồn gốc 5 dòng thừa nếu muốn vệ sinh lịch sử.)
- **Không tự xoá/đổi gì thêm.** Migration là additive RLS thuần → **giữ nguyên trên prod.**

### Bước 3–4 — Merge / Deploy runtime
- Không thuộc phạm vi lệnh T0 lần này; `$PROD_BASE_URL` không được cấp. Vì vậy **chưa deploy runtime**.
- Bước 5 được chạy bằng runtime Next.js trỏ thẳng vào **DB prod** với role `app_user_writer` để tái hiện đúng đường code + RLS (xem mục 3).

### Bước 5 — Post-deploy smoke → **FAIL**
| Case | Kỳ vọng | Thực tế |
|---|---|---|
| Forged cookie | `201`, KHÔNG mutation | **`500`** `{"error":"INTERNAL","message":"Public intake failed"}` |
| Valid cookie | `201` + `CONSUMED` + `AFF_INITIAL` | **`500`** `{"error":"INTERNAL","message":"Public intake failed"}` |

**Lỗi server:**
```
PrismaClientUnknownRequestError
ConnectorError: PostgresError { code: "42501",
  message: "new row violates row-level security policy for table \"labor_profiles\"" }
  at createOrMatchLaborProfile (src/domains/talent/labor-profile.service.ts:265)
  at createCandidateSubmissionFromIntake (src/domains/talent/intake-writer.service.ts:105)
  at submitPublicIntake (src/domains/applications/aff03-public-intake.service.ts:85)
```

---

## 3. Blocker (P0) — RLS chặn INSERT `labor_profiles`

**Hiện tượng:** mọi request `POST /api/public/intake` (bất kể cookie) đều `500` với `42501` khi writer cố INSERT `labor_profiles`.

**Root cause (chuỗi nhân quả):**
1. Route anon `POST /api/public/intake` **cố ý KHÔNG set GUC `app.role`** (documented trong header route).
2. Service `submitPublicIntake` → `createCandidateSubmissionFromIntake` → Prisma **`tx.laborProfile.create()`** = INSERT **trực tiếp**, chạy dưới role **`app_user_writer`** (FORCE RLS, **không BYPASSRLS**).
3. Policy `hrp_labor_profile_scope` (CMD=ALL) dựa trên `hrp_session_role()` → với anon trả **NULL** → **chặn INSERT**.
4. **Khác biệt với đường cũ:** route apply cũ (`/api/public/jobs/[slug]/applications`) gọi DB function **`hrp_public_apply_submission`** ở chế độ **SECURITY DEFINER** → **bỏ qua RLS**. Route AFF-03 thay bằng Prisma write trực tiếp nhưng **không** cung cấp SECURITY DEFINER/GUC tương ứng.
5. **CI bị che (masking):** `tests/db/aff03-public-intake.integration.test.ts` bọc mọi transaction writer bằng **`withHrManagerContext`** (`app.role=HR_MANAGER`) → RLS pass ở CI nhưng **fail ở runtime thật**. Đây là lý do CI xanh nhưng sản phẩm sập.

**Lỗi phụ (P1):** nếu thiếu biến `RATE_LIMIT_HASH_SECRET`, `verifyAttributionToken` ném `TOKEN_SIGNING_ERROR` **chưa được handle** → cũng trả `500`, phá vỡ cam kết "forged cookie → silent fail-safe `201`" của AFF-03.

---

## 4. Bằng chứng (file:line)

- `app/api/public/intake/route.ts` — comment: *"Does NOT set `app.role` (writer role default; relies on N2-1 + AFF-03 RLS)"*
- `src/domains/applications/aff03-public-intake.service.ts:83–85` — gọi `createCandidateSubmissionFromIntake`
- `src/domains/talent/labor-profile.service.ts:265` — `tx.laborProfile.create(...)` (điểm ném `42501`)
- `tests/db/aff03-public-intake.integration.test.ts` — comment "GUC handling … wraps every writer `$transaction` with `withHrManagerContext` … sets `app.role=HR_MANAGER`"
- `src/domains/referrals/redirect-token.ts:34` — ném `TOKEN_SIGNING_ERROR`
- `pg_policies`: `labor_profiles.hrp_labor_profile_scope` (CMD=ALL) với điều kiện `hrp_session_role() = ANY(ARRAY['ADMIN','HR_MANAGER','DIRECTOR']) OR …`
- Đối chiếu: `src/domains/applications/application.service.ts` → `SELECT … FROM hrp_public_apply_submission(...)` (SECURITY DEFINER)

---

## 5. Yêu cầu T1B (Definition of Done cho vòng fix)

- [ ] Cấp một đường ghi **hợp lệ** cho luồng anon, chọn 1 trong:
  - (a) **SECURITY DEFINER RPC** cho public intake (theo precedent `hrp_public_apply_submission`); hoặc
  - (b) **policy + GUC hẹp** chỉ cho phép INSERT intake với role hệ thống (`system:public-intake`), không mở rộng quyền.
- [ ] **Sửa test masking:** `tests/db/aff03-public-intake.integration.test.ts` phải tái hiện **context role runtime thật** (`app_user_writer`, không set `app.role=HR_MANAGER`), hoặc bổ sung lane test đúng role runtime để **fail nếu RLS chặn**.
- [ ] Handle `TOKEN_SIGNING_ERROR` như **silent fail-safe** (→ `201`) thay vì `500`; bổ sung test cho case secret thiếu/ngắn.
- [ ] Bổ sung ít nhất 1 test end-to-end chứng minh: forged cookie → `201` no mutation; valid cookie → `201` + `CONSUMED` + LPHA `AFF_INITIAL`.
- [ ] Xác nhận nguồn gốc 5 bản ghi thừa trong `_prisma_migrations` prod (không bắt buộc, nhưng nên làm rõ).
- [ ] Cập nhật HANDOFF/TASK với verdict T0 này + LIM mới.

---

## 6. Trạng thái production sau T0

- Migration `20260918100000_aff03_writer_select_on_referral_attributions`: **đã applied** (giữ nguyên, đúng).
- **Không có dữ liệu bị thay đổi** bởi smoke (fail trước khi ghi).
- **KHÔNG** merge thêm, **KHÔNG** deploy runtime, **KHÔNG** rollback migration.
- Rollback (nếu về sau thực sự cần): `DROP POLICY IF EXISTS hrp_ra_select_writer, hrp_ra_update_writer ON referral_attributions;` + `prisma migrate resolve --rolled-back 20260918100000_…` — **chỉ khi có lỗi thực sự**, không áp dụng hiện tại.

---

## 7. Ghi chú vận hành / dọn dẹp

- Repo `C:\CodeApp\HrP` đã được dọn về đúng trạng thái checkout: revert mọi chỉnh sửa tạm trong route, xoá file `test-smoke.js`, khôi phục `.env.local`, tắt dev server.
- Ticket này là file **untracked** trong `docs/tasks/hrp-v6-n2-aff-03-apply-attribution/`; **chưa commit**.

> **Verdict T0:** `STOP — REJECT MERGE/DEPLOY`. AFF-03 **không** go-live cho tới khi Bước 2 giữ nguyên + Bước 5 smoke **PASS** trên đúng role runtime.
