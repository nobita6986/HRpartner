/**
 * job-postings-terminology.static.test.ts — T1B Wave 2 (EP §5.2 / L-019..L-035).
 *
 * Static guard for `/admin/jobs/job-postings` (list) and
 * `/admin/jobs/job-postings/[id]` (detail). F11 §9 binding on the editor
 * shell is fenced by `app/admin/jobs/__tests__/admin-jobs-terminology.static.test.ts`
 * (untouched by Wave 2). This test focuses on the Wave 2 surface:
 *
 *   - List H1 / breadcrumb: `Tin tuyển dụng — soạn & đăng` (EP §3.5 #47).
 *   - Detail breadcrumb: `Danh sách nhu cầu` / `Tin tuyển dụng — trang xem` (EP §3.5 #46, #48).
 *   - List table column headers: `Đường dẫn tin (slug)` / `Đơn tuyển dụng` /
 *     `Trạng thái` / `Phiên bản chỉnh sửa` / `Ngày cập nhật` (EP §3.5 #1, #2/#3, #9, #16, #4).
 *   - Detail fact labels: `Đường dẫn tin (slug)` / `Phiên bản chỉnh sửa` /
 *     `Ngày tạo` / `Ngày cập nhật` / `Ngày đăng` / `Ngày lưu trữ` (EP §3.5 #1-#6).
 *   - Status filter `<option>` text Vietnamese; `<option value>` canonical enum.
 *   - Status badge text routed through `jobPostingStatusLabel()`.
 *   - No raw `DRAFT` / `PUBLISHED` / `ARCHIVED` rendered as text in JSX.
 *   - F11 editor shell still uses `Đăng tin` / `Gỡ tin` / `Lưu trữ` (cross-test).
 *
 * Pure filesystem test — no DOM, no React, no DB.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const LIST_PATH = join(process.cwd(), 'app/admin/jobs/job-postings/page.tsx');
const DETAIL_PATH = join(process.cwd(), 'app/admin/jobs/job-postings/[id]/page.tsx');
const LIST_SOURCE = readFileSync(LIST_PATH, 'utf8');
const DETAIL_SOURCE = readFileSync(DETAIL_PATH, 'utf8');

describe('hrp-admin-localization-wave2 — /admin/jobs/job-postings list (L-019..L-025)', () => {
  it('H1 + breadcrumb are Vietnamese (Tin tuyển dụng — soạn & đăng)', () => {
    expect(LIST_SOURCE).toMatch(/<h1[^>]*>[\s\S]*?Tin tuyển dụng — soạn &amp; đăng[\s\S]*?<\/h1>/);
    expect(LIST_SOURCE).toMatch(/Tin tuyển dụng — soạn &amp; đăng/);
  });

  it('back link is Vietnamese (← Quay lại Danh sách nhu cầu)', () => {
    expect(LIST_SOURCE).toMatch(/← Quay lại Danh sách nhu cầu/);
  });

  it('table column headers are Vietnamese', () => {
    expect(LIST_SOURCE).toMatch(/>\s*Đường dẫn tin \(slug\)\s*</);
    expect(LIST_SOURCE).toMatch(/>\s*Đơn tuyển dụng\s*</);
    expect(LIST_SOURCE).toMatch(/>\s*Trạng thái\s*</);
    expect(LIST_SOURCE).toMatch(/>\s*Phiên bản chỉnh sửa\s*</);
    expect(LIST_SOURCE).toMatch(/>\s*Ngày cập nhật\s*</);
  });

  it('status filter <option> uses Vietnamese label, value keeps canonical enum', () => {
    // The `<option>` is rendered via `.map(s => <option key={s} value={s}>...)`
    // so the source shows the helper invocation, not 3 hard-coded options.
    expect(LIST_SOURCE).toMatch(/<option key=\{s\} value=\{s\}>\{jobPostingStatusLabel\(s\)\}<\/option>/);
    // And the dictionary import is present.
    expect(LIST_SOURCE).toMatch(/jobPostingStatusLabel/);
    // Canonical enum values drive the filter (data shape: DRAFT / PUBLISHED / ARCHIVED).
    expect(LIST_SOURCE).toMatch(/STATUSES = \['DRAFT', 'PUBLISHED', 'ARCHIVED'\] as const/);
  });

  it('legacy English column headers (Slug / Staffing Order / Status / Revision) are REMOVED from JSX', () => {
    expect(LIST_SOURCE).not.toMatch(/>\s*Slug\s*<\/th>/);
    expect(LIST_SOURCE).not.toMatch(/>\s*Staffing Order\s*<\/th>/);
    expect(LIST_SOURCE).not.toMatch(/>\s*Status\s*<\/th>/);
    expect(LIST_SOURCE).not.toMatch(/>\s*Revision\s*<\/th>/);
  });

  it('row status renders via domain dictionary + shared <StatusBadge>', () => {
    expect(LIST_SOURCE).toMatch(/jobPostingStatusLabel/);
    expect(LIST_SOURCE).toMatch(/<StatusBadge\b/);
  });

  it('page.tsx is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(LIST_SOURCE).not.toMatch(/\r\n/);
    expect(LIST_SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});

describe('hrp-admin-localization-wave2 — /admin/jobs/job-postings/[id] detail (L-026..L-035)', () => {
  it('breadcrumb uses Vietnamese labels (Danh sách nhu cầu / Tin tuyển dụng — trang xem)', () => {
    expect(DETAIL_SOURCE).toMatch(/Danh sách nhu cầu/);
    expect(DETAIL_SOURCE).toMatch(/Tin tuyển dụng — trang xem/);
  });

  it('legacy breadcrumb labels (Admin Jobs / JobPosting viewer) are REMOVED', () => {
    expect(DETAIL_SOURCE).not.toMatch(/\{ label: 'Admin Jobs'/);
    expect(DETAIL_SOURCE).not.toMatch(/\{ label: 'JobPosting viewer'/);
  });

  it('Fact labels are Vietnamese (Đường dẫn tin (slug) / Phiên bản chỉnh sửa / Ngày tạo / Ngày cập nhật / Ngày đăng / Ngày lưu trữ)', () => {
    expect(DETAIL_SOURCE).toMatch(/label="Đường dẫn tin \(slug\)"/);
    expect(DETAIL_SOURCE).toMatch(/label="Phiên bản chỉnh sửa"/);
    expect(DETAIL_SOURCE).toMatch(/label="Ngày tạo"/);
    expect(DETAIL_SOURCE).toMatch(/label="Ngày cập nhật"/);
    expect(DETAIL_SOURCE).toMatch(/label="Ngày đăng"/);
    expect(DETAIL_SOURCE).toMatch(/label="Ngày lưu trữ"/);
  });

  it('legacy Fact labels (Slug / Revision / Created / Updated / Published at / Archived at) are REMOVED', () => {
    expect(DETAIL_SOURCE).not.toMatch(/label="Slug"/);
    expect(DETAIL_SOURCE).not.toMatch(/label="Revision"/);
    expect(DETAIL_SOURCE).not.toMatch(/label="Created"/);
    expect(DETAIL_SOURCE).not.toMatch(/label="Updated"/);
    expect(DETAIL_SOURCE).not.toMatch(/label="Published at"/);
    expect(DETAIL_SOURCE).not.toMatch(/label="Archived at"/);
  });

  it('status badge uses domain dictionary + shared <StatusBadge>', () => {
    expect(DETAIL_SOURCE).toMatch(/jobPostingStatusLabel/);
    expect(DETAIL_SOURCE).toMatch(/<StatusBadge\b/);
  });

  it('page.tsx is LF-only (no CRLF, no UTF-8 BOM)', () => {
    expect(DETAIL_SOURCE).not.toMatch(/\r\n/);
    expect(DETAIL_SOURCE.charCodeAt(0)).not.toBe(0xfeff);
  });
});
