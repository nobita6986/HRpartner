import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = {
  list: readFileSync(join(process.cwd(), 'app/admin/labor-profiles/page.tsx'), 'utf8'),
  detail: readFileSync(join(process.cwd(), 'app/admin/labor-profiles/[id]/page.tsx'), 'utf8'),
  create: readFileSync(join(process.cwd(), 'app/admin/labor-profiles/new/page.tsx'), 'utf8'),
  assignments: readFileSync(join(process.cwd(), 'app/admin/labor-profiles/[id]/handling-assignment-manager.tsx'), 'utf8'),
};

/**
 * Strip JS/TS comments so a comment that documents an anti-pattern does
 * not get scanned as visible operator text. The T1B hotfix intentionally
 * cites the legacy "Hồ sơ NLD" / "NLD" wording in a comment on the list
 * page to explain the rename.
 */
function stripComments(source: string): string {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_m, lead) => lead);
  return out;
}

const CODE = {
  list: stripComments(SOURCE.list),
  detail: stripComments(SOURCE.detail),
  create: stripComments(SOURCE.create),
  assignments: stripComments(SOURCE.assignments),
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

describe('/admin/labor-profiles — T0 T1B HOTFIX UI NGƯỜI LAO ĐỘNG terminology', () => {
  // T0 directive §3: page title "Hồ sơ tiếp nhận người lao động".
  it('list page <h1> is "Hồ sơ tiếp nhận người lao động"', () => {
    expect(CODE.list).toMatch(/<h1[^>]*>\s*Hồ sơ tiếp nhận người lao động\s*<\/h1>/);
  });

  it('list page Next.js metadata title is "Hồ sơ tiếp nhận người lao động - Quản trị"', () => {
    expect(CODE.list).toContain("title: 'Hồ sơ tiếp nhận người lao động - Quản trị'");
  });

  // T0 directive §3: action button "+ Tiếp nhận người lao động" (the
  // legacy "Tiếp nhận hồ sơ người lao động" was redundant — simplified).
  it('intake CTA button reads "+ Tiếp nhận người lao động"', () => {
    expect(CODE.list).toMatch(/\+\s*Tiếp nhận người lao động/);
  });

  it('does not reintroduce legacy "Hồ sơ NLD" / "Nhân sự" / "NLD" on the list surface', () => {
    // Anti-regression fence. The list page is the canonical LaborProfile
    // surface; it uses the full title "Hồ sơ tiếp nhận người lao động"
    // and the CTA "+ Tiếp nhận người lao động". Legacy abbreviations
    // ("Hồ sơ NLD", "NLD") are not applicable here.
    expect(CODE.list).not.toMatch(/<h1[^>]*>[\s\S]*?Hồ sơ NLD/);
    expect(CODE.list).not.toMatch(/<h1[^>]*>[\s\S]*?NLD/);
    expect(CODE.list).not.toContain("'Nhân sự'");
    expect(CODE.list).not.toContain('Tiếp nhận hồ sơ người lao động');
  });
});

describe('/admin/labor-profiles — T0 T1B encoding hygiene', () => {
  it('list page is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(SOURCE.list).not.toMatch(/\r\n/);
    expect(SOURCE.list.charCodeAt(0)).not.toBe(0xfeff);
  });
});
