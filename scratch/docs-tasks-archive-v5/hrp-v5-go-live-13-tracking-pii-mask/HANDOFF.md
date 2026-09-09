# HANDOFF: hrp-v5-go-live-13-tracking-pii-mask

## 0. Control

| Field | Value |
|---|---|
| Task slug | `hrp-v5-go-live-13-tracking-pii-mask` |
| Work type | `CODE` |
| Audit mode (phải khớp TASK) | `CODE_AUDIT` |
| Spec version | `v1.0` |
| Execution round | `1` |
| Current audit round | `0` |
| Executor | `Tier 2 — Engineer` |
| Baseline | TASK ghi `0248948`. SHA thật lúc tôi nhận việc: **`cd669d6`**. Trong lúc tôi thi hành, Tier 1 commit + push `835f893` (`docs(planner): bump go-live-12 to v1.1…`) nên HEAD cuối vòng là **`835f893`**; commit đó chỉ chạm `docs/PLANNER_HANDOVER.md` và TASK.md của go-live-12, **0 giao với 8 file của tôi** (bằng chứng ở `AC-14`) |
| Status | `READY_FOR_AUDIT` |
| Started/updated | Bắt đầu `2026-08-31` (sau khi verify-task PASS), cập nhật `2026-08-31` |

## 1. Outcome Summary

Thi hành quyết định (b) của Owner ngày 31/08: số điện thoại và CCCD bị che **một phần ở phía server**, nên giá trị gốc không còn nằm trong thân phản hồi HTTP và không thể mở ngược ra bằng công cụ trình duyệt.

Đã làm:

- Thêm module thuần `src/shared/privacy/mask.ts` (74 dòng, 2 export `maskPhone`/`maskCccd`, không import Prisma/Next/`process.env`).
- Đổi `PublicTrackingDto`: bỏ hai khóa `phone`/`cccdNumber`, thay bằng `phoneMasked`/`cccdMasked`; mapper gọi hai hàm che. Câu `SELECT` gọi `hrp_public_tracking_profile` **không đổi một ký tự**.
- Trang `/track` render hai chuỗi đã che đúng như nhận được, CCCD trống vẫn hiện `Không cung cấp`.
- Ba comment ghi quyết định (a) được viết lại thành (b) kèm câu nêu (b) thay thế (a) và ngày.
- Hai file test có sẵn đổi tên khóa; thêm test module mask (12 test) và test biên route (4 test) đo trên **thân phản hồi đã tuần tự hoá**.

Chưa hoàn thành / có giới hạn:

- `AC-06` chỉ xanh **nửa không cần DB** (trang biên dịch và trả `200`). Nửa "tra một mã tổng hợp rồi xem giá trị đã che" là `ENV_BLOCKED` — lý do đo được, không phải phỏng đoán (chi tiết ở `AC-06` và `BLK-01`).
- Không commit, không push, không deploy (`RQ-14`).

## 2. Execution Trace

| STEP | RQ | File/artifact/symbol | Result | Deviation từ TASK |
|---|---|---|---|---|
| `STEP-01` | `RQ-01`, `RQ-02`, `RQ-08` | `src/shared/privacy/mask.ts` (mới, 74 dòng), `src/shared/privacy/mask.test.ts` (mới, 114 dòng, 12 test) | `DONE` | Hằng số cửa sổ 3/3/4 để **private trong module**, test tự khai lại 3/3/4 độc lập — để test không nhập chính hằng số nó canh, và để `AC-01` "đúng hai hàm chính sách" đúng theo nghĩa chữ |
| `STEP-02` | `RQ-03`, `RQ-04`, `RQ-10` | `src/domains/applications/application.service.ts` (DTO `:67-68`, mapper `:233-234`, import `:24`), `application.service.test.ts`, `marketplace-apply.routes.test.ts` | `DONE` | Kiểu hai khóa là `string \| null` theo `RQ-03`, **không** phải `string` như `DEC-02` viết — xem `DEV-02`. `EV-04` (tsc là hàng rào miễn phí) **sai** — xem `DEV-01`. Xuất hiện **consumer thứ ba** mà `EV-13` không kể — xem `DEV-03` |
| `STEP-03` | `RQ-05`, `RQ-06` | `app/(jobs)/track/page.tsx` (kiểu `:27-28`, hai chỗ render `:121`/`:125`), `app/api/public/applications/[trackingCode]/route.ts` (chỉ comment) | `DONE` | None |
| `STEP-04` | `RQ-09` | `src/domains/applications/tracking-mask.routes.test.ts` (mới, 131 dòng, 4 test) | `DONE` | Chạy **hai biến thể RED** thay vì một (RED-A khoá cũ + giá trị gốc; RED-B khoá mới + giá trị gốc) — xem `DEV-04`, đây là bằng chứng mạnh hơn cho `RISK-02` |
| `STEP-05` | `RQ-07`, `RQ-11` | Ba comment `EV-07` + grep cấm CSS/hash trên toàn diff và trên ba file mới | `DONE` | None |
| `STEP-06` | `RQ-12`, `RQ-13`, `RQ-14` | `npm run typecheck` / `npm run lint` / `npm run test:unit`, `git status --short`, HANDOFF này | `DONE` | None. Ba lệnh chạy **không pipe**, đọc exit code ngay sau mỗi lệnh |

## 3. Acceptance Evidence

**Ghi đúng lệnh chính xác đã chạy — Tier 3 sẽ chạy lại từng lệnh này.**

| AC | Command/check | Exit/result | Evidence summary/link | Limitation |
|---|---|---|---|---|
| — | `.\.ai-pipeline\scripts\verify-task.ps1 -TaskPath .\docs\tasks\hrp-v5-go-live-13-tracking-pii-mask\TASK.md` | `RESULT: PASS`, `VERIFYTASK_EXIT=0` | `RESULT: PASS. TASK contract is ready for execution.` | None |
| `AC-01` | `grep -nE "from '@?prisma\|next/\|process\.env" src/shared/privacy/mask.ts` rồi `grep -nE "^export " src/shared/privacy/mask.ts` | `AC01_GREP_EXIT=1` (zero match), `EXPORT_COUNT=2` | Grep cấm in **rỗng**. Export: `67:export function maskPhone(value: string \| null \| undefined): string \| null {` và `72:export function maskCccd(value: string \| null \| undefined): string \| null {`. Hằng số cửa sổ private: `30:const PHONE_HEAD = 3` `31:const PHONE_TAIL = 3` `34:const CCCD_HEAD = 0` `35:const CCCD_TAIL = 4` | None |
| `AC-02` | `npx tsx -e '…await import("./src/shared/privacy/mask.ts")…'` — chạy **module thật**, in bảng vào/ra | `AC02_EXIT=0` | Bảng ở dưới bảng này (sáu giá trị tổng hợp) | Dòng 2 có `len_out < len_in` vì `DEC-12` chuẩn hoá **trước** khi đếm; độ dài bảo toàn so với giá trị **đã chuẩn hoá** |
| `AC-03` | `grep -nE "phone\|cccdNumber\|phoneMasked\|cccdMasked" src/domains/applications/application.service.ts` + `sed -n '/^export interface PublicTrackingDto/,/^}/p'` | `PASS` | Khối `PublicTrackingDto` in nguyên văn ở dưới: **không còn** khóa `phone`, **không còn** `cccdNumber`, có đúng hai khóa `phoneMasked` `:67` / `cccdMasked` `:68`. Hai khóa `phone`/`cccdNumber` còn lại trong file thuộc `PublicApplyInput` (đường **ghi**, ngoài tầm) và thuộc kiểu **hàng thô** của `$queryRawUnsafe` `:214-215` | None |
| `AC-04` | `git diff -- src/domains/applications/application.service.ts` rồi `git diff … \| grep -nE "^[-+].*(SELECT\|FROM hrp_public_tracking_profile\|tracking_code, status\|full_name, phone)"` | Diff có đúng **4 hunk**; grep câu SQL trên diff `AC04_SQL_TOUCHED_EXIT=1` (zero match) | Bốn hunk = import, docblock, hai khóa DTO, hai dòng mapper. Mapper sau khi sửa: `phoneMasked: maskPhone(row.phone),` / `cccdMasked: maskCccd(row.cccd_number),`. Không còn phép gán nào đưa `row.phone`/`row.cccd_number` thẳng vào DTO. `SELECT … FROM hrp_public_tracking_profile($1)` không xuất hiện ở bất kỳ dòng `+`/`-` nào ⇒ không đổi một ký tự | None |
| `AC-05` | `git diff -- app/api/public/applications/` | `AC05_EXIT=0`, diff **chỉ comment** | Mọi dòng `+`/`-` trong hunk duy nhất đều bắt đầu bằng `//`. Không một dòng mã thực thi nào đổi | None |
| `AC-06` | `git diff -- 'app/(jobs)/track/page.tsx'`; `npm run dev`; `curl -s -o … -w "%{http_code}" http://127.0.0.1:3001/track` | Diff `AC06_DIFF_EXIT=0` = kiểu + hai chỗ render + comment. Dev server: `✓ Ready in 3s`. `HTTP=200`, `BYTES=22017`, `DEVLOG_ERR_EXIT=1` (0 lỗi compile) | Diff: `-phone: string; -cccdNumber: string \| null;` → `+phoneMasked: string \| null; +cccdMasked: string \| null;`; `-{result.phone}` → `+{result.phoneMasked \|\| 'Không cung cấp'}`; `-{result.cccdNumber \|\| 'Không cung cấp'}` → `+{result.cccdMasked \|\| 'Không cung cấp'}`. Nhãn, thứ tự hàng, `className`, `style` không đổi | **`ENV_BLOCKED` cho nửa "tra một mã tổng hợp"** — lý do đo được ở `BLK-01`. `AC-09` xanh (đo đúng thân phản hồi mà trang nhận) |
| `AC-07` | `git diff > /tmp/hrp-diff-13.txt` rồi `grep -nE "text-security\|filter: ?blur\|type=.password.\|createHash\|createHmac\|btoa\|toString\('hex'\)"` trên diff **và** trên ba file mới | `DIFF_BYTES=64980`, `AC07_DIFF_EXIT=1`, `AC07_NEWFILES_EXIT=1` — cả hai **rỗng** | Không có cách che phía client nào (CSS, `text-security`, `blur`, `type=password`) và không có băm/encode (`createHash`, `createHmac`, `btoa`, `toString('hex')`) | None |
| `AC-07` (khẳng định bằng lời) | `grep -nE "title=\|aria-label=\|data-[a-z-]+=" 'app/(jobs)/track/page.tsx' 'app/api/public/applications/[trackingCode]/route.ts' src/domains/applications/application.service.ts src/shared/privacy/mask.ts` | `AC07_ATTR_EXIT=0`, **đúng một** hit | Hit duy nhất là `app/(jobs)/track/page.tsx:89: aria-label='Mã tra cứu'` — nhãn tĩnh của ô nhập mã, **không** mang số điện thoại và **không** mang CCCD. Zero `title=`, zero `data-*` trên cả bốn đường dẫn đã kiểm ⇒ không thuộc tính nào mang hai giá trị đó | None |
| `AC-08` | `npx vitest run --config vitest.unit.config.ts src/shared/privacy/mask.test.ts --reporter=verbose` | `MASKTEST_EXIT=0`, `12 passed (12)` | 12 tên test in nguyên văn ở dưới; có nhóm bất biến "bỏ phần được giữ ra thì phần còn lại chỉ gồm dấu sao" (9 case chính sách + 3 case bất biến, > mức tối thiểu 7) | None |
| `AC-09` | `npx vitest run --config vitest.unit.config.ts src/domains/applications/tracking-mask.routes.test.ts` chạy **RED rồi GREEN** | RED-A `RED_A_EXIT=1` (4 failed); RED-B `RED_B_EXIT=1` (**3 failed / 1 passed**); GREEN `GREEN_EXIT=0` (`4 passed (4)`) | RED-B đo lại trên **cây cuối cùng**, thông điệp nguyên văn: `AssertionError: expected '{"application":{"trackingCode":"APP-M…' not to contain '0911222333'` và `AssertionError: expected '0911222333' to be '091****333'`. Sau đó tôi hoàn nguyên đúng hai dòng mapper và đo lại GREEN | None |
| `AC-10` | `git diff -- src/domains/applications/application.service.test.ts src/domains/applications/marketplace-apply.routes.test.ts`; đếm `expect(` HEAD vs worktree; grep `.skip(\|.todo(\|xit(\|xdescribe(` | `AC10_DIFF_EXIT=0`; số khẳng định **không giảm**; `AC10_SKIP_EXIT=1` | Diff chỉ 8 dòng: hai giá trị mong đợi thành `phoneMasked: '090****456'` / `cccdMasked: '********8901'`, và mảng khóa đã sắp xếp đổi `'cccdNumber'`→`'cccdMasked'`, `'phone'`→`'phoneMasked'` (vị trí sắp xếp không đổi). Đếm: `application.service.test.ts` HEAD=24 WORKTREE=24; `marketplace-apply.routes.test.ts` HEAD=111 WORKTREE=111; `marketplace-inventory.static.test.ts` HEAD=79 WORKTREE=79. Zero marker bỏ qua/hoãn | Consumer thứ ba (`marketplace-inventory.static.test.ts`) nằm ngoài hai file `AC-10` kể — xem `DEV-03` |
| `AC-11` | Needle lấy **bằng máy** từ chính TASK: `sed -n '180p' … \| awk -F'"' '{print $2}'` → `NEEDLE=[đọc lại nguyên văn\|re-read]`, rồi `grep -rnE "$NEEDLE"` trên ba file `EV-07` | `AC11_EXIT=1` (zero match); `AC11B_EXIT=0` — cả ba file đều có **1** dòng khớp `\(b\).*(SUPERSEDES\|supersedes)` | Ba đoạn comment mới in nguyên văn ở dưới; cả ba nêu quyết định (b) và nói (b) thay thế (a) kèm ngày `2026-08-31` | Needle trích từ TASK để kết quả zero-match không thể là âm tính giả do tôi tự gõ dấu tiếng Việt |
| `AC-12` | Đọc lại toàn bộ 3 file test mới/sửa và toàn bộ HANDOFF này | `PASS` | Mọi số trong test và trong HANDOFF là **tổng hợp**: `0912345678`, `0912 345 678`, `+84912345678`, `123456`, `012345678901`, `0911222333`, `001122334455`, `0909123456`; mã tra cứu `APP-MASK-TEST-CODE`; họ tên `Nguyễn Văn A` / `Nguyễn Văn Kiểm Thử`. Không dùng, không in, không dán bất kỳ giá trị thật nào; không kết nối DB thật ở bất kỳ phép đo nào | None |
| `AC-13` | `npm run typecheck`; `npm run lint`; `npm run test:unit` — mỗi lệnh đọc exit code ngay sau đó, **không pipe** | `TYPECHECK_EXIT=0`; `LINT_EXIT=0`; `TESTUNIT_EXIT=0` | `✖ 494 problems (0 errors, 494 warnings)` — toàn bộ warning là nền cũ, `grep -cE "  error  "` = `0` (exit 1) và **zero** dòng lint nào gọi tên file của tôi vòng này (exit 1). Vitest: ` Test Files  97 passed (97)` / `      Tests  1464 passed (1464)` — ≥ 1421 và tăng **+16** so với 1448 | Lần chạy `typecheck` đầu tiên **đỏ** (`TYPECHECK_EXIT=2`) vì test mới của tôi thiếu `retryAfterSec`; đã sửa và ghi ở `DEV-05` |
| `AC-14` | `git log origin/main..HEAD --oneline`; `git rev-list --count origin/main..HEAD`; `git status --short`; `git diff --cached --name-only \| wc -l` | `AC14_LOG_COUNT=0` (**rỗng**), `AHEAD=0 BEHIND=0`, `STAGED_COUNT=0` | Tier 2 không tạo commit nào. `git status --short` nguyên văn ở §4 | **Bán kính rộng hơn allowlist của `AC-14`** vì cây làm việc còn mang vòng go-live-12 **chưa commit** của chính tôi — quy thuộc từng file ở §4 và `BLK-02` |

### `AC-02` — bảng vào/ra, đo bằng module thật (`AC02_EXIT=0`)

```
maskPhone("0912345678")   => "091****678"     len_in=10 len_out=10
maskPhone("0912 345 678") => "091****678"     len_in=12 len_out=10
maskPhone("+84912345678") => "+84******678"   len_in=12 len_out=12
maskPhone("123456")       => "******"         len_in=6  len_out=6
maskCccd("012345678901")  => "********8901"   len_in=12 len_out=12
maskCccd(null)            => null             len_in=-  len_out=-
```

Đối chiếu ngưỡng `AC-02`: điện thoại mười chữ số ra **ba ký tự + bốn dấu sao + ba ký tự**, tổng **10**. CCCD mười hai chữ số ra **tám dấu sao + bốn ký tự cuối**, tổng **12**. Giá trị ngắn hơn cửa sổ ra **toàn dấu sao** (`123456` → `******`, `DEC-11`). `null` ra `null`; chuỗi chỉ gồm khoảng trắng và chuỗi chỉ gồm dấu phân cách cũng ra `null` (`maskPhone('-- ()') === null`, có test riêng) — **không** ra dấu sao (`DEC-04`).

### `AC-03` — khối `PublicTrackingDto` sau khi sửa, nguyên văn

```ts
export interface PublicTrackingDto {
  trackingCode: string;
  status: string;
  statusLabel: string;
  nextStep: string;
  submittedAt: string | null;
  jobTitle: string | null;
  jobCode: string | null;
  positionTitle: string | null;
  fullName: string;
  phoneMasked: string | null;
  cccdMasked: string | null;
}
```

### `AC-08` — 12 tên test của `src/shared/privacy/mask.test.ts`

```
✓ maskPhone — che một phần số điện thoại (RQ-02/DEC-05) > điện thoại mười chữ số giữ ba số đầu và ba số cuối, độ dài không đổi
✓ maskPhone — che một phần số điện thoại (RQ-02/DEC-05) > điện thoại có khoảng trắng giữa các nhóm che đúng vị trí sau chuẩn hoá (DEC-12)
✓ maskPhone — che một phần số điện thoại (RQ-02/DEC-05) > dấu chấm, dấu gạch và dấu ngoặc cũng bị bỏ trước khi đếm (DEC-12)
✓ maskPhone — che một phần số điện thoại (RQ-02/DEC-05) > điện thoại dạng cộng tám bốn giữ dấu cộng ở đầu và không lệch vị trí
✓ maskPhone — che một phần số điện thoại (RQ-02/DEC-05) > giá trị ngắn hơn hoặc bằng cửa sổ hiển thị bị che TOÀN BỘ (DEC-11)
✓ maskPhone — che một phần số điện thoại (RQ-02/DEC-05) > chuỗi chỉ gồm khoảng trắng, chuỗi trống, null và thiếu đều trả null (DEC-04)
✓ maskCccd — che một phần số CCCD (RQ-02/DEC-05) > CCCD mười hai chữ số chỉ giữ bốn số cuối, không giữ số đầu nào
✓ maskCccd — che một phần số CCCD (RQ-02/DEC-05) > CCCD null hoặc thiếu trả null, KHÔNG trả dấu sao
✓ maskCccd — che một phần số CCCD (RQ-02/DEC-05) > CCCD ngắn hơn hoặc bằng bốn ký tự bị che toàn bộ (DEC-11)
✓ bất biến — bỏ phần được giữ ra thì phần còn lại chỉ gồm dấu sao > điện thoại: phần giữa giữa ba đầu và ba cuối chỉ gồm dấu sao
✓ bất biến — bỏ phần được giữ ra thì phần còn lại chỉ gồm dấu sao > CCCD: mọi ký tự trước bốn số cuối chỉ gồm dấu sao
✓ bất biến — bỏ phần được giữ ra thì phần còn lại chỉ gồm dấu sao > giá trị đã che KHÔNG chứa nguyên văn giá trị gốc
 Test Files  1 passed (1)
      Tests  12 passed (12)
```

### `AC-09` — bốn tên test của `tracking-mask.routes.test.ts` (GREEN, `GREEN_EXIT=0`)

```
✓ RQ-09/DEC-14 — thân phản hồi tra cứu KHÔNG chứa số gốc > chuỗi phản hồi nguyên văn không chứa số điện thoại gốc và không chứa CCCD gốc
✓ RQ-09/DEC-14 — thân phản hồi tra cứu KHÔNG chứa số gốc > khối application không còn khóa phone và khóa cccdNumber (EV-10)
✓ RQ-09/DEC-14 — thân phản hồi tra cứu KHÔNG chứa số gốc > hai khóa mới mang đúng giá trị đã che, độ dài bằng độ dài gốc (DEC-06)
✓ RQ-09/DEC-14 — thân phản hồi tra cứu KHÔNG chứa số gốc > CCCD trống trả null, KHÔNG trả dấu sao (nền cho nhãn Không cung cấp ở trang)
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

Vì sao hai biến thể RED, và vì sao điều đó quan trọng cho `RISK-02`:

| Biến thể | Trạng thái mã | Kết quả | Điều nó chứng minh |
|---|---|---|---|
| RED-A | Hoàn nguyên nguyên văn: khóa cũ `phone`/`cccdNumber` + giá trị gốc | `RED_A_EXIT=1`, **4 failed** | Test đỏ ở đúng lỗi ban đầu |
| RED-B | Khóa **mới** `phoneMasked`/`cccdMasked` nhưng vẫn gán **giá trị gốc** | `RED_B_EXIT=1`, **3 failed / 1 passed** | Bản sửa "chỉ đổi tên khóa" **vẫn đỏ**. Chính test đi qua là test kiểm sự vắng mặt của khóa cũ ⇒ nếu chỉ kiểm từng khóa thì bản sửa giả đã lọt. Phép đo quyết định là khẳng định trên **chuỗi thân phản hồi** (`DEC-14`) |
| GREEN | Mapper gọi hai hàm che | `GREEN_EXIT=0`, **4 passed** | Lỗi đã đóng ở đúng biên |

### `AC-11` — ba đoạn comment `EV-07` mới, nguyên văn

`src/domains/applications/application.service.ts` (docblock của `PublicTrackingDto`):

```ts
/**
 * Tracking projection for the holder of the 120-bit bearer tracking code.
 * Owner decision (b) of 2026-08-31 SUPERSEDES decision (a) of the same day
 * (go-live-13, RQ-11/DEC-15): the phone and the CCCD leave this process PARTIALLY
 * MASKED as `phoneMasked` / `cccdMasked`, so the raw values are never part of the
 * HTTP response and cannot be recovered with browser devtools. Masking happens
 * here, at the DTO boundary (DEC-01) — not in the route, not in the client. Full
 * name stays verbatim (DEC-07); internal/normalized fields stay omitted.
 */
```

`app/api/public/applications/[trackingCode]/route.ts`:

```ts
// Public tracking (MP-2 RQ-04 + Owner decision (b) of 2026-08-31, which SUPERSEDES
// decision (a) of the same day — go-live-13, RQ-11/DEC-15): the 120-bit tracking
// code is a bearer secret. Its holder sees the submitted full name plus the
// PARTIALLY MASKED phone and CCCD (`phoneMasked`, `cccdMasked`) — never the raw
// values. Masking happens inside `getPublicTracking` (DEC-01), so the originals are
// never part of this response body; this route must not add any key, header or
// attribute carrying them. No normalized/internal review fields. Unknown code →
// generic 404 with no row-existence signal.
```

`app/(jobs)/track/page.tsx`:

```tsx
// MP-2 STEP-05 (RQ-04/RQ-07) + go-live-13 (RQ-11/DEC-15): applicant self-service
// tracking. Looks up a safe status projection by tracking code via
// GET /api/public/applications/:code.
// Owner decision (b) of 2026-08-31 SUPERSEDES decision (a) of the same day: the
// phone and the CCCD are partially masked ON THE SERVER (phone keeps 3 leading +
// 3 trailing characters, CCCD keeps only the last 4), so the raw values are never
// part of the HTTP response and cannot be recovered with browser devtools. This
// page renders the masked strings exactly as received; it never receives the
// originals, and it must never try to reconstruct them. Full name stays verbatim
// (DEC-07). Unknown code → generic "not found" (no existence signal); 429 →
// rate-limit notice. The code is entered by the applicant and is NOT put in the URL.
```

## 4. Changed Deliverables

- **Source/artifact changed — của go-live-13 (8 file):**
  - Mới: `src/shared/privacy/mask.ts` (74 dòng), `src/shared/privacy/mask.test.ts` (114 dòng), `src/domains/applications/tracking-mask.routes.test.ts` (131 dòng).
  - Sửa: `src/domains/applications/application.service.ts` (`+11/-6`), `app/(jobs)/track/page.tsx` (`+15/-10`), `app/api/public/applications/[trackingCode]/route.ts` (`+7/-3`, **chỉ comment**), `src/domains/applications/application.service.test.ts` (`+2/-2`), `src/domains/applications/marketplace-apply.routes.test.ts` (`+4/-4`).
  - Sửa thêm ngoài danh sách `EV-13`: `src/domains/applications/marketplace-inventory.static.test.ts` — numstat cả file là `+43/-19` nhưng **chỉ 4 dòng thuộc go-live-13** (2 xoá + 2 thêm), phần còn lại (58 dòng) là vòng go-live-12 chưa commit của tôi. Bốn dòng của vòng này, nguyên văn từ diff: `-expect(code).toContain('{result.phone}');` / `-expect(code).toContain("{result.cccdNumber || 'Không cung cấp'}");` / `+expect(code).toContain("{result.phoneMasked || 'Không cung cấp'}");` / `+expect(code).toContain("{result.cccdMasked || 'Không cung cấp'}");`.
- **Dependency:** None (không thêm/xoá/nâng gói nào; `npx tsx` chỉ dùng để **đo** `AC-02`, không thêm vào `package.json`).
- **Schema/migration:** None. Không sửa thân hàm SQL, không sửa cột, không sửa dữ liệu đã lưu (`DEC-16` để lại follow-up).
- **Environment/config:** None. Không tạo/sửa biến môi trường, không chạm Vercel/Upstash/DNS.
- **Git diff/commit:** **Not created** (`RQ-14`). `git log origin/main..HEAD` rỗng, `STAGED_COUNT=0`.

`git status --short` nguyên văn:

```
 M app/(jobs)/track/page.tsx
 M app/(portal)/page.tsx
 M app/api/public/applications/[trackingCode]/route.ts
 M docs/tasks/hrp-v5-go-live-02-public-surface-exposure/AUDIT.md
 M docs/tasks/hrp-v5-go-live-04-public-read-rls-closure/AUDIT.md
 M docs/tasks/hrp-v5-hotfix-02-public-jobs-required-relation/AUDIT.md
 M public/index.html
 M src/domains/applications/application.service.test.ts
 M src/domains/applications/application.service.ts
 M src/domains/applications/marketplace-apply.routes.test.ts
 M src/domains/applications/marketplace-inventory.static.test.ts
 M src/domains/job-board/public.service.ts
?? .claude/
?? .neon
?? app/(jobs)/viec-lam/
?? "docs/aff_plan - Copy.md"
?? docs/aff_plan.md
?? docs/tasks/hrp-v5-go-live-12-public-job-detail-page/AUDIT.md
?? docs/tasks/hrp-v5-go-live-12-public-job-detail-page/HANDOFF.md
?? fix.patch
?? rls-probe-insert.txt
?? rls-probe-output.txt
?? scratch/check-rpc-schema-usage.mjs
?? scratch/db-state-check.mjs
?? scratch/golive03-ac-drive.mjs
?? scratch/golive03-ac08-remeasure.mjs
?? scratch/golive03-bigint-probe.mjs
?? scratch/golive03-db-probe.mjs
?? scratch/golive03-greps.ps1
?? scratch/golive03-migr-check.mjs
?? scratch/golive03-rls-gaps.mjs
?? scratch/golive03-seed.mjs
?? scratch/mock-upstash.js
?? scratch/neon-schemadiff-live-vs-mp2test.txt
?? scratch/neon-schemadiff-snapshot-vs-live.txt
?? scratch/run_m1_06b_audit.ps1
?? scratch/run_m1_06c_audit.ps1
?? scratch/seed-hrp-live-demo.sql
?? scratch/seed-mkt-cleanup-probe.mjs
?? scratch/seed-mkt-probe.mjs
?? scratch/test-db.js
?? scratch/test-func.js
?? scratch/test-rpc.js
?? scratch/test-sql.js
?? scratch/test-writer.js
?? scripts/debug-parser.mjs
?? src/domains/applications/tracking-mask.routes.test.ts
?? src/domains/job-board/components/
?? src/domains/job-board/public-detail.meta.ts
?? src/domains/job-board/public-detail.service.test.ts
?? src/domains/job-board/public-detail.static.test.ts
?? src/shared/privacy/
```

Quy thuộc từng dòng — **của vòng go-live-13**: `app/(jobs)/track/page.tsx`, `app/api/public/applications/[trackingCode]/route.ts`, `src/domains/applications/application.service.ts`, `…/application.service.test.ts`, `…/marketplace-apply.routes.test.ts`, 4 dòng trong `…/marketplace-inventory.static.test.ts`, và `?? src/shared/privacy/` + `?? src/domains/applications/tracking-mask.routes.test.ts`.

**Của vòng go-live-12 chưa commit — cũng của tôi, KHÔNG thuộc task này:** `app/(portal)/page.tsx`, `src/domains/job-board/public.service.ts`, 58 dòng còn lại trong `…/marketplace-inventory.static.test.ts`, `?? app/(jobs)/viec-lam/`, `?? src/domains/job-board/components/`, `?? src/domains/job-board/public-detail.meta.ts`, `?? …public-detail.service.test.ts`, `?? …public-detail.static.test.ts`, `?? docs/tasks/hrp-v5-go-live-12-public-job-detail-page/HANDOFF.md`.

**Không phải của tôi, tôi KHÔNG chạm:** `public/index.html`; ba `AUDIT.md` của go-live-02 / go-live-04 / hotfix-02; `docs/tasks/hrp-v5-go-live-12-public-job-detail-page/AUDIT.md` (Tier 3 đang audit go-live-12); `.claude/`, `.neon`, `fix.patch`, `rls-probe-insert.txt`, `rls-probe-output.txt`, `docs/aff_plan.md`, `docs/aff_plan - Copy.md`, toàn bộ `scratch/`, `scripts/debug-parser.mjs`. Tôi không stash, không reset, không restore, không xoá, không `git add` bất cứ thứ gì.

## 5. Deviations, Limitations và Blockers

| ID | Type | Evidence | Impact | Decision needed from Planner |
|---|---|---|---|---|
| `DEV-01` | `Deviation` — `EV-04` của TASK **sai sự thật** | `EV-04` viết: "Đổi tên trường ở service làm file này lỗi biên dịch ngay. Đó là hàng rào mạnh nhất và miễn phí". Thực tế sau khi đổi tên khóa DTO mà **chưa** sửa consumer nào, `npm run typecheck` exit **0**, sạch. Nguyên nhân: `app/(jobs)/track/page.tsx` tự khai `interface TrackingDto` riêng rồi `data.application as TrackingDto` từ `res.json()` kiểu `any` ⇒ không có liên kết cấu trúc với DTO của service; hai file test dùng `toMatchObject` / `Record<string, unknown>` nên cũng không đỏ | Nếu tin `EV-04`, một Tier 2 khác sẽ đổi tên khóa, thấy tsc xanh, kết luận "xong" và **để nguyên trang in giá trị gốc**. Tôi tìm consumer bằng cách **chạy test**, không bằng tsc | Xác nhận cách ghi lại `EV-04` cho các task sau: ở repo này tsc **không** là hàng rào cho đổi tên khóa DTO công khai |
| `DEV-02` | `Deviation` — `DEC-02` và `RQ-03` mâu thuẫn về kiểu | `DEC-02` ghi `phoneMasked: string`; `RQ-03` ghi cả hai khóa là string-hoặc-null. Tôi theo **`RQ-03`**: `phoneMasked: string \| null`. Lý do đo được: `maskPhone` trả `null` thật khi điện thoại trắng (`maskPhone('-- ()') === null`, có test), nên khai `string` sẽ buộc phải nói dối kiểu hoặc dùng non-null assertion | Vì `phoneMasked` có thể `null`, chỗ render điện thoại phải có nhánh dự phòng ⇒ tôi dùng `{result.phoneMasked \|\| 'Không cung cấp'}` theo đúng `RQ-06`. Nếu Planner muốn `string` thì cần đổi cả chính sách cho điện thoại trắng | Chốt: giữ `string \| null` theo `RQ-03` (tôi đã làm), hay sửa `DEC-02`? |
| `DEV-03` | `Deviation` — có **consumer thứ ba** mà `EV-03`/`EV-13` không kể | `npm run test:unit` đỏ tại `src/domains/applications/marketplace-inventory.static.test.ts:276` — một test **so khớp chuỗi mã nguồn** của trang track, đòi `'{result.phone}'` và `"{result.cccdNumber \|\| 'Không cung cấp'}"`. Test kiểu này tsc **không bao giờ** bắt được (nó so chuỗi). Tôi chỉ đổi đúng 2 literal thành hai chuỗi đã che, **không** thêm/xoá khẳng định nào: đếm `expect(` 79 → 79 | File này ngoài hai file mà `AC-10` kể tên. Tôi giữ diff ở mức đổi literal đúng bằng kỷ luật của `AC-10` để Tier 3 kiểm dễ. Tôi **cố ý không** thêm khẳng định phủ định chống hồi quy về `{result.phone}` ở đây, vì làm vậy là mở scope test ngoài contract — hàng rào quyết định đã nằm ở test biên route (`DEC-14`) | Có muốn mở follow-up thêm khẳng định phủ định vào file static test đó không? |
| `DEV-04` | `Deviation` — chạy **hai** biến thể RED thay vì một | `STEP-04` yêu cầu RED rồi GREEN. Tôi chạy RED-A (khoá cũ + giá trị gốc, 4 failed) **và** RED-B (khoá mới + giá trị gốc, 3 failed / 1 passed) | RED-B là bằng chứng trực tiếp cho `RISK-02`: bản sửa "chỉ đổi tên khóa" vẫn đỏ, và test đi qua chính là test kiểm vắng mặt khóa cũ. Nhiều bằng chứng hơn yêu cầu, không ít hơn | None — báo để Tier 3 biết vì sao có ba lần chạy |
| `DEV-05` | `Limitation` — lần `typecheck` đầu **đỏ** vì test mới của tôi | `TYPECHECK_EXIT=2`: `src/domains/applications/tracking-mask.routes.test.ts(42,5): error TS2741: Property 'retryAfterSec' is missing in type … but required in type 'RateLimitDecision'`. Vitest **không** typecheck nên 4 test đã xanh song song với lỗi này. Đã sửa bằng cách thêm `retryAfterSec: 0` vào provider fake (theo đúng quy ước của `marketplace-apply.routes.test.ts:67`), rồi `TYPECHECK_EXIT=0` | Cho thấy "test xanh" một mình không thay được `AC-13`. Không ảnh hưởng hành vi: `retryAfterSec` chỉ được đọc ở nhánh từ chối, còn provider fake này luôn cho phép | None |
| `BLK-01` | `Limitation` — nửa runtime của `AC-06` là `ENV_BLOCKED` | Dev server **lên được**: `✓ Ready in 3s` (Next chọn cổng 3001 vì cổng 3000 đang bị tiến trình khác giữ — tôi **không** chạm tiến trình đó), `GET /track` = `HTTP=200`, `BYTES=22017`, 0 lỗi compile. Nhưng bước "tra một mã tổng hợp" thì tôi **không** chạy, vì hai lý do đo được: (1) `.env.local` **không** khai `DATABASE_URL` (`DATABASE_URL_DEFINED_IN_ENV_LOCAL_COUNT=0`) ⇒ URL hiệu lực đến từ `.env`, tức DB **production**; một lần tra cứu là một lần nối vào production, điều bị cấm; (2) mã **tổng hợp** thì không có hàng ⇒ trả `404` theo đúng thiết kế, không thể hiện giá trị đã che, còn muốn thấy giá trị đã che thì phải dùng **mã tra cứu thật của người thật**, mà `RQ-12`/`AC-12` cấm tuyệt đối và `RISK-08` gọi đúng tên | `AC-09` đã đo **đúng thân phản hồi mà trang nhận**, và diff của trang chỉ có kiểu + hai chỗ render, nên khoảng trống còn lại chỉ là "mắt người xem pixel". TASK cho phép `ENV_BLOCKED` cho riêng `AC-06` kèm nguyên văn, và `AC-09` xanh | Ai sẽ xác nhận bằng mắt trên môi trường có DB hợp lệ: Owner tự tra sau khi deploy, hay Tier 3 chạy trên branch test `hrp_mp2_test`? Tôi không tự quyết và không tự seed |
| `BLK-02` | `Limitation` — bán kính file rộng hơn allowlist của `AC-14` | `AC-14` đòi danh sách file đổi nằm trọn trong `src/shared/privacy/`, `src/domains/applications/`, `app/(jobs)/track/page.tsx`, `app/api/public/applications/[trackingCode]/route.ts`. Cây làm việc còn `app/(portal)/page.tsx`, `src/domains/job-board/**` và 58 dòng trong `marketplace-inventory.static.test.ts` — **vòng go-live-12 chưa commit của chính tôi**, đã quy thuộc từng file ở §4 | Không phải rác của người khác và cũng không thể dọn: dọn là xoá vòng go-live-12 đang được Tier 3 audit (`AUDIT.md` của go-live-12 đã xuất hiện trong cây). Toàn bộ thay đổi của go-live-13 **nằm trong** allowlist | Xác nhận cách đọc `AC-14` khi hai task chưa commit chồng cây: đo theo **quy thuộc từng file** như tôi đã ghi, hay yêu cầu commit go-live-12 trước? Tôi không có uỷ quyền commit |
| `BLK-03` | `Limitation` — HEAD di chuyển giữa vòng, và **TASK của go-live-12 đã bump v1.1** | `git log cd669d6..HEAD` = `835f893 docs(planner): bump go-live-12 to v1.1 to fix three of my own AC defects`, chạm `docs/PLANNER_HANDOVER.md` + `docs/tasks/hrp-v5-go-live-12-public-job-detail-page/TASK.md`, `AHEAD=0 BEHIND=0`. Giao với 8 file của tôi: **0** (`INTERSECT_EXIT=1`). TASK của **go-live-13** không bị chạm và không dirty | Không ảnh hưởng go-live-13. Nhưng HANDOFF go-live-12 tôi đã nộp được đo theo **v1.0**, còn contract giờ là **v1.1** sửa ba defect AC ⇒ go-live-12 gần như chắc cần vòng 2 | Xác nhận: sau go-live-13, tôi nhận lại `/code hrp-v5-go-live-12-public-job-detail-page` theo v1.1? |

Ngoài `AC-06`, không có stop condition nào của TASK bị chạm: tôi **không** sửa thân hàm SQL, **không** thêm migration, **không** đổi cột hay dữ liệu đã lưu, **không** xoá/đổi khóa nào khác của `PublicTrackingDto`, **không** đổi rate limit / status code / thông điệp lỗi của route tra cứu, **không** che họ tên (`DEC-07` cần Owner). Tôi cũng **không** tìm thấy đường công khai thứ hai nào phát tán điện thoại hay CCCD ⇒ `EV-03` đúng ở phần đó.

## 6. Evidence Index

Chỉ liệt kê artifact lớn; output ngắn đã ở §3.

| Evidence | Path | Proves |
|---|---|---|
| `E-01` | `src/shared/privacy/mask.ts` | `AC-01`, `AC-02` — module chính sách, hai export, hằng số cửa sổ private |
| `E-02` | `src/shared/privacy/mask.test.ts` | `AC-08` — 12 test, có nhóm bất biến |
| `E-03` | `src/domains/applications/tracking-mask.routes.test.ts` | `AC-09` — RED/GREEN trên thân phản hồi đã tuần tự hoá |
| `E-04` | `git diff -- src/domains/applications/application.service.ts` | `AC-03`, `AC-04` — 4 hunk, `SELECT` không đổi |
| `E-05` | `git diff -- 'app/(jobs)/track/page.tsx'` | `AC-06` — kiểu + hai chỗ render |
| `E-06` | `git diff -- app/api/public/applications/` | `AC-05` — chỉ comment |
| `E-07` | `git status --short` (in nguyên văn ở §4) | `AC-14` — không commit, `STAGED_COUNT=0`, bán kính đã quy thuộc |

## 7. Execution Round History

| Round | Spec version | Status | Summary |
|---|---|---|---|
| `1` | `v1.0` | `READY_FOR_AUDIT` | STEP-01..06 xong. Ba gate `typecheck`/`lint`/`test:unit` đều exit 0, 97 file / 1464 test (+16). `AC-01..AC-05`, `AC-07..AC-14` có bằng chứng đo được; `AC-06` xanh phần diff và phần trang trả `200`, `ENV_BLOCKED` phần tra mã kèm lý do đo được. Năm deviation (`DEV-01..DEV-05`) và ba limitation (`BLK-01..BLK-03`) cần Planner chốt. Không commit, không push, không deploy |

> Handoff status: `READY_FOR_AUDIT`
