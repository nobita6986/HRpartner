import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(process.cwd(), 'app/admin/workers/page.tsx'), 'utf8');

describe('/admin/workers Wave 3 terminology', () => {
  it('uses the typed Worker dictionary and shared status presentation primitive', () => {
    expect(SOURCE).toContain("from '@/src/domains/workforce/worker-ui'");
    expect(SOURCE).toContain('workerStatusLabel(s)');
    expect(SOURCE).toContain('<StatusBadge');
    expect(SOURCE).not.toMatch(/const STATUS_CONFIG\s*:/);
    expect(SOURCE).not.toMatch(/\{cfg\.label\}/);
  });

  it('does not expose English table labels or raw status values', () => {
    expect(SOURCE).toContain("'Mã người dùng'");
    expect(SOURCE).toContain("'Thao tác'");
    expect(SOURCE).not.toMatch(/>\s*User ID\s*</);
    expect(SOURCE).not.toMatch(/>\s*\{w\.employmentStatus\}\s*</);
  });
});
