# HANDOFF — V5-OPS-06A Marketplace Launch Hardening

| | |
|---|---|
| Task | `docs/tasks/hrp-v5-ops-06a-marketplace-launch-hardening/TASK.md` (Spec v1.0, status `REVISION_REQUIRED`) |
| Tier | 2 (Engineer) — execute contract → HANDOFF; KHÔNG self-audit |
| **Execution round** | **4** — targeted ownership/evidence repair (round 1 ENV_BLOCKED, round 2 FAIL, round 3 FAIL) + đóng finding **PLN-04** theo phân công tường minh của sếp |
| Audit round đang mở | 3 → verdict `FAIL / PROVIDER_CONFIG_DEFECT + AUDITOR_INDEPENDENCE_BREACH` |
| Baseline task | `d9a1067` · HEAD lúc bắt đầu round 4 = `25b9928` (không đổi — tôi không commit) |
| Ngày | 2026-08-28 |
| Working tree | **SHARED** — WIP stream song song (layout metadata, `.neon`, `scratch/**`, `docs/aff_plan*`). KHÔNG chạm file not-mine, KHÔNG commit/push/deploy. |

Tôi (Tier 2) báo cáo sếp round 4. Mandate của round này KHÔNG phải viết lại feature — TASK.md §9 (dòng audit round 3) ghi rõ: *"Mở execution round 4 chỉ để phục hồi ownership và evidence: Tier 2 phải review/adopt hoặc sửa LIVE test, không dùng `KEYS` cho cleanup; dùng namespace duy nhất + exact known keys/TTL, rồi cập nhật HANDOFF. Không yêu cầu viết lại production code nếu review không phát hiện defect."*

Tôi đã làm đúng bốn việc đó, và **review CÓ phát hiện 1 defect production** (§5) nên tôi sửa đúng defect đó, không hơn.

**Bổ sung sau đó (cùng round 4):** finding **PLN-04** — dòng `console.log` in PII ứng viên ở `application.service.ts` — ban đầu tôi phát hiện nhưng **từ chối tự sửa** vì file không thuộc partition của tôi. Sếp đã **phân công tường minh** cho tôi đóng finding này với phạm vi cứng: xoá đúng dòng đó + bổ sung regression evidence + chạy lại gate. §6 nay là **báo cáo đóng PLN-04**, không còn là báo cáo "P0 của người khác".

Bản HANDOFF này **thay thế toàn bộ** bản round 1 trước đó (bản cũ nói "round 1 / ENV_BLOCKED" — đã lạc hậu so với trạng thái thật của repo).

---

## 1. Round 4 — bốn deliverable, map 1-1 với mandate

| Mandate §9 | Việc tôi làm | File |
|---|---|---|
| review/adopt hoặc sửa LIVE test | Adopt + sở hữu file test Tier 3 đã commit, review từng dòng, validate fixture `slotId` với hợp đồng route thật | §2 |
| không dùng `KEYS` cho cleanup | Xoá **cả hai** chỗ gọi `redis.keys(...)`; cleanup bằng exact key đã biết | §3 |
| dùng namespace duy nhất + exact known keys/TTL | Dựng đúng key SDK ghi + assert `EXISTS`/`TTL` có chặn trên | §3 |
| cập nhật HANDOFF | File này | — |
| (thêm, do review) | Sửa defect DEC-12 trong adapter + khoá lại bằng unit test | §5 |
| (thêm, sếp phân công) | Đóng **PLN-04**: xoá `console.log` PII trong service + 7 test regression + mutation check | §6 |

## 2. Ownership: tôi nhận và sở hữu LIVE test từ round 4

`src/domains/applications/live-integration.ops06a.test.ts` được **Tier 3 commit trong `7ed57a5`** cùng lúc với `AUDIT.md` — đây chính là `AUDITOR_INDEPENDENCE_BREACH` mà Planner ghi nhận ở §9. Từ round 4, **file này là của tôi**: tôi đã đọc lại toàn bộ, giữ những gì đúng, sửa những gì sai, và chịu trách nhiệm về nó.

Review từng phần Tier 3 đã sửa:

| Thay đổi của Tier 3 | Kết luận review của tôi | Cách xác minh |
|---|---|---|
| Thêm fixture `staffing_order_slots` + truyền `slotId` vào body | **ĐÚNG, adopt nguyên** | `slotId` có mặt trong `ACCEPTED_FIELDS` **và** `STRING_FIELDS` của `app/api/public/jobs/[slug]/applications/route.ts`, và được đẩy xuống definer dưới dạng `slotId: body.slotId ?? null` ⇒ fixture không gây 400 |
| `redis.keys(...)` cho cleanup + cho assert DEC-05 | **SAI, đã thay** | `KEYS` là lệnh quét toàn keyspace, cần quyền cao hơn hẳn nhu cầu thật và chính nó cũng `NOPERM` ở round 2/3 (§3) |
| `let config: any` + handle redis chỉ khai `keys`/`del` | **SAI, đã thay** | `any` che mất lỗi kiểu; handle giờ là interface tối thiểu 4 lệnh, cố tình KHÔNG có `keys` ⇒ "không quét keyspace" thành bất biến ở mức KIỂU (§3) |

## 3. Bỏ `KEYS`: dựng ĐÚNG key mà SDK ghi, không đoán

Tôi không thay `KEYS` bằng `SCAN` (vẫn là quét). Tôi đọc source SDK đã cài để biết key thật, rồi dựng lại:

| Bằng chứng trong `node_modules/@upstash/ratelimit/dist/index.mjs` (2.0.8) | Ý nghĩa |
|---|---|
| `887: const key = this.getKey(identifier)` · `891: this.limiter().limit(this.ctx, key, req?.rate)` | limiter nhận key **đã có prefix** |
| `969-970: getKey = (identifier) => [this.prefix, identifier].join(":")` | `prefix:identifier` |
| `1548: static slidingWindow` · `1553: currentWindow = Math.floor(now / windowSize)` · `1554: currentKey = [identifier, currentWindow].join(":")` | thêm `:${windowIndex}` |
| `246: redis.call("PEXPIRE", currentKey, window * 2 + 1000)` (Lua, singleRegion slidingWindow) | TTL **luôn được set** ở lần INCRBY đầu, chặn trên `windowSec*2 + 1` giây |

⇒ Key thật là **`${prefix}:${identifier}:${floor(now/windowMs)}`**, với `prefix = keyPrefixFor(config, rule) = hrp:rl:v1:ops06a-live:APPLY_IP`.

Helper `exactWindowKeys(config, rule, subjectPart, nowMs)` dựng đúng công thức đó cho **ba bucket liền kề** (`window-1`, `window`, `window+1`) nên test không lệch khi run vắt qua ranh giới window.

| Trước (Tier 3, round 2/3) | Sau (tôi, round 4) |
|---|---|
| cleanup: `redis.keys('hrp:rl:v1:ops06a-live:*<digest>*')` rồi `del(...)` | `redis.del(...exactWindowKeys(config, rule, identifier))` — không quét |
| DEC-05: `keys('…APPLY_IP*')` rồi kiểm tra chuỗi | `EXISTS` trên key digest (≥1 trong 3 bucket) + `TTL` ∈ `(0, windowSec*2+1]` + `EXISTS` trên key dựng từ **RAW subject** phải `= 0` |

Assertion DEC-05 giờ **mạnh hơn** bản cũ: bản cũ chỉ nói "trong các key tìm được có key chứa digest"; bản mới chứng minh **key dựng từ raw subject KHÔNG tồn tại** và counter **có TTL hữu hạn** (không rò rỉ vĩnh viễn).

Quyền token TEST cần sau round 4 — đúng 4 lệnh, khai báo thành kiểu:

```ts
interface MinimalRedisClient {
  eval(script: string, keys: string[], args: unknown[]): Promise<unknown>;
  exists(...keys: string[]): Promise<number>;
  ttl(key: string): Promise<number>;
  del(...keys: string[]): Promise<number>;
}
```

`EVAL` là **bắt buộc, không thể tránh**: sliding window của `@upstash/ratelimit` chạy bằng Lua. Nếu DEL bị từ chối thì key vẫn tự hết hạn theo TTL ở trên, nên cleanup không phải là điểm chết cứng nữa.

## 4. Capability preflight — audit round 4 phân biệt được provider defect vs code defect

`beforeAll` của lane AC-01 giờ probe `EVAL 'return 1'` trước mọi assertion. Nếu `NOPERM`, test fail **bằng câu chữ của tôi**, KHÔNG in raw provider error / URL / token (DEC-12):

> `PROVIDER/CONFIG DEFECT — token Redis TEST KHÔNG có quyền scripting (EVAL/EVALSHA), thứ mà @upstash/ratelimit bắt buộc phải dùng. Cần ghép Standard REST token với REST URL của CÙNG một Redis TEST cô lập. Đây KHÔNG phải code defect: adapter/route không thể đổi được kết quả này.`

Lỗi khác (không phải NOPERM) ⇒ thông điệp `ENV DEFECT` chỉ vào URL/kết nối. Đây là thứ round 2/3 thiếu: audit đọc được `UpstashError` thô rồi phải tự suy luận, còn round 4 thì lane tự phân loại.

## 5. Review production: 1 defect thật, đã sửa đúng chỗ đó

Trong `src/shared/security/rate-limit-upstash.ts` (file production của tôi, **chưa từng được commit** — cả `src/shared/security/` vẫn `??` untracked) tồn tại ở đầu round 4:

```ts
} catch (err) {
  console.error('UPSTASH RAW ERROR:', err);      // ← defect
  throw new RateLimitUnavailableError('PROVIDER_ERROR');
}
```

Đây là **vi phạm DEC-12** ("không log … raw provider error"): message của Upstash mang endpoint và scope token, lại đi trực tiếp ra `console` nên vòng qua luôn logger đã sanitize của OPS-04a. Nó cũng chính là đường mà `UpstashError: NOPERM … 'evalsha'` hiện nguyên văn trong console output của audit round 2/3.

Tôi **không xác định được ai viết dòng đó** — file untracked nên git không có lịch sử để đối chiếu, và tôi không đoán. Tôi chỉ báo: dòng đó có trong tree khi round 4 bắt đầu, và tôi đã xoá:

```ts
} catch {
  // DEC-12: raw provider error KHÔNG được log hay ném tiếp — message của Upstash có thể
  // mang endpoint/scope của token. Chỉ reason code đi ra ngoài. Việc phân loại capability
  // (ví dụ NOPERM scripting) thuộc LIVE lane, KHÔNG phải production log.
  throw new RateLimitUnavailableError('PROVIDER_ERROR');
}
```

**Khoá lại bằng test, không bằng lời**: `rate-limit-adapters.test.ts` có thêm 1 test spy cả 5 method `console` (`log/info/warn/error/debug`) khi limiter throw một canary mang đúng hình dạng lỗi thật (`NOPERM … 'evalsha' … https://…`), rồi assert **không method nào được gọi**. Test cũ chỉ soi giá trị được *throw*, nên nó không bắt được `console.error` — đó đúng là lý do defect lọt qua 3 round. Unit lane adapters: 8 → **9 test**.

Ngoài dòng này, review **không phát hiện defect production nào khác**, nên theo đúng câu điều kiện của Planner tôi **không viết lại** port/guard/identity/memory/provider/request-body/retired-endpoint và **không** sửa 5 route. Tôi cũng cân nhắc rồi **bỏ** ý định thêm reason code riêng cho NOPERM: `RateLimitUnavailableReason` là union đóng thuộc hợp đồng, việc phân loại capability đã nằm ở LIVE lane (§4) là đủ.

## 6. PLN-04 ĐÃ ĐÓNG — xoá log PII trong service, khoá bằng 7 test + mutation check

Sếp phân công tôi đóng finding này ngay trong round 4, phạm vi cứng: **xoá đúng dòng log, bổ sung regression evidence, chạy lại gate**. Tôi làm đúng phạm vi đó.

**Dòng đã xoá** — `src/domains/applications/application.service.ts`, nằm giữa `generateTrackingCode()` và `try {`:

```ts
console.log('calling hrp_public_apply_submission with:', { slug, slotId, fullName, phone: input.phone, trackingCode });
```

Nó in **họ tên thật + số điện thoại thật + tracking code** của ứng viên ra server log ở **mọi** lần apply public — vi phạm trực tiếp DEC-12 (*"Không log request body, phone, tracking code…"*) và là rò rỉ PII thật, không phải rủi ro lý thuyết.

Provenance (tôi xác minh LẠI ở lượt này, không suy diễn):

```
git show d9a1067:src/domains/applications/application.service.ts | grep -n console   → (rỗng)
git show HEAD:src/domains/applications/application.service.ts     | grep -n console   → (rỗng)
```

⇒ dòng đó KHÔNG có ở baseline `d9a1067`, KHÔNG có ở `HEAD 25b9928` — nó chỉ tồn tại trong working tree (debug log chưa commit). Vì nó là thay đổi **duy nhất** của file trong tree, xoá nó ⇒ file trở lại **byte-identical** với commit đã được audit. Đó cũng là bằng chứng đóng mạnh nhất, Tier 3 kiểm bằng đúng hai lệnh:

```
git diff HEAD --stat -- src/domains/applications/application.service.ts
  (không output)                          SERVICE_DIFF_EXIT=0
git status --porcelain -- src/domains/applications/application.service.ts
  (không output)                          SERVICE_STATUS_CLEAN=0
```

⇒ file đã **RỜI KHỎI `git status`**; đầu round 4 nó còn là ` M`. Tôi không sửa gì khác trong file: 231 → 230 dòng, đúng một dòng bị xoá.

### 6.1 Regression evidence — 7 test mới, hai lớp độc lập

| Lớp | File | +Test | Nội dung |
|---|---|---|---|
| Runtime — service gọi TRỰC TIẾP | `src/domains/applications/marketplace-apply.routes.test.ts` | 3 | apply happy · definer lỗi (P0012 map được **và** lỗi lạ rethrow thô) · tracking projection (có row / không row) |
| Runtime — route THẬT + service THẬT | cùng file | 2 | 201 happy · nhánh lỗi lạ 500 của route |
| Tĩnh — đọc chính source | `src/domains/applications/marketplace-inventory.static.test.ts` | 2 | service không còn `console.` nào · route chỉ có ĐÚNG 1 console và là marker cố định |

Cả 5 test runtime spy **CẢ 5 method** `console` (`log/info/warn/error/debug`) và gom TOÀN BỘ argument thành chuỗi qua `util.inspect(depth: 6)` — nên một `console.log('…', { fullName })` với PII nằm trong **object lồng nhau** vẫn bị bắt, không chỉ chuỗi phẳng.

Vì sao 26 test cũ của file không thể bắt: chúng soi response JSON, log **có cấu trúc** (`__captureSink`) và tham số definer — **không có gì chặn `console` thô**. Đây đúng là lỗ hổng đã để defect §5 sống qua 3 round, nay bịt cho cả hai chỗ.

Chi tiết assertion đáng chú ý:

- **Chống "xanh giả"**: test happy path assert canary VẪN đi xuống definer — `args[2] === fullName`, `args[3] === phone`, `args[16]` khớp `^APP-[0-9A-Z-]+$` ⇒ test xanh KHÔNG phải vì đường ghi bị vô hiệu hoá.
- Test route+service assert **hai kênh**: `console` trắng tuyệt đối **và** `JSON.stringify(logs)` (kênh OPS-04a) không chứa canary nào.
- Test nhánh lỗi lạ **pin** `console.error('[public apply] unexpected error', e)`: dòng này có ở baseline `d9a1067` **và** ở `HEAD` (xác minh bằng `git show … | grep -n console` → cùng nội dung, line 81), **không phải của tôi**. Assert: marker cố định phải có mặt, và KHÔNG canary nào bị route nối vào. Lỗi dùng để test không mang canary ⇒ mọi canary xuất hiện đều là do code tự thêm.
- Test tĩnh route: regex bắt mọi `console.\w+(…)` trong source, đòi **đúng 1** kết quả, và literal đó không được chứa `fullName|phone|cccd|tracking|consent|body|payload|${`.

### 6.2 Mutation check — chứng minh guard KHÔNG rỗng

Test "không có gì xảy ra" rất dễ xanh một cách vô nghĩa. Nên tôi **thêm lại đúng dòng đã xoá**, chạy 2 file, rồi revert:

```
(1) thêm lại y nguyên dòng console.log PII
npx vitest run --config vitest.unit.config.ts <marketplace-apply.routes + marketplace-inventory.static>
  Tests  5 failed | 45 passed (50)        MUTATION_EXIT=1
  × apply thành công: KHÔNG method console nào được gọi, dù dữ liệu VẪN xuống definer
      AssertionError: expected 'calling hrp_public_apply_submission w…' to be ''
  × definer lỗi (SQLSTATE map được VÀ lỗi lạ rethrow thô) vẫn KHÔNG ghi gì ra console
  × route + service THẬT: 201 mà console trắng, và log có cấu trúc cũng không mang canary
  × nhánh lỗi lạ của route: chỉ marker cố định ra console, KHÔNG kèm field request nào
      AssertionError: expected '…' not to contain 'PLN04-NAME-CANARY'
  × PLN-04: service apply/tracking KHÔNG có kênh console nào        [static]

(2) revert dòng đó
  Tests  50 passed (50)                   REVERT_EXIT=0
  git diff HEAD -- src/domains/applications/application.service.ts   → rỗng
```

⇒ guard **bites**: nếu ai đó thêm lại dòng debug này, unit lane fail ngay và tên canary hiện nguyên trong output. Test tracking projection đúng ra KHÔNG fail (tracking không đi qua đường apply) — 5/7 fail là con số đúng, không phải 7/7.

### 6.3 Scan độc lập sau khi xoá

```
grep -rn "console\." app/api/public src/domains/applications/application.service.ts \
    src/domains/applications/apply-helpers.ts src/shared/security/*.ts  (trừ *.test.ts)
  → app/api/public/jobs/[slug]/applications/route.ts:165: console.error('[public apply] unexpected error', e);
    (ĐÚNG 1 dòng — marker baseline, không phải PII)

grep -rn -E "console\.[a-z]+\([^)]*(fullName|phone|cccd|dateOfBirth|trackingCode|tracking_code|idempotencyKey|normalizedPhone)" app src
  → NONE

grep -rn -E "log(Info|Warn|Error|Debug)?\([^)]*(fullName|input\.phone|cccdNumber|trackingCode)" app/api/public src/domains/applications
  → NONE   (kênh logger có cấu trúc cũng sạch)
```

**Điều tôi KHÔNG làm ở PLN-04** (giữ đúng phạm vi sếp giao): không refactor service, không đổi chữ ký hàm, không sửa `console.error` marker của route (dòng baseline, ngoài finding), không chạm `logger.ts`, không sửa file nào khác trong `src/domains/applications/`.

## 7. Evidence THẬT — trạng thái cuối cùng của tree, round 4

```
npx tsc --noEmit
  TSC_EXIT=0        (không output; `any` đã bị loại khỏi LIVE test mà vẫn xanh)

npx vitest run --config vitest.unit.config.ts <7 file unit lane của task>
  Test Files  7 passed (7)
  Tests       120 passed (120)
  FOCUSED7_EXIT=0
  (apply 31 · config 23 · inventory 19 · guard 13 · request-body 13 · browse 12 · adapters 9)
  ↑ apply 26→31, inventory 17→19: +7 test PLN-04 (§6.1). Tổng 113 → 120.

npm run test:unit
  Test Files  91 passed (91)
  Tests       1408 passed (1408)      (1401 → 1408 = +7 test PLN-04)
  UNIT_EXIT=0

npx eslint .
  ✖ 492 problems (0 errors, 492 warnings)
  LINT_EXIT=0       (0 error; warning là nền sẵn có của repo)

npx prisma validate
  The schema at prisma\schema.prisma is valid 🚀
  PRISMA_EXIT=0

npm run build
  BUILD_EXIT=0        (chạy LẠI SAU khi xoá dòng PLN-04 — không phải kết quả cũ)
  ⚠ chạy trong môi trường KHÔNG có UPSTASH_* / RATE_LIMIT_HASH_SECRET
    ⇒ chính là bằng chứng lazy-config của RQ-01

verify-task.ps1 -TaskPath docs\tasks\...\TASK.md
  [WARN] Task is not READY_FOR_EXECUTION; placeholder checks are non-blocking.
  RESULT: DRAFT-VALID (1 warning(s)).
  VERIFY_TASK_EXIT=0
  (WARN là đúng: TASK đang ở `REVISION_REQUIRED` cho round 4, không phải READY_FOR_EXECUTION)

git diff --check (scope file của tôi)
  DIFF_CHECK_EXIT=0

── PLN-04, hai lệnh Tier 3 tái lập được trong 5 giây (chi tiết §6.2/§6.3) ──
git diff HEAD --stat -- src/domains/applications/application.service.ts
  (không output)      SERVICE_DIFF_EXIT=0
git status --porcelain -- src/domains/applications/application.service.ts
  (không output)      SERVICE_STATUS_EXIT=0
  ⇒ file đã về ĐÚNG trạng thái HEAD `25b9928`: dòng debug PII là modification
    DUY NHẤT của nó trong working tree, xoá xong thì diff rỗng. Đây là bằng
    chứng mạnh hơn review diff: không còn diff nào để review.

mutation check (thêm LẠI đúng dòng PLN-04 rồi chạy 2 file test)
  Tests  5 failed | 45 passed (50)     MUTATION_EXIT=1
  → revert → Tests 50 passed (50)      REVERT_EXIT=0, diff rỗng lại
```

**LIVE file collect được và self-skip fail-closed** (chạy bằng integration config, không có TEST env):

```
npx vitest run --config vitest.integration.config.ts src/domains/applications/live-integration.ops06a.test.ts
  ↓ src/domains/applications/live-integration.ops06a.test.ts (6 tests | 6 skipped)
  Test Files  1 skipped (1) · Tests 6 skipped (6)
  LIVE_SELFSKIP_EXIT=0
```

Đây là bằng chứng file **không crash lúc import** (kiểu, helper, interface đều hợp lệ) và **không giả PASS** khi thiếu env. Còn dưới unit lane thì file bị loại hoàn toàn:

```
npx vitest run --config vitest.unit.config.ts src/domains/applications/live-integration.ops06a.test.ts
  No test files found, exiting with code 1
  UNIT_EXCLUDE_EXIT=1
```

Exit 1 ở đây là **"filter không khớp file nào"** vì file nằm trong exclude list của unit lane — **không phải test fail**. Xin Tier 3 đọc đúng nghĩa này.

## 8. Điều tôi KHÔNG chứng minh được ở round 4 — và ai chứng minh được

```
npm run test:integration
  ENV_BLOCKED
  [integration-preflight] DATABASE_URL_TEST is not set...
  Integration lane NOT run — this is a BLOCKED state, not a PASS.
  INTEGRATION_EXIT=0   (exit 0 by design — preflight fail-closed, KHÔNG phải PASS)
```

Probe **CHỈ TÊN BIẾN** trên process env: cả 6 tên opt-in đều **UNSET** — `OPS06A_LIVE_CHECK`, `UPSTASH_REDIS_REST_URL_TEST`, `UPSTASH_REDIS_REST_TOKEN_TEST`, `RATE_LIMIT_HASH_SECRET_TEST`, `DATABASE_URL_TEST`, `DATABASE_URL_ADMIN_TEST`. Ba tên runtime chỉ tồn tại trong `.env.example` với **giá trị rỗng**. Tôi không đọc và không in giá trị của bất kỳ biến nào.

⇒ **AC-01, AC-03 (nửa Redis), AC-10 vẫn CHƯA có evidence runtime từ session của tôi.** Tôi KHÔNG claim chúng PASS và KHÔNG mock chúng để lấy màu xanh. Round 4 của tôi sửa **công cụ đo**; người **chạy** phép đo là Tier 3 sau khi sếp cấp token.

Điều kiện tiên quyết cho audit round 4 (đúng như §9 TASK.md ghi cho Owner): ghép **Standard REST token** với **REST URL của cùng một Redis TEST cô lập** (không dùng token production). Sau đó:

| Kết quả Tier 3 nhìn thấy | Kết luận đúng |
|---|---|
| 6 test LIVE PASS | AC-01/03/10 đóng |
| Fail với câu `PROVIDER/CONFIG DEFECT — token … KHÔNG có quyền scripting` | **Vẫn là provider/config defect**, không phải code defect — token vẫn thiếu quyền EVAL |
| Fail với câu `ENV DEFECT — … không phải NOPERM` | URL/kết nối Redis TEST sai, không phải code |
| Fail với message khác | Lúc đó mới là nghi vấn code — xin ghi rõ vào AUDIT |

## 9. Git partition — delta round 4

**Sửa trong round 4 (của tôi, 3 file):**
- `src/shared/security/rate-limit-upstash.ts` — xoá `console.error` raw provider error (§5). *(file untracked, không có diff vs HEAD)*
- `src/shared/security/rate-limit-adapters.test.ts` — +1 test DEC-12 console-silence (§5). *(untracked)*
- `src/domains/applications/live-integration.ops06a.test.ts` — bỏ 2 chỗ `KEYS`, thêm `MinimalRedisClient` + `exactWindowKeys` + preflight capability, `config: any` → `RateLimitConfig` (§2/3/4). `git diff --stat HEAD` = **1 file, 94 insertions(+)** trên nền commit `7ed57a5`.

**Thêm vào partition round 4 theo phân công tường minh của sếp (§6):**
- `src/domains/applications/application.service.ts` — **xoá** dòng `console.log` in `fullName` + `phone` + `trackingCode`. Net effect = **zero diff**: dòng đó là modification duy nhất của file trong working tree, nên xoá xong file **về đúng byte HEAD `25b9928`** và **biến khỏi `git status`** (trước round này nó là ` M`). Tôi không refactor, không đổi logic, không chạm dòng nào khác trong file.
- `src/domains/applications/marketplace-apply.routes.test.ts` — +5 test runtime console-silence (26 → 31). *(untracked)*
- `src/domains/applications/marketplace-inventory.static.test.ts` — +2 detector tĩnh (17 → 19). *(untracked)*

**Giữ nguyên từ round 1-3** (không sửa gì trong round 4): 8 file production `src/shared/security/**`, 1 file test `src/domains/applications/marketplace-browse.routes.test.ts`, 3 file test còn lại `src/shared/security/*.test.ts`, 5 route + 2 trang UI, `.env.example`, `package.json`, `package-lock.json`, `vitest.integration-files.ts`, `vitest.unit.config.ts`, `vitest.integration.config.ts`. Hai file `src/domains/applications/rate-limit.ts` + `rate-limit.test.ts` vẫn ở trạng thái **đã xoá** (limiter RAM per-instance).

**KHÔNG phải của tôi — tôi không chạm, không stash/reset/delete:** `app/layout.tsx`, `app/admin|ctv|vendor|worker/layout.tsx`, `.neon/**`, `docs/aff_plan*`, `docs/HRP_REMAINING_ROADMAP.md`, `scratch/**`, `scripts/debug-parser.mjs`, `docs/PLANNER_HANDOVER.md`, `TASK.md`, `AUDIT.md`. Riêng `app/api/public/jobs/[slug]/applications/route.ts` tôi **đọc mà không sửa**: `console.error('[public apply] unexpected error', e)` ở dòng 165 có sẵn ở cả `d9a1067` và HEAD `25b9928`, là marker cố định không nội suy field request — tôi khoá nó bằng detector tĩnh (§6.1) chứ không tự ý đổi baseline.

## 10. Hợp đồng hành vi (không đổi từ round 1 — để Tier 3 không phải tra ngược)

Rule matrix (DEC-04): `JOB_BROWSE` ip 120/60s (list + detail **chung một bucket**) · `TRACKING_IP` ip 20/60s · `TRACKING_CODE` tracking code 10/60s · `APPLY_IP` ip 10/600s · `APPLY_PHONE` phone normalize 5/3600s. `UNKNOWN_BUCKET_DIVISOR = 4` (chỉ subject `ip`), `RATE_LIMIT_UNAVAILABLE_RETRY_AFTER_SEC = 5`, prefix `hrp:rl:v1:${envLabel}:${surface}`.

Thứ tự phòng thủ: browse → guard trước mọi `$transaction`; tracking → `TRACKING_IP` → `TRACKING_CODE` → query → projection allow-list → `no-store`; apply → `APPLY_IP` (**`req.bodyUsed === false`** khi deny) → `readCappedJson` 415/413/400 → shape 400 → `cv` non-null 422 → normalize phone → `APPLY_PHONE` → idempotency key → `$transaction`; `POST /api/jobs` + `POST /api/jobs/apply` → 410 ngay, handler **không nhận `req`**.

Failure matrix: vượt bucket **429** + `Retry-After` + `X-RateLimit-*` + `no-store` (không chứa identifier/digest) · limiter lỗi hoặc thiếu config ở production **503 `RATE_LIMIT_UNAVAILABLE`** + `Retry-After: 5` (**fail-closed, không fallback RAM**) · content-type sai **415** · body > 16 KiB **413** · JSON/field sai **400** (không echo giá trị) · `cv` non-null **422 `CV_UPLOAD_DISABLED`** · thiếu consent **422** · legacy **410 `APPLY_ENDPOINT_RETIRED`** (không `Location`) · tracking không tồn tại **404** generic · duplicate `P0012` **409** · happy path **201** chỉ `{ trackingCode, status }`.

## 11. Residual — vẫn là SUBSET của OPS-06A/OPS-02

- Quick Apply và các surface apply khác **chưa** lên canonical contract.
- **Limiter RAM của worker portal vẫn còn** (§4.2 protected path, ngoài scope).
- OPS-02/OPS-06 đầy đủ (session invalidation, OTP limiter, CSRF, security header site-wide, signed URL, backup/restore, bulk export guard): **không có gì được làm**.
- Nửa LIVE của STEP-05 (Redis phân tán thật + DB) **chưa xác nhận runtime** (§8).
- Ma trận LIVE của MP-2 (`live-integration.mp2.test.ts`, `security-boundary.mp2.test.ts`) **chưa chạy lại** vì integration lane ENV_BLOCKED.

## 12. Risk trước khi mở public

1. **P0 — chưa provision Upstash thì MỌI route public trả 503.** Ba biến hiện chỉ có TÊN trong `.env.example`. Theo DEC-02 không có fallback RAM. Phải set env trên Vercel **trước** khi deploy. Tôi không provision, không deploy, không chạm Vercel/Upstash/DNS.
2. `RATE_LIMIT_HASH_SECRET` đổi ⇒ mọi digest đổi ⇒ bucket reset một lần. Là secret có vòng đời, không rotate giờ cao điểm.
3. Traffic preview/edge không có IP xác định dùng chung bucket `unknown` đã siết /4 — có thể tự chặn nhau khi test trên preview. Đánh đổi cố ý của DEC-07.
4. Logger OPS-04a over-redact: `errorCode: 'RATE_LIMIT_UNAVAILABLE'` (22 ký tự) bị rewrite thành `[REDACTED]` bởi `SENSITIVE_VALUE_RE`. Fail-safe, cosmetic — reason code thật nằm ở `detail.reason`. Tôi **cố ý không** nới sanitizer và không chạm `logger.ts`.
5. LIVE test dùng `@ts-expect-error` khi import `pg` vì repo không có `@types/pg`. Chỉ trong file test, không vào bundle production.
6. Client cũ gửi `cv: null` vẫn được nhận (tương thích ngược); mọi `cv` non-null bị 422. Cắt cứng hoàn toàn cần một round riêng.

*(PLN-04 đã rời danh sách này: nó không còn là residual/risk mà là việc ĐÃ LÀM ở §6 — dòng log PII đã bị xoá, có 7 test + mutation check khoá lại. Rủi ro còn lại là **quy trình**, không phải code: toàn bộ chốt bảo vệ của round 4 hiện nằm ở file **chưa vào index** — `src/shared/security/` và 3 file `src/domains/applications/marketplace-*.test.ts` đều `??`, `live-integration.ops06a.test.ts` là ` M`, HEAD vẫn `25b9928`. Nghĩa là nếu ai đó commit **chỉ** production code mà bỏ các file test này, defect PLN-04 có thể quay lại mà unit lane không kêu. Tôi không commit theo Iron Rules — xin sếp/Tier sau commit **cả** test lane cùng lúc.)*

## 13. Tôi KHÔNG làm (Iron Rules)

Không self-audit, không viết/sửa `AUDIT.md`, không sửa `TASK.md` hay `CLAUDE.md`, không commit/push/merge/deploy, không provision env/Vercel/Upstash/DNS, không chạm protected path §4.2, không đưa giá trị env vào output hay HANDOFF, không dùng credential dev/production cho lane TEST, không claim LIVE PASS bằng mock.

Về WIP của stream khác: nguyên tắc vẫn là **không stash/reset/delete**. Ngoại lệ duy nhất trong round 4 là **đúng một dòng** `console.log` PII trong `application.service.ts` — xoá theo phân công tường minh của sếp (§6), không kèm refactor, không chạm dòng nào khác trong file, và kết quả là file **về đúng byte HEAD** chứ không phải một phiên bản mới do tôi tạo ra. Mọi WIP còn lại (`app/**/layout.tsx`, `.neon/**`, `docs/aff_plan*`, `scratch/**`, `scripts/debug-parser.mjs`, `docs/PLANNER_HANDOVER.md`) tôi không mở ra sửa.

Handoff status: READY_FOR_AUDIT
