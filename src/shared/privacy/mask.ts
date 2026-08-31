/**
 * mask.ts — go-live-13 / RQ-01, RQ-02 / DEC-03, DEC-04, DEC-05, DEC-06, DEC-11, DEC-12.
 *
 * Che MỘT PHẦN số điện thoại và số CCCD cho bề mặt công khai. Thuần hàm: không Prisma, không Next,
 * không đọc biến môi trường — để dùng được từ service, từ test và từ chỗ khác về sau (`DEC-03`).
 *
 * KHÔNG dùng lại `maskSensitive` ở `src/shared/auth/worker-projection.ts` (`DEC-04`): hàm đó che
 * TOÀN PHẦN thành `'***'` theo permission của nhân sự đã đăng nhập, còn đây là che MỘT PHẦN cho
 * khách vô danh và phải giữ được vài số cuối để ứng viên tự đối chiếu hồ sơ của mình. Điểm phải giữ
 * giống nguyên vẹn: giá trị trống trả `null`, KHÔNG trả dấu sao — không để lộ khác biệt giữa "không
 * có giá trị" và "có giá trị nhưng bị che".
 *
 * Vì sao hai cửa sổ khác nhau (`DEC-05`): ba ký tự đầu của điện thoại chỉ là đầu số nhà mạng, thông
 * tin gần bằng không, nhưng giúp ứng viên nhận ra số nào là của mình khi có nhiều số. Ngược lại các
 * số đầu của CCCD mã hoá tỉnh cấp, giới tính cùng thế kỷ sinh và năm sinh — đó là định danh thật,
 * nên không giữ ký tự đầu nào.
 *
 * Độ dài chuỗi trả về bằng đúng độ dài giá trị sau chuẩn hoá (`DEC-06`): độ dài số điện thoại và
 * CCCD Việt Nam là hằng số công khai nên bảo toàn độ dài không tiết lộ thêm gì, mà lại giữ được
 * hình dạng tự nhiên để người đọc nhận ra số của mình.
 */

const ASTERISK = '*';

/** `DEC-12`: bỏ khoảng trắng, dấu chấm, dấu gạch và dấu ngoặc TRƯỚC khi đếm vị trí. */
const SEPARATOR_RE = /[\s.\-()]/g;
const PLUS_RE = /\+/g;

/** Điện thoại giữ ba ký tự đầu và ba ký tự cuối (`DEC-05`). */
const PHONE_HEAD = 3;
const PHONE_TAIL = 3;

/** CCCD giữ bốn ký tự cuối và KHÔNG giữ ký tự đầu nào (`DEC-05`). */
const CCCD_HEAD = 0;
const CCCD_TAIL = 4;

/**
 * Chuẩn hoá theo `DEC-12`. Dấu cộng chỉ được giữ khi nó là ký tự đầu của giá trị đã bỏ dấu phân
 * cách — mọi dấu cộng nằm giữa là dữ liệu bẩn, bỏ đi, không được tính vào độ dài.
 */
function normalize(value: string): string {
  const compact = value.trim().replace(SEPARATOR_RE, '');
  const leadingPlus = compact.startsWith('+') ? '+' : '';
  return leadingPlus + compact.replace(PLUS_RE, '');
}

/**
 * Che theo cửa sổ đầu/cuối. Trống, chỉ dấu phân cách, `null` hoặc thiếu → `null`. Độ dài sau chuẩn
 * hoá nhỏ hơn hoặc bằng cửa sổ định giữ → che TOÀN BỘ (`DEC-11`, fail-closed theo hướng che nhiều
 * hơn chứ không bao giờ ít hơn). Còn lại: giữ đúng cửa sổ, phần giữa thay bằng số dấu sao bằng đúng
 * số ký tự bị che (`DEC-06`).
 */
function maskWindow(value: string | null | undefined, keepHead: number, keepTail: number): string | null {
  if (value === null || value === undefined) return null;
  const normalized = normalize(value);
  if (!normalized) return null;
  const keep = keepHead + keepTail;
  if (normalized.length <= keep) return ASTERISK.repeat(normalized.length);
  return (
    normalized.slice(0, keepHead) +
    ASTERISK.repeat(normalized.length - keep) +
    normalized.slice(normalized.length - keepTail)
  );
}

/** Che số điện thoại: giữ ba ký tự đầu và ba ký tự cuối. */
export function maskPhone(value: string | null | undefined): string | null {
  return maskWindow(value, PHONE_HEAD, PHONE_TAIL);
}

/** Che số CCCD: chỉ giữ bốn ký tự cuối. */
export function maskCccd(value: string | null | undefined): string | null {
  return maskWindow(value, CCCD_HEAD, CCCD_TAIL);
}
