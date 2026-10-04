/**
 * job-openings-terminology.static.test.ts — T1B Wave 2 (EP §5.2 / L-036..L-043).
 *
 * Static guard for `/admin/job-openings/[id]`. Wave 2 scope:
 *   - H1: `Đợt tuyển dụng` (glossary `job_opening`).
 *   - Breadcrumb last segment: `Đợt tuyển dụng: <id8>` (EP §3.5 #45).
 *   - Status chip via `jobOpeningStatusLabel()` + shared `<StatusBadge>`.
 *   - serviceModel chip via `jobOpeningServiceModelLabel()` (EP §3.2.11).
 *   - Metric card labels: `Đơn ứng tuyển` / `Phân công dự án` / `Bố trí việc làm`
 *     (glossary `candidate_submission` / `project_assignment` / `placement`).
 *   - H2 sections: `Tin tuyển dụng (Job Posting)` / `Vị trí cần tuyển (Slots)`.
 *   - No raw `DRAFT` / `OPEN` / `CLOSING_SOON` / `CLOSED` / `FILLED` / `CANCELLED`
 *     rendered as text in JSX (KEEP_CANONICAL_IDENTIFIER).
 *   - No raw `onsite` / `remote` rendered as text.
 *
 * Pure filesystem test — no DOM, no React, no DB.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const PATH = join(process.cwd(), 'app/admin/job-openings/[id]/page.tsx');
const SOURCE = readFileSync(PATH, 'utf8');

describe('hrp-admin-localization-wave2 — /admin/job-openings/[id] (L-036..L-043)', () => {
  it('H1 is "Đợt tuyển dụng"', () => {
    expect(SOURCE).toMatch(/<h1[^>]*>[\s\S]*?Đợt tuyển dụng[\s\S]*?<\/h1>/);
  });

  it('legacy H1 "Tuyển dụng (Opening)" is REMOVED', () => {
    expect(SOURCE).not.toMatch(/>\s*Tuyển dụng \(Opening\)\s*</);
  });

  it('breadcrumb last segment uses glossary term `Đợt tuyển dụng`', () => {
    expect(SOURCE).toMatch(/Đợt tuyển dụng: \$\{opening\.id\.substring\(0, 8\)\}/);
  });

  it('status chip routed through domain dictionary + shared <StatusBadge>', () => {
    expect(SOURCE).toMatch(/jobOpeningStatusLabel/);
    expect(SOURCE).toMatch(/<StatusBadge\b/);
  });

  it('serviceModel chip routed through `jobOpeningServiceModelLabel()` (no raw onsite/remote)', () => {
    expect(SOURCE).toMatch(/jobOpeningServiceModelLabel/);
    expect(SOURCE).not.toMatch(/>\s*\{opening\.serviceModel\}\s*</);
  });

  it('metric card labels use cross-module glossary', () => {
    expect(SOURCE).toMatch(/label="Đơn ứng tuyển"/);
    expect(SOURCE).toMatch(/label="Phân công dự án"/);
    expect(SOURCE).toMatch(/label="Bố trí việc làm"/);
  });

  it('legacy metric card labels (Candidate Submissions / Project Assignments / Placements) are REMOVED', () => {
    expect(SOURCE).not.toMatch(/label="Candidate Submissions"/);
    expect(SOURCE).not.toMatch(/label="Project Assignments"/);
    expect(SOURCE).not.toMatch(/label="Placements"/);
  });

  it('H2 sections are Vietnamese (Tin tuyển dụng / Vị trí cần tuyển)', () => {
    expect(SOURCE).toMatch(/>\s*Tin tuyển dụng \(Job Posting\)\s*</);
    expect(SOURCE).toMatch(/>\s*Vị trí cần tuyển \(Slots\)\s*</);
  });

  it('legacy H2 (Đăng tuyển (Job Posting) / Vị trí (Slots)) are REMOVED', () => {
    expect(SOURCE).not.toMatch(/>\s*Đăng tuyển \(Job Posting\)\s*</);
    expect(SOURCE).not.toMatch(/>\s*Vị trí \(Slots\)\s*</);
  });

  it('page.tsx is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(SOURCE).not.toMatch(/\r\n/);
    expect(SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});
