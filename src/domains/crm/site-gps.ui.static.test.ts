/**
 * site-gps.ui.static.test.ts — T0 correction regression guard.
 *
 * Static guard (đọc file client — không DOM): form tạo Site KHÔNG prefill
 * bán kính mặc định 200; Admin phải chủ động nhập (validateRadiusField bắt
 * lỗi "" + label nhấn mạnh "chủ động chọn").
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CLIENT = join(
  process.cwd(),
  'app',
  'admin',
  'projects',
  '[id]',
  'project-gps-client.tsx',
);

const source = readFileSync(CLIENT, 'utf8');

describe('project-gps-client — explicit radius (T0 correction)', () => {
  it('create KHÔNG prefill radius 200 (state khởi tạo rỗng)', () => {
    expect(source).toContain("useState(site == null ? '' : String(site.radiusMeters))");
    expect(source).not.toContain('String(site?.radiusMeters ?? 200)');
  });

  it('radius rỗng ⇒ lỗi, không tự fallback 200', () => {
    expect(source).toContain("if (radiusNorm === '')");
    expect(source).toContain('Bán kính geofence là bắt buộc');
    expect(source).toMatch(/placeholder="vd 800"/);
  });

  it('label nhấn mạnh Admin chủ động chọn bán kính', () => {
    expect(source).toContain('Admin phải chủ động chọn');
  });
});
