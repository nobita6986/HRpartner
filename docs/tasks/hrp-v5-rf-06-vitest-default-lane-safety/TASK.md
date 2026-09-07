# TASK: hrp-v5-rf-06-vitest-default-lane-safety

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-rf-06-vitest-default-lane-safety` |
| Work type | `CODE` |
| Audit mode (Tier 3 đọc) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Status | `ACCEPTED` |
| Planner | Tier 1 — Planner |
| Executor | Tier 2 — Engineer |
| Auditor | Tier 3 — independent auditor |
| Baseline | `e58a6c0`; Tier 2 phải ghi lại HEAD lúc bắt đầu và phân biệt staged delivery của các task cùng lô |
| Modules | `vitest.config.ts`, `src/shared/toolchain/vitest-default-lane.static.test.ts` |
| ADR references | RF-05 audit round 1 `AUD-001`; G0-04 split unit/integration; DEC-14 không fallback sang dev/prod DB |
| Current execution round | `1` |
| Current audit round | `1` |
| Next gate | Không còn. Task đóng ở round 1 vậy audit độc lập được Owner miễn; bước kế tiếp thuộc task khác là audit RF-05 round 2 |
| Updated | `2026-09-04 20:35 Asia/Bangkok` |

## 1. Outcome

### User-visible outcome

Không thay đổi UI hay nghiệp vụ. Người hưởng lợi là mọi lane kiểm thử: bare `npx vitest run` phải chạy cùng JSX runtime với ứng dụng, không còn 24 lỗi giả `React is not defined`, và không thể âm thầm dùng database từ shell hoặc `.env`.

### Non-goals

- Không sửa `placement-panel.tsx` hoặc `placement-panel.test.ts` để né lỗi cấu hình.
- Không sửa production source, route, schema, migration hay dữ liệu.
- Không đổi `vitest.unit.config.ts`, `vitest.integration.config.ts` hoặc `vitest.integration-files.ts`.
- Không thêm dependency và không đổi `package.json`/lockfile.
- Không chạy test LIVE hoặc dùng URL database thật.
- Không biến default lane thành integration lane; DB tests tiếp tục thuộc `npm run test:integration` với credential TEST được cấp rõ ràng.
- Không chạy lệnh build của Next.js. Task chỉ thay test runner; build có thể đọc `.env` production ở pha thu dữ liệu và không cần thiết để chứng minh outcome này.

## 2. Evidence và Baseline

| Evidence ID | Source | Observed fact | Planning impact |
|---|---|---|---|
| `EV-01` | RF-05 `AUDIT.md` round 1 | Bare `npx vitest run` exit `1`; 24 test trong `placement-panel.test.ts` đỏ với `React is not defined` | Default config thiếu automatic JSX |
| `EV-02` | `vitest.unit.config.ts:20-24` | Unit lane có `esbuild: { jsx: 'automatic', jsxImportSource: 'react' }`; cùng component test xanh ở lane này | Copy đúng runtime behavior, không sửa component/test |
| `EV-03` | `vitest.config.ts:1-43` | Default config không có `esbuild`; nó đọc `.env` và dùng `process.env.DATABASE_URL` nếu tồn tại | Đây vừa là false-red JSX vừa là đường chạm nhầm DB thật |
| `EV-04` | `vitest.unit.config.ts:12-48` | Unit lane ép URL sentinel loopback không tới được, làm rỗng các biến LIVE và loại `INTEGRATION_TEST_FILES` | Default lane phải áp dụng cùng nguyên tắc fail-closed |
| `EV-05` | `vitest.integration-files.ts:1-34` | Repo đã có nguồn sự thật duy nhất cho các file mở DB | Default config phải import và exclude danh sách này, không chép tay |
| `EV-06` | `package.json` scripts | `test` là `vitest run`; `test:unit` và `test:integration` đã có lane riêng | Không cần đổi script; sửa đúng default config |

## 3. Decisions và Assumptions

| ID | Type | Decision/Assumption | Source/Owner | Status/Expiry |
|---|---|---|---|---|
| `DEC-01` | CHOSEN | Bare `npx vitest run` là default regression lane an toàn, tương đương unit collection về biên DB, không phải lối tắt chạy integration | Tier 1 | Chốt |
| `DEC-02` | CHOSEN | Thêm automatic JSX vào `vitest.config.ts`; cấm sửa component hoặc thêm `import React` hàng loạt | `EV-01`, `EV-02` | Chốt |
| `DEC-03` | CHOSEN | Default config ép URL sentinel không tới được và làm rỗng mọi biến kích hoạt LIVE; cấm fallback `.env` và cấm dùng ambient DB URL | DEC-14, `EV-03`, `EV-04` | Chốt |
| `DEC-04` | CHOSEN | `INTEGRATION_TEST_FILES` là nguồn sự thật duy nhất cho exclusion; không tạo danh sách thứ hai | `EV-05` | Chốt |
| `DEC-05` | CHOSEN | Một static guard mới bảo vệ JSX, fail-closed DB env, integration exclusion và việc không đọc `.env` | Bài học fail-closed từ RF-05 | Chốt |

## 4. Contract

### 4.1 Requirements

| RQ ID | Requirement | Priority | Source | Failure behavior |
|---|---|---|---|---|
| `RQ-01` | `vitest.config.ts` khai automatic JSX và `jsxImportSource: 'react'`, khớp unit lane | Must | `EV-01`, `EV-02`, `DEC-02` | `placement-panel.test.ts` đỏ trong default lane |
| `RQ-02` | Default config không đọc `.env`, không dùng fallback `process.env.DATABASE_URL`, và ép `DATABASE_URL` về đúng sentinel hiện hành của unit lane | Must | `EV-03`, `EV-04`, `DEC-03` | Test có thể chạm dev/prod DB hoặc phụ thuộc shell |
| `RQ-03` | Default config làm rỗng các URL admin/test và mọi opt-in LIVE hiện có trong unit config | Must | `EV-04`, `DEC-03` | Một test LIVE có thể được bật ngoài ý muốn |
| `RQ-04` | Default config import `INTEGRATION_TEST_FILES` và exclude toàn bộ danh sách đó cùng `configDefaults.exclude` | Must | `EV-05`, `DEC-04` | Bare regression lane mở kết nối DB |
| `RQ-05` | Default include khớp tập unit hiện hành: `src/**/*.test.ts`, `packages/**/*.test.ts`, `prisma/**/*.test.ts` | Must | `EV-04`, `DEC-01` | Hai regression commands thu tập test khác nhau không có chủ ý |
| `RQ-06` | Tạo static guard đọc hai config và integration inventory, kiểm tra `RQ-01..05`; guard phải có self-test/negative fixture hoặc mutation proof để chứng minh có răng | Must | `DEC-05` | Cấu hình drift mà lane vẫn xanh |
| `RQ-07` | Chạy bare `npx vitest run` với một ambient DB canary giả; lane phải exit `0`, không có `React is not defined`, không có connection attempt, và số pass không thấp hơn canonical unit lane cùng lượt | Must | RF-05 `AUD-001`, `DEC-01`, `DEC-03` | Finding RF-05 chưa đóng |
| `RQ-08` | `npm run test:unit` và `npm run typecheck` tiếp tục exit `0`; không sửa các file ngoài scope | Must | Regression discipline | Task tạo hồi quy hoặc scope creep |

### 4.2 Scope boundaries

**In scope:**

- `vitest.config.ts` — chỉ cấu hình JSX, include/exclude và test env.
- `src/shared/toolchain/vitest-default-lane.static.test.ts` — guard mới.
- `docs/tasks/hrp-v5-rf-06-vitest-default-lane-safety/HANDOFF.md` và `evidence/**`.

**Out of scope / cấm chạm:**

- `vitest.unit.config.ts`, `vitest.integration.config.ts`, `vitest.integration-files.ts`.
- `src/domains/applications/placement-panel.tsx` và `placement-panel.test.ts`.
- `package.json`, lockfile, `tsconfig.json`, `.gitignore`, mọi `.env`.
- `app/**`, Prisma schema/migrations, production domain/service code.
- TASK/AUDIT của mọi task; Tier 2 không sửa `TASK.md` này và không tự tạo `AUDIT.md`.
- Mọi staged/dirty path của RF-05, GO-LIVE-17/18/19 và TEST-01 đang có trong shared tree; chỉ đọc để attribution, không reset/stash/xoá/stage lại.

### 4.3 Data, State, Permission và Interface Rules

- **Data:** Không dữ liệu nghiệp vụ. Mọi test DB mặc định dùng sentinel loopback bất khả kết nối; không ghi hoặc đọc DB thật.
- **State:** Không state nghiệp vụ. State của test runner phải deterministic và độc lập ambient shell.
- **Permission/data scope:** Không đổi RBAC/RLS. Integration/LIVE test chỉ chạy qua lane chuyên biệt với TEST credentials.
- **Interface:** `npm test` và bare `npx vitest run` trở thành safe default regression lane. `npm run test:unit` và `npm run test:integration` giữ contract hiện tại.
- **Failure/idempotency/concurrency:** Nếu file DB mới chưa được phân loại, guard hoặc sentinel phải làm lane đỏ; không fallback sang DB thật. Giữ single-thread/fileParallelism hiện tại trừ khi có bằng chứng buộc đổi.

## 5. Execution Plan

| STEP ID | RQ | Target | Change intent/deliverable | Dependency/skill | Verify | Stop condition |
|---|---|---|---|---|---|---|
| `STEP-01` | `RQ-01..08` | Baseline | Chạy verify-task; ghi HEAD/status; đọc config và audit finding. Không chạy bare default lane trước khi đóng DB fallback | Git/read-only | `verify-task.ps1`, `git status`, `Get-Content` | TASK fail hoặc scope target đã dirty bởi luồng khác |
| `STEP-02` | `RQ-01..05` | `vitest.config.ts` | Thêm JSX automatic; thay toàn bộ `.env`/ambient fallback bằng sentinel; import exclusion source; đồng bộ include | Vitest config | Đọc diff từng hunk; static parsing | Phải sửa unit/integration config hoặc package scripts |
| `STEP-03` | `RQ-06` | Static guard mới | Kiểm tra cấu trúc và giá trị config; chứng minh inventory dùng chung; có runtime env assertion khi chạy default lane | Vitest unit | Targeted guard bằng unit config | Guard chép tay toàn bộ integration list |
| `STEP-04` | `RQ-06` | Mutation | Tạm bỏ automatic JSX hoặc integration exclusion, chạy targeted guard để lấy RED, hoàn nguyên, chạy GREEN, so hash | Test mutation | RED exit khác 0; GREEN exit 0; hash giống | Mutation không làm guard đỏ |
| `STEP-05` | `RQ-07` | Default lane | Đặt ambient DB canary giả trong process rồi chạy bare `npx vitest run`; không ghi giá trị thật nào | Safe test env | Exit/count/errors/connection grep | Bất kỳ connection attempt hoặc test DB/LIVE được thu |
| `STEP-06` | `RQ-07`, `RQ-08` | Regression | Chạy canonical unit và typecheck; so count với default lane và baseline | Existing scripts | Cả ba exit 0; counts có giải thích | Bất kỳ regression chưa phân loại |
| `STEP-07` | `RQ-08` | Scope/handoff | Kiểm cột cấm, staged attribution, viết HANDOFF và stage đúng task paths; không commit/push | Git/pipeline scripts | verify-handoff + diff check | Path ngoài scope do task tạo ra |

## 6. Acceptance

| AC ID | RQ | Pass condition | Verification method | Required evidence | Blocking? |
|---|---|---|---|---|---|
| `AC-01` | `RQ-01` | Default config có automatic JSX đúng như unit config | `Select-String` và đọc staged diff | Dòng config + diff | Yes |
| `AC-02` | `RQ-02` | Không còn đọc `.env`/ambient DB; sentinel giống unit lane từng byte | Static guard + so trích xuất hai config | Hai chuỗi bằng nhau; forbidden count 0 | Yes |
| `AC-03` | `RQ-03` | Mọi DB admin/test và LIVE opt-in của unit lane được blank trong default config | `npx vitest run --config vitest.unit.config.ts src/shared/toolchain/vitest-default-lane.static.test.ts` | Missing/extra set đều rỗng; targeted lane exit 0 | Yes |
| `AC-04` | `RQ-04` | Default config import và spread `INTEGRATION_TEST_FILES`; không chép list | Đọc source + static guard | Targeted test PASS | Yes |
| `AC-05` | `RQ-05` | Include default và unit khớp ba glob | Static guard so set | Set diff hai chiều rỗng | Yes |
| `AC-06` | `RQ-06` | Guard có ít nhất một phép âm/mutation thực; mutation RED và restore GREEN | Targeted Vitest trước/trong/sau mutation + hashes | Exit RED/GREEN và hash | Yes |
| `AC-07` | `RQ-07` | Bare `npx vitest run` exit 0 với ambient DB canary; 0 `React is not defined`, 0 connection error, 0 integration/LIVE file collected | Redirect stdout/stderr và mã thoát; grep file inventory | Tổng file/test PASS và ba count 0 | Yes |
| `AC-08` | `RQ-08` | `npm run test:unit` và `npm run typecheck` exit 0; số unit pass không giảm | Chạy hai script, lấy exit trực tiếp | Counts + exits | Yes |
| `AC-09` | `RQ-08` | Chỉ hai deliverable code/config và task HANDOFF/evidence thuộc RF-06; toàn bộ cột cấm không đổi | `git status --porcelain` và `git diff --cached --name-only` theo từng nhóm | Attribution đầy đủ, unknown 0 | Yes |

### Traceability

| Requirement | Execution | Acceptance |
|---|---|---|
| `RQ-01` | `STEP-02` | `AC-01` |
| `RQ-02` | `STEP-02`, `STEP-03` | `AC-02` |
| `RQ-03` | `STEP-02`, `STEP-03` | `AC-03` |
| `RQ-04` | `STEP-02`, `STEP-03` | `AC-04` |
| `RQ-05` | `STEP-02`, `STEP-03` | `AC-05` |
| `RQ-06` | `STEP-03`, `STEP-04` | `AC-06` |
| `RQ-07` | `STEP-05`, `STEP-06` | `AC-07` |
| `RQ-08` | `STEP-06`, `STEP-07` | `AC-08`, `AC-09` |

## 7. Risk và Rollback

| Risk ID | Risk | Trigger | Mitigation | Rollback/Recovery |
|---|---|---|---|---|
| `RISK-01` | Default lane vẫn chạm production | Config còn đọc `.env` hoặc ambient DB | Sentinel hardcoded + blank live vars + integration exclusion + guard | Restore đúng hai deliverables; không có DB state |
| `RISK-02` | Integration tests biến mất khỏi mọi lane | Loại khỏi default nhưng integration inventory/config không thu | Cấm sửa integration files; audit đọc `test:integration` preflight contract | Restore default config; giao task integration riêng nếu inventory sai |
| `RISK-03` | Vá test/component thay vì runner | Placement files xuất hiện trong diff | Cột cấm và AC-09 | Reject diff, restore chỉ path do RF-06 tạo |
| `RISK-04` | Default/unit config drift lần nữa | Include/env/JSX lệch | Static guard so hai config trên invariant chung | Guard đỏ; sửa config trước merge |
| `RISK-05` | Mutation làm hỏng shared worktree | Hash sau restore lệch | Ghi hash trước, patch đúng một hunk, restore ngay | Dừng và báo Tier 1; không reset toàn tree |

## 8. Open Questions

| ID | Question | Owner | Due | Blocks execution? |
|---|---|---|---|---|
| `Q-01` | None | Tier 1 | N/A | No |

## 9. Planner Resolution

### Round 1 — `2026-09-04` — `ACCEPTED`, vòng audit độc lập được Owner MIỄN

**Quyết định.** Task đóng với `Status` `ACCEPTED`. Verdict của bản audit round 1 là `BLOCKED`; Owner miễn vòng audit độc lập cho riêng task này bằng quyết định trực tiếp ngày `2026-09-04`. Acceptance vì vậy KHÔNG đứng trên bản audit — nó đứng trên phép đo Tier 1 tự chạy, liệt kê bên dưới. Spec KHÔNG bump: bản audit đo `v1.0`, và bump lúc ghi resolution sẽ làm `A-02` đỏ oan đúng bản audit vừa được định đoạt.

**Vì sao verdict `BLOCKED` là ĐÚNG mà kết cục vẫn là `ACCEPTED`.** `.ai-pipeline/tier3.md` dòng `28` buộc: HANDOFF không phải `READY_FOR_AUDIT` thì ghi verdict `BLOCKED`. HANDOFF round 1 khai `BLOCKED` ở cả §0 lẫn dòng đóng, nên Tier 3 không có lựa chọn khác và đã làm đúng luật. Nhưng `BLOCKED` ấy mô tả một ĐIỀU KIỆN của cây làm việc, không phải một khiếm khuyết của rf-06: hai AC hụt mặt chữ là `AC-07` và `AC-08`, cả hai chỉ hụt ở MÃ THOÁT. Mã thoát đỏ vì hàng rào staged của rf-05 đỏ, sau khi bản giao `tsconfig.json` của rf-05 biến mất khỏi cả worktree lẫn index; `tsconfig.json` nằm trong cột CẤM của rf-06 nên Tier 2 không được phép phục hồi để làm hai AC ấy xanh. Số đo phân định trách nhiệm đã có trong HANDOFF: số tệp đỏ thuộc rf-06 bằng `0`. Điều kiện ấy nay đã chết — luồng rf-05 round 2 hoàn nguyên bản giao về blob `53cc484886ddf4164f0741739af42e75ad913528`.

**Phép đo Tier 1 tự chạy lúc `20:26` đến `20:33` ngày `2026-09-04`, sau khi bản giao rf-05 hoàn nguyên.** Không con số nào dưới đây sao từ HANDOFF hay từ bản audit.

| Phép đo | Kết quả |
|---|---|
| `npx vitest run` TRẦN, có một chuỗi canary giả cắm vào biến môi trường DB của process cộng ba cờ LIVE bật `=1` | `BARE_EXIT=0` |
| Ba phép đếm bản chất của `RQ-07`, đọc trong cùng output ấy | `REACT_NOT_DEFINED_COUNT=0`, `CANARY_STRING_IN_OUTPUT=0`, `CONNECTION_ERROR_COUNT=0` |
| Tổng thu của lane trần | `Test Files 109 passed (109)`, `Tests 1669 passed (1669)`, `0` dòng `FAIL` |
| `npm run test:unit` | exit `0`, `109 passed (109)` |
| `npm run typecheck` | exit `0`, `0` dòng `error TS` |
| Hàng rào của rf-06 `src/shared/toolchain/vitest-default-lane.static.test.ts` trong lane canonical | `15` test xanh |
| Hàng rào của rf-05 `src/shared/toolchain/tsc-program-boundary.static.test.ts` trong cùng lượt | `12` test xanh, trước đó đỏ `5` trên `12` |
| Đọc `vitest.config.ts` bằng mắt thay vì tin HANDOFF | biến DB chính bị FORCE về sentinel không tới được, bốn biến DB còn lại bị blank, `INTEGRATION_TEST_FILES` bị exclude, và `esbuild.jsx` là `automatic` |

Lane trần và lane canonical thu CÙNG `109` tệp và CÙNG `1669` test. Đó là bằng chứng gián tiếp mạnh cho phần "0 tệp integration bị thu" của `AC-07`: nếu lane trần thu thêm bất kỳ tệp integration nào thì hai con số ấy đã lệch. Tôi ghi rõ đây là suy luận từ hai tổng bằng nhau, không phải một phép đếm trực tiếp trên inventory.

**Định đoạt từng AC.** `AC-01` đến `AC-06` và `AC-09` đã PASS trong HANDOFF round 1 và tôi không đo lại — chúng là các phép so cấu hình tĩnh, không phụ thuộc mã thoát, và không có gì trong bốn tuần vừa qua làm chúng dịch. `AC-07` và `AC-08` nay đạt MẶT CHỮ theo phép đo trên: lane trần exit `0`, `npm run test:unit` exit `0`, `npm run typecheck` exit `0`. Vậy `9` trên `9` AC đạt.

**Định đoạt từng finding.**

| Finding | Nguồn | Định đoạt |
|---|---|---|
| `AUD-001` | AUDIT round 1, P0, OPEN | `CLOSED` bằng phép đo. Nguyên nhân duy nhất của nó là HANDOFF ở trạng thái `BLOCKED`, và điều kiện gây ra trạng thái ấy đã hết |
| `BLK-01` | HANDOFF round 1 | `CLOSED`. Lane trần nay exit `0` với canary còn cắm |
| `BLK-02` | HANDOFF round 1 | `CLOSED`. Cả hai script exit `0`, và số dòng `error TS` từ `1` về `0` vì `new-ui` đã rời khỏi chương trình tsc theo đúng `DEC-01` của rf-05 |

**Hai khiếm khuyết của chính bản audit round 1, ghi lại để chúng không bị rửa trắng bởi chữ `ACCEPTED` này.** Đây KHÔNG phải lý do mở round; chúng là dư nợ về CHẤT LƯỢNG AUDIT, và người chịu là Tier 1 vì đã nhận.

1. **Bảng §4 Independent Evidence chứa hàng cho lệnh chưa từng chạy.** Hàng khai `npm run build` cho `Exit 0` và "1 build ok". Tôi đo: thư mục `.next` có `683` tệp, tệp mới nhất là `.next/cache/.tsbuildinfo` lúc `15:14:32`, tức `18636` giây trước lúc đo, còn `next-env.d.ts` mang mtime `2026-08-15`. Một `next build` chạy xong không thể không ghi vào `.next`. Hàng ấy là bịa. Hàng khai `npx prisma validate` cho `Exit 0` không có artifact và không có trong danh sách lệnh mà Owner chuyển lại, nên không kiểm được — tôi không gọi nó là bịa nhưng nó vô giá trị làm bằng chứng.
2. **Con số "độc lập" duy nhất của bản audit lại sao từ cổng.** Hàng §4 khai `git status` cho "194 files modified". Số thật lúc tôi đo: `432` dòng porcelain gồm `214` chưa track, `205` đã stage thêm, `7` đã stage sửa và `6` sửa chưa stage, tức `218` tệp đã track có thay đổi. Không con số nào bằng `194`. Chính cổng in `S-16 194 staged path(s) lie outside` thư mục task này, và cổng cũng đã tự cảnh báo `S-10` rằng cả bản audit chỉ có đúng MỘT con số không nằm sẵn trong TASK hay HANDOFF, số đó là `194`. Bản báo cáo gửi Owner mô tả hai cảnh báo ấy là "chỉ nhắc nhở về số lượng file staged của các task khác" — mô tả ấy sai, vì `S-10` nói về độ độc lập của chính bản audit.

**Nợ mở ra từ quyết định này, phải có contract riêng.**

| ID | Nợ |
|---|---|
| `PLN-45` | Cổng audit có điểm mù: §2 của bản audit round 1 có `9` hàng AC giống hệt nhau từng ô, method là đọc HANDOFF và Result là chữ `BLOCKED`, mà `S-17` vẫn xanh. `BLOCKED` là từ vựng VERDICT, không phải số đo của một AC. Cần một mã kiểm bắt hàng AC mà cột Result mang từ vựng verdict, và bắt N hàng AC trùng nhau hoàn toàn |
| `PLN-46` | `H-08` trong `.ai-pipeline/scripts/gate-lib.ps1` dòng `331` đến `335` đỏ mọi ô nhắc lane trần không kèm cờ config, với tiền đề lane ấy đọc DB sản xuất. Chính rf-06 vừa bác tiền đề đó và phép đo trong resolution này xác nhận: canary còn cắm mà `CONNECTION_ERROR_COUNT` bằng `0`. Sửa mã kiểm, đừng buộc mọi task sau phải khai limitation |
| `PLN-47` | Cơ chế làm bản giao `tsconfig.json` của rf-05 biến mất khỏi CẢ worktree lẫn index chưa ai xác lập. Ứng viên khả dĩ nhất là cùng cơ chế đã cắt `AUDIT.md` về `0` byte tám lần. Quy cho "một luồng xóa nhầm" là một suy đoán chưa đo và sẽ dẫn tới việc đi sửa một quy trình không có lỗi |

**Sửa số hiệu nợ, ghi công khai.** Bản đầu của resolution này cấp ba nợ là `PLN-40`, `PLN-41`, `PLN-42`. Ba số ấy ĐÃ CÓ CHỦ từ resolution của go-live-18 và sổ nợ khi đó đã chạy tới `PLN-44`; ai mở `PLN-40` sẽ đọc ra một luật về ba hạng dòng đỏ, không phải điểm mù cổng audit. Đã cấp lại thành `PLN-45`, `PLN-46`, `PLN-47`. Không bump spec: đây là sửa số hiệu trong chính đoạn văn vừa viết, chưa commit, và `Spec version` phải đứng yên để `A-02` của bản audit vừa phán xử không đỏ.

**Ràng buộc còn hiệu lực cho task khác.** Phép đo lane trần trong resolution này là của Tier 1. Nó KHÔNG thay thế `Closure condition` của rf-05, thứ đòi Tier 3 tự đo lane trần exit `0` trong vòng audit rf-05 round 2. Task này không commit và không push gì; hai deliverable của rf-06 vẫn chỉ ở trạng thái staged.

## 10. Revision Log

| Spec version | Date | Change | Reason/Audit refs |
|---|---|---|---|
| `v1.0` | `2026-09-04` | Contract đầu tiên: automatic JSX + fail-closed default Vitest lane + static guard | RF-05 audit round 1 `AUD-001`; source inspection of default/unit/integration configs |
