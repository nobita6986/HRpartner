import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const POLICIES_SOURCE = readFileSync(join(process.cwd(), 'app/admin/commission/policies/page.tsx'), 'utf8');
const LEDGER_SOURCE = readFileSync(join(process.cwd(), 'app/admin/commission/ledger/page.tsx'), 'utf8');

describe('/admin/commission disabled route terminology', () => {
  it('keeps both routes on the established Vietnamese placeholder', () => {
    expect(POLICIES_SOURCE).toContain('<UnderDevelopment feature="Chính sách hoa hồng" />');
    expect(LEDGER_SOURCE).toContain('<UnderDevelopment feature="Sổ cái hoa hồng" />');
    expect(POLICIES_SOURCE).toContain("from '../../_components/UnderDevelopment'");
    expect(LEDGER_SOURCE).toContain("from '../../_components/UnderDevelopment'");
  });
});
