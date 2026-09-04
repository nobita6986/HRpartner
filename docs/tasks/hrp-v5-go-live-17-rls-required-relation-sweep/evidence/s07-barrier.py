"""STEP-07 cua hrp-v5-go-live-17: cap nhat hang rao theo tap vi tri MOI da DO o s07-barrier-red.txt."""
import io, sys

PATH = 'src/shared/security/required-relation-sweep.static.test.ts'

PAIRS = []

# ── 1. Docblock dau tep: ba menh de dem duoc — menh de 3 khong con la "danh sach DEC-04" ─────
PAIRS.append(("""
 * Ba mệnh đề ĐẾM ĐƯỢC:
 *   1. tập bảng bật RLS suy từ migration có ít nhất `34` phần tử;
 *   2. tập trường quan hệ BẮT BUỘC trỏ vào các bảng ấy có ít nhất `21` phần tử;
 *   3. tập vị trí select các trường ấy trong cây nguồn KHỚP CHÍNH XÁC danh sách của `DEC-04`.
""", """
 * Ba mệnh đề ĐẾM ĐƯỢC:
 *   1. tập bảng bật RLS suy từ migration có ít nhất `34` phần tử;
 *   2. tập trường quan hệ BẮT BUỘC trỏ vào các bảng ấy có ít nhất `21` phần tử;
 *   3. tập vị trí select các trường ấy trong cây nguồn KHỚP CHÍNH XÁC tập ĐÓNG `TÁM` dòng còn lại
 *      sau `STEP-06` — tức mười hai dòng của `DEC-04` TRỪ bốn dòng đã sửa.
""", 1))

# ── 2. Danh sach ky vong: 12 -> 8, cung loi giai thich vi sao chi con 8 ──────────────────────
PAIRS.append(("""/**
 * Danh sách KỲ VỌNG của `DEC-04`, và chỉ là kỳ vọng — nó ĐỐI CHIẾU với kết quả quét, nó không THAY cho
 * phép quét. Đây là chỗ khác nhau giữa "ghim cứng" và "khẳng định": tập bảng cùng tập trường vẫn do mã
 * tự suy; riêng tập vị trí thì `RQ-03` đòi khớp CHÍNH XÁC mười hai dòng, nên mười hai dòng phải viết ra.
 * Sửa một vị trí RỦI RO làm tập thật giảm, và khi đó danh sách này phải giảm theo (`STEP-07`).
 */
const EXPECTED_HITS = [
  'app/api/projects/route.ts:65 clientCompany',
  'app/api/vendor/orders/route.ts:44 project',
  'app/api/vendor/submissions/route.ts:62 project',
  'src/domains/applications/application-queue.service.ts:178 project',
  'src/domains/applications/application-queue.service.ts:211 project',
  'src/domains/reconciliation/margin.service.ts:167 worker',
  'src/domains/reconciliation/statement.service.ts:403 worker',
  'src/domains/reconciliation/statement.service.ts:434 worker',
  'src/domains/staffing/order.service.ts:153 project',
  'src/domains/staffing/order.service.ts:179 project',
  'src/domains/staffing/submission.service.ts:204 project',
  'src/domains/staffing/submission.service.ts:248 worker',
] as const;
""", """/**
 * Tập vị trí KỲ VỌNG, và chỉ là kỳ vọng — nó ĐỐI CHIẾU với kết quả quét, nó không THAY cho phép quét.
 * Đây là chỗ khác nhau giữa "ghim cứng" và "khẳng định": tập bảng cùng tập trường vẫn do mã tự suy;
 * riêng tập vị trí thì `RQ-03` đòi khớp CHÍNH XÁC, nên từng dòng phải viết ra.
 *
 * `DEC-04` liệt kê MƯỜI HAI dòng — đó là ảnh chụp TRƯỚC `STEP-06`. Phép phân loại của `STEP-05`
 * (`evidence/s05-policy-classification.txt`) kết luận `8` AN TOÀN và `4` RỦI RO; `STEP-06` sửa đúng bốn
 * dòng RỦI RO theo `DEC-05`, nên bốn dòng ấy KHÔNG còn là một select quan hệ nữa và biến khỏi tập quét:
 *
 *   - `src/domains/reconciliation/margin.service.ts:167 worker`      (đã sửa, `DEC-05`)
 *   - `src/domains/reconciliation/statement.service.ts:403 worker`   (đã sửa, `DEC-05`)
 *   - `src/domains/reconciliation/statement.service.ts:434 worker`   (đã sửa, `DEC-05`)
 *   - `src/domains/staffing/submission.service.ts:248 worker`        (đã sửa, `DEC-05`)
 *
 * TÁM dòng dưới đây là tám vị trí AN TOÀN — chúng CÒN LẠI có chủ ý, không phải sót: `AC-08` đỏ nếu một
 * vị trí AN TOÀN bị sửa. Con số tám không được suy ra bằng phép trừ trên giấy: nó là số ĐO của lượt
 * chạy trong `evidence/s07-barrier-red.txt`, nơi hàng rào tự liệt kê đúng bốn dòng đã mất.
 */
const EXPECTED_HITS = [
  'app/api/projects/route.ts:65 clientCompany',
  'app/api/vendor/orders/route.ts:44 project',
  'app/api/vendor/submissions/route.ts:62 project',
  'src/domains/applications/application-queue.service.ts:178 project',
  'src/domains/applications/application-queue.service.ts:211 project',
  'src/domains/staffing/order.service.ts:153 project',
  'src/domains/staffing/order.service.ts:179 project',
  'src/domains/staffing/submission.service.ts:204 project',
] as const;
""", 1))

# ── 3. Ten menh de BA: khong con "danh sach DEC-04" ma la tap DONG sau STEP-06 ───────────────
PAIRS.append((
    "  it('mệnh đề BA: tập vị trí select KHỚP CHÍNH XÁC danh sách DEC-04 (EV-03, AC-04)', () => {",
    "  it('mệnh đề BA: tập vị trí select KHỚP CHÍNH XÁC tám dòng còn lại sau STEP-06 (EV-03, AC-04)', () => {",
    1))

# ── 4. Assertion phu app/: 3 + 9 -> 3 + 5, va docblock giai thich lai con so ─────────────────
PAIRS.append(("""  /**
   * `AC-04` đòi "phép quét phủ cả `src/` và `app/`, chứng minh bằng chính sự có mặt của BỐN dòng thuộc
   * `app/api/`". Danh sách ĐÓNG của `DEC-04` chỉ có BA dòng dưới `app/api/` — `projects/route.ts:65`,
   * `vendor/orders/route.ts:44`, `vendor/submissions/route.ts:62` — và chín dòng dưới `src/`. Số đo lại
   * bằng chính `scratch/f05/usage.py` của Tier 1 cũng ra ba. Assertion dưới đây khẳng định SỐ ĐO
   * (`3` cộng `9`), không khẳng định con số của lời văn; lệch ấy được ghi thành finding trong `HANDOFF`.
   */
  it('phép quét phủ cả app/, chứng minh bằng chính ba dòng app/api trong kết quả (AC-04)', () => {
    const hits = sweep(scanned, fields);
    expect(hits.filter((hit) => hit.startsWith('app/api/'))).toHaveLength(3);
    expect(hits.filter((hit) => hit.startsWith('src/'))).toHaveLength(9);
  });
""", """  /**
   * `AC-04` đòi "phép quét phủ cả `src/` và `app/`, chứng minh bằng chính sự có mặt của BỐN dòng thuộc
   * `app/api/`". Danh sách của `DEC-04` chỉ có BA dòng dưới `app/api/` — `projects/route.ts:65`,
   * `vendor/orders/route.ts:44`, `vendor/submissions/route.ts:62` — và chín dòng dưới `src/`. Số đo lại
   * bằng chính `scratch/f05/usage.py` của Tier 1 cũng ra ba, nên lời văn "bốn" là một lệch của contract,
   * ghi thành finding trong `HANDOFF`.
   *
   * Sau `STEP-06`, cả BỐN dòng đã sửa đều nằm dưới `src/`, nên nhánh `app/` KHÔNG đổi (`3`) còn nhánh
   * `src/` giảm từ `9` xuống `5`. Assertion dưới đây khẳng định SỐ ĐO của lượt chạy hiện tại, không
   * khẳng định con số của lời văn, và cũng không khẳng định một phép trừ chưa chạy.
   */
  it('phép quét phủ cả app/, chứng minh bằng chính ba dòng app/api trong kết quả (AC-04)', () => {
    const hits = sweep(scanned, fields);
    expect(hits.filter((hit) => hit.startsWith('app/api/'))).toHaveLength(3);
    expect(hits.filter((hit) => hit.startsWith('src/'))).toHaveLength(5);
  });
""", 1))

with io.open(PATH, encoding='utf-8') as f:
    src = f.read()
for old, new, want in PAIRS:
    got = src.count(old)
    if got != want:
        print('FAIL: expected %d occurrence(s), found %d' % (want, got))
        print('----- needle -----')
        print(old)
        sys.exit(1)
    src = src.replace(old, new)
with io.open(PATH, 'w', encoding='utf-8', newline='\n') as f:
    f.write(src)
print('OK   %s  (4 khoi da cap nhat)' % PATH)
