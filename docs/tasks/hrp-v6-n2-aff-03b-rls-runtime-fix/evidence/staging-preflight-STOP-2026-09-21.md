# STAGING-PREFLIGHT FAILURE — hrp-v6-n2-aff-03b-rls-runtime-fix

> Tier 0 directive step 5 — "Nếu bất kỳ bước nào fail: STOP; không rollback/resolve tùy tiện; không merge; báo lỗi, SQLSTATE và bước thất bại."

## 1. Bước thất bại

**Bước 2 (verify staging target)** — phát hiện **STAGING TARGET MISMATCH** khi xác minh `DATABASE_URL` của worktree hiện tại.

## 2. Phát hiện (raw, không in credential)

Khi đọc `.env` của worktree `tier1/hrp-v6-n2-aff-03b-rls-runtime-fix` (file git-ignored, không vào repo) chỉ để lấy **key** của biến môi trường DB:

```
DATABASE_URL           → <set>  (host: ep-shy-tree-az32as2c-pooler...)
DATABASE_URL_ADMIN     → <set>  (host: ep-shy-tree-az32as2c...)
DATABASE_URL_DEV       → <set>  (host: ep-shy-tree-az32as2c-pooler...)
APPBCC_DATABASE_URL    → <set>  (host: ep-shy-tree-az32as2c-pooler...)
```

Hostname của `DATABASE_URL` / `DATABASE_URL_ADMIN` = **cùng một cluster** = cluster được ghi nhận trong `T0_VERIFY_aff-03_STOP_2026-09-19.md` mục "Production DB" = `ep-shy-tree-az32as2c` (= `hrp-live`).

So sánh với host của **writable staging** được Tier 0 dùng trong cùng tài liệu đó (mục "Bước 1 — Preflight staging WRITABLE"):
- Writable staging: `ep-empty-forest-azlhfyo9`
- `hrp-live` (production): `ep-shy-tree-az32as2c`

⇒ **`DATABASE_URL` / `DATABASE_URL_ADMIN` của worktree hiện tại trỏ vào `hrp-live` (production), KHÔNG phải writable staging `ep-empty-forest-azlhfyo9`.**

## 3. Lý do STOP

Tier 0 directive yêu cầu rõ:
- "đúng branch test/writable staging"
- "**tuyệt đối không phải `hrp-live`**"
- "không in credential"
- "migration history không có failed/unfinished row"
- "chỉ tiếp tục khi trạng thái DB phù hợp với hai migration AFF-03/AFF-03B"

Worktree `.env` hiện tại fail tiêu chí 1, 2, 5 (target sai = `hrp-live`, không phải writable staging). Nếu tôi tiếp tục `prisma migrate status` / `prisma migrate deploy` / smoke / DB integrity probe, mọi lệnh sẽ chạy trực tiếp trên **production** — vi phạm trực tiếp lệnh "tuyệt đối không phải `hrp-live`".

## 4. SQLSTATE / lỗi cụ thể

Không áp dụng — đây là lỗi **target/identity**, không phải lỗi SQL runtime. Hệ quả nếu ép chạy: mọi migration apply sẽ ghi trực tiếp lên `hrp-live`, không có bất kỳ safety net nào (không có `neon_branch_gate`/`hrp-live` guard tại worktree này, không có sandbox DB override).

## 5. Trạng thái worktree hiện tại

- HEAD: `1c08ecddd10564e0372f4146cf3527b5b21d4351` (đông cứng theo Tier 0).
- Branch: `tier1/hrp-v6-n2-aff-03b-rls-runtime-fix`.
- Working tree:
  - `docs/tasks/hrp-v6-n2-aff-03b-rls-runtime-fix/HANDOFF.md` — **modified** (round-3 docs-only update: §0 Control `Next gate`, §5 status `READY_FOR_AUDIT` kèm tier 3 verdict block mới §5.1b, §5.5 Revision Log v1.0.r7). KHÔNG thay đổi source/test/migration. `verify-handoff.ps1` PASS WITH 1 WARN (H-15 chỉ là cảnh báo Status/Next gate differ vs TASK.md vì đây là docs-only round-3 update).
  - `docs/tasks/hrp-v6-n2-aff-03b-rls-runtime-fix/evidence/integration-aff03b.txt` — **modified** (round-2 update thực tế từ CI run `35556876521`; carry-forward từ HEAD freeze).
  - `docs/tasks/hrp-v6-n2-aff-03b-rls-runtime-fix/AUDIT.md` — **untracked** (Tier 3 đã ghi verdict PASS tại round-2; v0.2 persist).
- Tất cả file modified/untracked đều nằm trong `docs/tasks/hrp-v6-n2-aff-03b-rls-runtime-fix/`. Không có thay đổi nào ngoài phạm vi task contract.
- `.env` **không** bị tracked và **không** bị thay đổi bởi tôi (chỉ đọc key).
- Chưa có commit mới nào từ round-3 docs update. HEAD vẫn là `1c08ecd` như Tier 0 đông cứng.

## 6. Tôi đã làm và chưa làm

Đã làm (chỉ docs, không source):
1. Persist `AUDIT.md` v0.2 (đã có sẵn từ Tier 3 round-2; file đã chứa verdict PASS).
2. Cập nhật `HANDOFF.md` round-3 (v1.0.r7): §0 Next gate + §5 status + §5.1b Tier 3 verdict block.
3. Re-verify `HANDOFF.md` qua `verify-handoff.ps1` → PASS WITH 1 WARN.
4. Xác minh staging target → phát hiện mismatch → STOP.

Chưa làm (chờ Tier 0 quyết):
1. `prisma migrate status` / `prisma migrate deploy` trên writable-staging (KHÔNG chạy vì `.env` trỏ production).
2. AFF-03B integration tests trên writable-staging DB.
3. Smoke public intake với runtime role thật.
4. Verify attribution/LP/PC/CS/LPHA + forged/expired/no-cookie fail-safe + không `42501`/`42883`/mutation ngoài contract.
5. Commit docs/evidence round-3 + push (chờ Tier 0 xác nhận staging URL credential mới).
6. Báo cáo Tier 0 với final PR head (chờ staging PASS).

## 7. Câu hỏi cho Tier 0

Tier 1 cần một trong các lựa chọn sau để tiếp tục (theo đúng quy trình Tier 0 giao):

(a) **Cấp lại writable-staging credential** mới (host `ep-empty-forest-azlhfyo9` hoặc tương đương) để T1B chép vào `.env` (git-ignored) và tiếp tục preflight theo đúng directive. **Đây là cách duy nhất phù hợp với directive "đúng branch test/writable staging" + "tuyệt đối không phải `hrp-live`".**

(b) Nếu Tier 0 muốn dùng worktree khác (đã có sẵn `.env` trỏ staging), cho biết worktree path để T1B `cd` sang.

(c) Nếu Tier 0 quyết định **hủy** bước writable-staging preflight (vd. vì CI Integration đã đủ bằng chứng), xác nhận bằng văn bản để T1B đóng HANDOFF và không chạy staging gate.

## 8. Cam kết T1B

- Không rollback / resolve / merge / deploy.
- Không tự ý đổi `.env` của worktree.
- HEAD `1c08ecd` được giữ nguyên.
- Chỉ chờ Tier 0 cấp credential staging hoặc ra lệnh tiếp tục/không tiếp tục.
