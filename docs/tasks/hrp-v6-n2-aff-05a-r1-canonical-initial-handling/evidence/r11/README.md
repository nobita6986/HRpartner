# R11 — đóng caller collision lifecycle

Owner yêu cầu T0 trực tiếp thực thi correction trong vai T1B. Kết quả: các gate
synthetic bên dưới PASS; source vẫn dirty/uncommitted tại HEAD
`ae652d014145b5f92b2f4b285dc670ebae0b59c8`. Không có implementation SHA mới.
Không kế thừa audit verdict R9/R10 sang delta R11.

## Closure và evidence

| Finding | Sửa tối thiểu | Evidence hiện hành |
|---|---|---|
| Runner xóa predecessor dùng chung | Chỉ CREATE fixture per-run; không adopt/drop DB tồn tại; guard cả hai tên trước builder | `collision-predecessor-exists.txt`, `collision-target-exists.txt`: 6 entrypoints exit đúng 3, full DB catalog/sentinel/connection giữ nguyên |
| Fixture flag bypass allowlist | Grammar `aff05a_r1_collision_<8 hex>_pred/tgt`, giữ loopback guard; từ chối legacy bypass env | `guards-r11.txt`: 46 PASS, gồm invalid predecessor/target và fixture-mode cases |
| Cleanup không bao toàn lifecycle | Outer try/finally, chỉ close client của run; DROP fixture sau kiểm OID; cleanup error giữ exit lỗi | `cleanup-injected-failure.txt`: lỗi giả lập, OWNED_FIXTURE_CLEANUP=PASS, exit 1 đúng kỳ vọng |
| Target check quá muộn / check-then-DROP race | Preflight trước builder; builder CREATE atomically, không DROP/retry; rename vẫn fail khi gặp collision | Cả hai collision logs và source snapshot |
| Validator/log pollution | Validator không kết nối DB; evidence của AC child collision nằm riêng ở evidence-tmp | `guards-r11.txt`; không overwrite AC proof |

AC-06 (`ac06-run.txt`), AC-07 (`ac07-run.txt`) và AC-04 (`ac04-run.txt`) chạy lại
actual predecessor migrations rồi actual migration R1: đều exit 0. Các proof
backfill, REVOKED preservation, anomaly rollback, lock-timeout rollback và sanity
reapply đều PASS. `lint-r11.txt`: npm run lint exit 0; warning output giữ nguyên.
`verify-task.txt`: DRAFT-VALID, 2 warning đã có về status/prior-commit reference.
`verify-handoff.txt`: PASS. `diff-check.txt`: exit 0.

## Môi trường và tái lập

PostgreSQL 18.6 local được initdb mới hoàn toàn, chỉ listen `127.0.0.1:16439`.
Auth trust chỉ trên cluster synthetic tạm; các giá trị `probe` trong harness là
synthetic, không phải credential production. Không đọc `.env` hoặc credential
ngoài repo để chạy lượt này. Không dùng Docker daemon hay Neon.

Tạo NEW dedicated loopback cluster trước khi chạy. Từ repo root:

```powershell
$env:HRP_R11_PG_PORT='16439'
node docs/tasks/hrp-v6-n2-aff-05a-r1-canonical-initial-handling/evidence/r11/run-gates.mjs
```

Harness từ chối cluster có DB `aff05a_r1_*` tồn tại; không xóa để retry. Source
repo phải có dependencies và PostgreSQL 18 tools như các AC script hiện hành.
`results.json` lưu runtime/commands/exits. Khi audit lại, dùng EVIDENCE_DIR hoặc
copy checkout riêng để không ghi đè evidence đã bàn giao.

Cluster lượt này đã stop; thư mục data tạm giữ tại
`C:/Users/Admin/AppData/Local/Temp/hrp-r11-pg-Ex00E3` để kiểm tra nếu cần.
Ba DB AC chỉ thuộc cluster mới này, không phải DB staging/production. Fixture
collision được xóa sau proof bằng ownership/OID check; không terminate connection
của run khác. Không cleanup scratch/worktree cũ.

## Giới hạn và gate tiếp theo

- R11 chỉ đổi 5 helper scripts, TASK/HANDOFF và task-local evidence; không sửa
  migration, application test, schema hay runtime so với trạng thái R10 nhận vào.
- Không chạy lại full unit/integration/build; các kết quả R8 được ghi rõ lịch sử.
- Audit artifacts T3 giữ nguyên. Không tự tuyên bố independent audit PASS.
- Chưa commit/push/PR/merge, chưa gọi T3, chưa production preflight/deploy.
- Tiếp theo: T0 freeze review rồi T3 LIGHT delta confirmation. AC-01 và data-impact
  approval/ordering vẫn là production gate riêng, chưa hoàn thành.
