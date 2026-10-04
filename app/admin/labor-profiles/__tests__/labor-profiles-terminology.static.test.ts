import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = {
  list: readFileSync(join(process.cwd(), 'app/admin/labor-profiles/page.tsx'), 'utf8'),
  detail: readFileSync(join(process.cwd(), 'app/admin/labor-profiles/[id]/page.tsx'), 'utf8'),
  create: readFileSync(join(process.cwd(), 'app/admin/labor-profiles/new/page.tsx'), 'utf8'),
  assignments: readFileSync(join(process.cwd(), 'app/admin/labor-profiles/[id]/handling-assignment-manager.tsx'), 'utf8'),
};

describe('/admin/labor-profiles Wave 3 terminology', () => {
  it('routes verification and completeness through the LaborProfile dictionary', () => {
    expect(SOURCE.list).toContain('laborProfileIdentityVerificationLabel(profile.identityVerification)');
    expect(SOURCE.list).toContain('laborProfileCompletenessLabel(profile.completeness)');
    expect(SOURCE.detail).toContain('laborProfileIdentityVerificationLabel(data.identityVerification)');
    expect(SOURCE.detail).toContain('laborProfileCompletenessLabel(data.completeness)');
    expect(SOURCE.detail).not.toMatch(/>\s*\{data\.identityVerification\}\s*</);
  });

  it('localizes intake, placement, matching, and assignment values', () => {
    expect(SOURCE.detail).toContain('laborProfileIntakeChannelLabel(intake.channel)');
    expect(SOURCE.detail).toContain('placementCaseStatusLabel(pc.status)');
    expect(SOURCE.create).toContain('applicantSignalLabel');
    expect(SOURCE.create).not.toContain('(POSSIBLE_MATCH)');
    expect(SOURCE.assignments).toContain('handlingAssignmentStatusLabel(h.status)');
    expect(SOURCE.assignments).toContain('roleLabel(u.role)');
    expect(SOURCE.assignments).not.toMatch(/>\s*\{h\.status\}\s*</);
    expect(SOURCE.assignments).not.toMatch(/>\s*\{u\.role\}\s*</);
  });

  it('does not interpolate raw serviceModel enum data into UI text', () => {
    for (const source of Object.values(SOURCE)) {
      expect(source).not.toMatch(/>\s*\{[^}]*serviceModel[^}]*\}\s*</i);
    }
  });
});
