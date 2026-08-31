/**
 * mask.test.ts — go-live-13 / RQ-08 / STEP-01 / AC-02, AC-08.
 *
 * Bảy trường hợp của `RQ-08` cộng khẳng định bất biến "phần giữa chỉ gồm dấu sao".
 *
 * `RQ-12`: MỌI giá trị trong file này là số tổng hợp — chuỗi chữ số tăng dần do tôi bịa ra để giữ
 * đúng HÌNH DẠNG của số điện thoại và CCCD Việt Nam. Không có số thật, tên thật hay mã tra cứu thật
 * nào ở đây.
 *
 * Cửa sổ giữ lại (ba/ba cho điện thoại, bốn cuối cho CCCD) được viết THẲNG vào test chứ không import
 * hằng số từ module: `RQ-02` khoá quy tắc tới từng ký tự, nên test phải phát biểu con số của contract
 * một cách độc lập. Test mà import chính hằng số nó đang canh thì không bao giờ bắt được việc hằng số
 * đó bị đổi.
 */
import { describe, expect, it } from 'vitest';
import { maskCccd, maskPhone } from './mask';

/** Cửa sổ của contract, viết độc lập với module. */
const PHONE_HEAD = 3;
const PHONE_TAIL = 3;
const CCCD_TAIL = 4;

/** Số tổng hợp: chữ số tăng dần, đúng hình dạng nhưng không thuộc về ai. */
const PHONE_10 = '0912345678';
const PHONE_SPACED = '0912 345 678';
const PHONE_E164 = '+84912345678';
const CCCD_12 = '012345678901';

describe('maskPhone — che một phần số điện thoại (RQ-02/DEC-05)', () => {
  it('điện thoại mười chữ số giữ ba số đầu và ba số cuối, độ dài không đổi', () => {
    expect(maskPhone(PHONE_10)).toBe('091****678');
    expect(maskPhone(PHONE_10)).toHaveLength(PHONE_10.length);
  });

  it('điện thoại có khoảng trắng giữa các nhóm che đúng vị trí sau chuẩn hoá (DEC-12)', () => {
    expect(maskPhone(PHONE_SPACED)).toBe('091****678');
    expect(maskPhone(PHONE_SPACED)).toHaveLength(10);
  });

  it('dấu chấm, dấu gạch và dấu ngoặc cũng bị bỏ trước khi đếm (DEC-12)', () => {
    expect(maskPhone('091.234.5678')).toBe('091****678');
    expect(maskPhone('091-234-5678')).toBe('091****678');
    expect(maskPhone('(091) 234 5678')).toBe('091****678');
  });

  it('điện thoại dạng cộng tám bốn giữ dấu cộng ở đầu và không lệch vị trí', () => {
    expect(maskPhone(PHONE_E164)).toBe('+84******678');
    expect(maskPhone(PHONE_E164)).toHaveLength(PHONE_E164.length);
    expect(maskPhone('+84 912 345 678')).toBe('+84******678');
  });

  it('giá trị ngắn hơn hoặc bằng cửa sổ hiển thị bị che TOÀN BỘ (DEC-11)', () => {
    expect(maskPhone('12345')).toBe('*****');
    expect(maskPhone('123456')).toBe('******');
    expect(maskPhone('1')).toBe('*');
  });

  it('chuỗi chỉ gồm khoảng trắng, chuỗi trống, null và thiếu đều trả null (DEC-04)', () => {
    expect(maskPhone('   ')).toBeNull();
    expect(maskPhone('')).toBeNull();
    expect(maskPhone(null)).toBeNull();
    expect(maskPhone(undefined)).toBeNull();
    expect(maskPhone('-- ()')).toBeNull();
  });
});

describe('maskCccd — che một phần số CCCD (RQ-02/DEC-05)', () => {
  it('CCCD mười hai chữ số chỉ giữ bốn số cuối, không giữ số đầu nào', () => {
    expect(maskCccd(CCCD_12)).toBe('********8901');
    expect(maskCccd(CCCD_12)).toHaveLength(CCCD_12.length);
    expect(maskCccd(CCCD_12)!.startsWith('*')).toBe(true);
  });

  it('CCCD null hoặc thiếu trả null, KHÔNG trả dấu sao', () => {
    expect(maskCccd(null)).toBeNull();
    expect(maskCccd(undefined)).toBeNull();
    expect(maskCccd('  ')).toBeNull();
  });

  it('CCCD ngắn hơn hoặc bằng bốn ký tự bị che toàn bộ (DEC-11)', () => {
    expect(maskCccd('1234')).toBe('****');
    expect(maskCccd('123')).toBe('***');
  });
});

describe('bất biến — bỏ phần được giữ ra thì phần còn lại chỉ gồm dấu sao', () => {
  it('điện thoại: phần giữa giữa ba đầu và ba cuối chỉ gồm dấu sao', () => {
    for (const input of [PHONE_10, PHONE_SPACED, PHONE_E164, '0987654321', '+849876543210']) {
      const masked = maskPhone(input);
      if (masked === null) throw new Error(`mong đợi giá trị đã che cho đầu vào tổng hợp: ${input}`);
      const middle = masked.slice(PHONE_HEAD, masked.length - PHONE_TAIL);
      expect(middle, `phần giữa của ${masked}`).toMatch(/^\*+$/);
      // Hai đầu là phần ĐƯỢC GIỮ: nếu dấu sao lọt vào đây thì cửa sổ đã lệch.
      expect(masked.slice(0, PHONE_HEAD), `ba ký tự đầu của ${masked}`).not.toMatch(/\*/);
      expect(masked.slice(masked.length - PHONE_TAIL), `ba ký tự cuối của ${masked}`).not.toMatch(/\*/);
    }
  });

  it('CCCD: mọi ký tự trước bốn số cuối chỉ gồm dấu sao', () => {
    for (const input of [CCCD_12, '098765432109', '123456789012'] as const) {
      const masked = maskCccd(input);
      if (masked === null) throw new Error(`mong đợi giá trị đã che cho đầu vào tổng hợp: ${input}`);
      expect(masked.slice(0, masked.length - CCCD_TAIL), `phần đầu của ${masked}`).toMatch(/^\*+$/);
      expect(masked.slice(masked.length - CCCD_TAIL)).toBe(input.slice(input.length - CCCD_TAIL));
    }
  });

  it('giá trị đã che KHÔNG chứa nguyên văn giá trị gốc', () => {
    expect(maskPhone(PHONE_10)).not.toContain(PHONE_10);
    expect(maskPhone(PHONE_SPACED)).not.toContain('2345');
    expect(maskCccd(CCCD_12)).not.toContain(CCCD_12);
    expect(maskCccd(CCCD_12)).not.toContain('01234');
  });
});
