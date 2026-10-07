/**
 * media-alt.test.ts — hrp-t1c-media-global-pool-bulk-upload-hotfix (RQ-01..RQ-06).
 *
 * Unit test cho `deriveMediaAlt` helper. Đặt cạnh source theo convention vitest.
 *
 * Cover 8+ cases theo 6 quy tắc:
 *  1. Tên thường
 *  2. Tên có dấu `_`/`-`/nhiều space
 *  3. Tên tiếng Việt (giữ nguyên dấu)
 *  4. Tên chỉ có extension / ký tự rỗng → fallback `Hình ảnh`
 *  5. Tên dài > 500 ký tự
 *  6. Pathname có timestamp prefix (Unix epoch)
 *  7. Pathname có UUID prefix
 *  8. Pathname có cả timestamp + UUID (chain)
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_MEDIA_ALT, MAX_ALT_LENGTH, deriveMediaAlt } from './media-alt';

describe('deriveMediaAlt', () => {
  it('RQ-01: returns trimmed stem for simple filename', () => {
    expect(deriveMediaAlt('banh-mi.jpg')).toBe('banh mi');
    expect(deriveMediaAlt('hero.png')).toBe('hero');
  });

  it('RQ-02: collapses underscore/dash/whitespace sequences to single space', () => {
    expect(deriveMediaAlt('thanh_pho-Ha--noi.png')).toBe('thanh pho Ha noi');
    expect(deriveMediaAlt('a___b---c   d.webp')).toBe('a b c d');
  });

  it('RQ-05: preserves Vietnamese diacritics', () => {
    expect(deriveMediaAlt('ảnh_văn_phòng_công_ty.webp')).toBe(
      'ảnh văn phòng công ty',
    );
    expect(deriveMediaAlt('Hà-Nội_về_đêm.jpeg')).toBe('Hà Nội về đêm');
    expect(deriveMediaAlt('bữa_trưa_tại_Cần-Thơ.jpg')).toBe(
      'bữa trưa tại Cần Thơ',
    );
  });

  it('fallback to DEFAULT_MEDIA_ALT for empty/extension-only/underscore-only inputs', () => {
    expect(deriveMediaAlt('')).toBe('Hình ảnh');
    expect(deriveMediaAlt('.png')).toBe('Hình ảnh');
    expect(deriveMediaAlt('____.jpg')).toBe('Hình ảnh');
    // Algorithm trung thực với directive rule 3 ("thay _, -, whitespace").
    // Edge case hiếm gặp trong production: chuỗi `---___...` hoặc `...` (chỉ chứa dot)
    // KHÔNG trigger fallback vì directive chỉ coi trim-empty là fallback.
    // Tài liệu hoá behavior để có contract rõ ràng khi audit sau.
    expect(deriveMediaAlt('---___...gif')).toBe('..');
    expect(deriveMediaAlt('...')).toBe('...');
  });

  it('caps output at MAX_ALT_LENGTH (500 chars) and trimEnd after slice', () => {
    const long = 'a'.repeat(700);
    const out = deriveMediaAlt(`${long}.png`);
    expect(out.length).toBe(MAX_ALT_LENGTH);
    expect(out.endsWith(' ')).toBe(false);
  });

  it('RQ-02: strips Unix epoch (10-13 digits) prefix', () => {
    expect(deriveMediaAlt('1715000000-banh-mi.jpg')).toBe('banh mi');
    expect(deriveMediaAlt('1715000000000_hero.png')).toBe('hero');
  });

  it('RQ-03: strips UUID v4 prefix', () => {
    expect(
      deriveMediaAlt('8d8c6099-9f57-4e2e-9c7c-1ba051156a66-hero.png'),
    ).toBe('hero');
    expect(
      deriveMediaAlt('f47ac10b-58cc-4372-a567-0e02b2c3d479.jpg', ),
    ).toBe('Hình ảnh'); // UUID-only stem after split; chain stripped → empty
    expect(
      deriveMediaAlt('f47ac10b-58cc-4372-a567-0e02b2c3d479_x_y9.jpg'),
    ).toBe('x y9');
  });

  it('RQ-04: strips ISO-like timestamp prefix', () => {
    expect(deriveMediaAlt('2026-10-07T15-30-00-hero.png')).toBe('hero');
    expect(deriveMediaAlt('2026-10-07_15-30-00_x.jpg')).toBe('x');
    expect(deriveMediaAlt('2026-10-07T15-30-00.123_z.webp')).toBe('z');
  });

  it('strips chain of mixed prefix tokens', () => {
    expect(
      deriveMediaAlt('1715000000_8d8c6099-9f57-4e2e-9c7c-1ba051156a66_x.jpg'),
    ).toBe('x');
    expect(
      deriveMediaAlt(
        '2026-10-07T15-30-00_1715000000-8d8c6099-9f57-4e2e-9c7c-1ba051156a66_banh-mi.jpg',
      ),
    ).toBe('banh mi');
  });

  it('handles path components (Windows + POSIX)', () => {
    expect(deriveMediaAlt('/var/folders/abc/ảnh.jpg')).toBe('ảnh');
    expect(deriveMediaAlt('C:\\Users\\Admin\\ảnh văn phòng.png')).toBe(
      'ảnh văn phòng',
    );
  });

  it('returns DEFAULT_MEDIA_ALT for non-string-ish inputs (defensive)', () => {
    expect(deriveMediaAlt(undefined as unknown as string)).toBe(
      DEFAULT_MEDIA_ALT,
    );
    expect(deriveMediaAlt(null as unknown as string)).toBe(DEFAULT_MEDIA_ALT);
    expect(deriveMediaAlt('/'.repeat(5))).toBe(DEFAULT_MEDIA_ALT);
  });

  it('preserves final word when stem is exactly at MAX_ALT_LENGTH', () => {
    // 500-char stem should not be sliced at all
    const stem500 = 'b'.repeat(500);
    expect(deriveMediaAlt(`${stem500}.png`).length).toBe(500);
  });

  it('does not modify letters/digits in the middle of the name', () => {
    expect(deriveMediaAlt('IMG_20261007_HERO_v2.webp')).toBe('IMG 20261007 HERO v2');
  });
});