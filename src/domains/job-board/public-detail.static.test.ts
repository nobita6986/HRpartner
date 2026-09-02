/**
 * public-detail.static.test.ts — go-live-12 / RQ-13 / STEP-03 / AC-05, AC-11, AC-13.
 *
 * Detector tĩnh đọc CÂY NGUỒN THẬT của trang chi tiết công khai. Lý do phải là test tĩnh, không
 * phải test render: hai lớp lỗi mà task này sợ nhất đều KHÔNG tái lập được bằng mock.
 *   - Rò rỉ bề mặt (`RISK-04`): một khoá lọt vào JSX vẫn render xanh trên dữ liệu mock; chỉ có
 *     việc đọc mã mới thấy khoá đó tồn tại.
 *   - Đọc DB sai principal (`RQ-05`): `prisma.$transaction` trần vẫn chạy tốt với mock, rồi trả 0
 *     dòng trên DB thật vì không có GUC — đúng defect go-live-04. Mock không có RLS nên không có
 *     bài test runtime nào ở lane unit bắt được; đọc mã thì bắt được ngay.
 *
 * Đọc THÔ, KHÔNG strip comment. Đây là tiền lệ của repo (`src/shared/auth/with-public-db.ts:40`:
 * "`AC-05` đo bằng grep thô, không strip comment") và là điều `RQ-13` đòi nguyên văn: "FAIL nếu
 * file chứa bất kỳ chuỗi nào". Chú thích cũng là nội dung file, nên chính docblock của trang cũng
 * phải sạch sáu chuỗi — chặn luôn kiểu "để tạm trong comment rồi bật lại sau".
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const PAGE = 'app/(jobs)/viec-lam/[slug]/page.tsx';
const LAYOUT = 'app/(jobs)/viec-lam/layout.tsx';
const META = 'src/domains/job-board/public-detail.meta.ts';
const CTA = 'src/domains/job-board/components/detail-apply-cta.tsx';
const PORTAL_PAGE = 'app/(portal)/page.tsx';

const raw = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const page = raw(PAGE);

/**
 * Sáu chuỗi của `RQ-13` đo THÔ. Hai khẳng định bổ sung dưới đây thì phải đo trên MÃ đã bỏ chú
 * thích, vì chính docblock nêu điều bị cấm bằng tiếng Việt ("không mức lương", "không khối
 * `prefers-reduced-motion` mới"): đo thô sẽ FAIL vì câu văn cấm, chứ không vì mã vi phạm.
 */
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/** Sáu chuỗi của `RQ-13`, đúng thứ tự contract liệt kê. */
const BANNED = [
  'clientCompany',
  '$transaction',
  'applyRlsContext',
  'set_config',
  'hourlyRate',
  'description',
] as const;

describe('RQ-13 — trang chi tiết không mang chuỗi bị cấm nào', () => {
  it('không chứa bất kỳ chuỗi nào trong sáu chuỗi bị cấm (đọc thô, kể cả comment)', () => {
    const hits = BANNED.filter((needle) => page.includes(needle));
    expect(hits, `${PAGE} chứa chuỗi bị cấm`).toEqual([]);
  });

  it('không có đường tự gọi API nội bộ và không phải Client Component', () => {
    expect(page).not.toMatch(/\bfetch\(/);
    expect(page).not.toMatch(/^\s*'use client'/m);
  });
});

describe('RQ-05/DEC-02 — đọc DB đúng một đường withPublicDb', () => {
  it('gọi withPublicDb + getPublicJobDetail, và withPublicDb bọc ngoài lời gọi service', () => {
    expect(page).toContain('withPublicDb');
    expect(page).toContain('getPublicJobDetail');
    expect(page.indexOf('withPublicDb(')).toBeLessThan(page.indexOf('getPublicJobDetail('));
  });

  it("khai báo force-dynamic và runtime nodejs", () => {
    expect(page).toMatch(/export\s+const\s+dynamic\s*=\s*'force-dynamic'/);
    expect(page).toMatch(/export\s+const\s+runtime\s*=\s*'nodejs'/);
  });

  it('DEC-09/DEC-14: notFound() xuất hiện đúng một lần và chỉ dưới nhánh !job', () => {
    // Đếm trên MÃ: docblock có nêu `notFound()` khi giải thích DEC-09 nên bản thô có 2 lần.
    const code = strip(page);
    expect(code.match(/notFound\(\)/g) ?? []).toHaveLength(1);
    expect(code).toMatch(/if\s*\(!job\)\s*notFound\(\);/);
    // Đủ chỉ tiêu vẫn phải mở 200: không được có nhánh 404 theo số chỗ trống.
    expect(code).not.toMatch(/availableSlots[^\n]*notFound/);
  });
});

describe('RQ-11/DEC-10 — metadata sinh trong chính file route', () => {
  it('có generateMetadata, openGraph và alternates.canonical', () => {
    expect(page).toContain('generateMetadata');
    expect(page).toContain('openGraph');
    expect(page).toContain('canonical');
  });

  it('canonical là URL tuyệt đối (root layout không đặt base URL cho metadata)', () => {
    expect(page).toContain('CANONICAL_ORIGIN');
    expect(page).toMatch(/canonical:\s*`\$\{CANONICAL_ORIGIN\}/);
  });

  it('không tìm thấy việc làm thì tiêu đề không tiết lộ slug hay lý do ẩn', () => {
    expect(page).toMatch(/if\s*\(!job\)\s*return\s*\{\s*title:\s*PUBLIC_JOB_NOT_FOUND_TITLE\s*\}/);
    expect(raw(META)).toContain("PUBLIC_JOB_NOT_FOUND_TITLE = 'Không tìm thấy việc làm'");
  });

  it('DEC-10: không thêm ảnh social mới', () => {
    expect(page).not.toContain('twitter');
    expect(page).not.toMatch(/images:\s*\[/);
  });
});

describe('RQ-06/RQ-08 — bề mặt hiển thị đúng phạm vi DTO công khai', () => {
  it('in mã việc làm, ba chip, tổng chỉ tiêu và hạn nhận hồ sơ', () => {
    for (const needle of [
      'job.jobCode',
      'job.location',
      'job.shift',
      'JOB_TYPE_LABELS[job.jobType]',
      'job.availableSlots',
      'job.totalSlotsFilled',
      'job.totalSlotsNeeded',
      'formatDeadlineDate(job.deadline)',
    ]) {
      expect(page, needle).toContain(needle);
    }
    // go-live-14 / RQ-01, DEC-05 — needle `'job.industry'` đã bị bỏ khỏi danh sách trên và ĐỔI DẤU
    // thành hai phủ định dưới đây. File này đọc trang THÔ (`raw`) theo doctrine "chú thích cũng là
    // nội dung file", nên token đó phải vắng mặt kể cả trong comment của trang.
    expect(page).not.toMatch(/industry/i);
    expect(page).not.toContain('icon="factory"');
    // RQ-01 / AC-01 đo trên HÀNG CHIP ĐẦU TRANG, không trên cả file: trang có 6 `<Chip ` (4 ở hàng
    // đầu, 2 trong danh sách vị trí ở dưới), nên một phép đếm toàn file không phân biệt được "bỏ chip
    // ngành" với "bỏ một chip của vị trí". Hàng đầu xuống ĐÚNG 3, tổng cả trang xuống ĐÚNG 5, và
    // chip loại hình công việc phải còn NGUYÊN VĂN cả icon lẫn nhãn (RQ-01) — đây là chỗ dễ đọc lệch
    // thành "xoá ba chip" nhất, xem mục AC-01 trong HANDOFF.
    const fromChipRow = page.slice(page.indexOf('<div className="mt-4 flex flex-wrap items-center gap-2">'));
    const chipRow = fromChipRow.slice(0, fromChipRow.indexOf('</div>'));
    expect(chipRow.split('<Chip ').length - 1).toBe(3);
    expect(chipRow).toContain('<Chip icon="work" label={JOB_TYPE_LABELS[job.jobType]} />');
    expect(page.split('<Chip ').length - 1).toBe(5);
  });

  it('mỗi vị trí in tên, ca làm, địa điểm và số chỗ còn trống của CHÍNH vị trí đó', () => {
    expect(page).toContain('job.positions.map');
    for (const needle of ['position.positionTitle', 'position.shift', 'position.workLocation', 'position.available']) {
      expect(page, needle).toContain(needle);
    }
  });

  it('DEC-07: không dựng lại nhãn khách hàng/đơn vị tuyển dụng và không có mức lương', () => {
    const code = strip(page);
    expect(code).not.toContain('HRP Partners');
    expect(code).not.toMatch(/salary|luong|lương|\bVND\b/i);
  });

  it('RQ-08: có đúng một đường quay lại danh sách việc làm ở `/`', () => {
    expect(page).toContain('Quay lại danh sách việc làm');
    expect(page).toMatch(/href="\/"/);
  });
});

describe('RQ-07/DEC-13 — nút Ứng tuyển dùng lại đúng form đã tách, có thanh dính màn hẹp', () => {
  const cta = raw(CTA);

  it('trang gắn đảo client DetailApplyCta và truyền slug + trạng thái hết chỗ', () => {
    expect(page).toContain('DetailApplyCta');
    expect(page).toMatch(/job=\{\{\s*slug:\s*job\.slug,\s*title:\s*job\.title\s*\}\}/);
    expect(page).toContain('isFull={isFull}');
    expect(page).toMatch(/const\s+isFull\s*=\s*job\.availableSlots\s*===\s*0/);
  });

  it('đảo client dùng lại ApplyModal + SuccessModal, không tự gọi mạng', () => {
    expect(cta).toMatch(/^'use client';/m);
    expect(cta).toContain("from './apply-modal'");
    expect(cta).toContain("from './success-modal'");
    expect(cta).not.toMatch(/\bfetch\(/);
    expect(cta).not.toContain('/api/');
  });

  it('DEC-13: thanh dính cạnh dưới chỉ ở màn hẹp, nút trong luồng chỉ ở màn rộng', () => {
    expect(cta).toMatch(/fixed bottom-0[^"]*sm:hidden/);
    expect(cta).toMatch(/hidden sm:flex/);
  });

  it('DEC-14: hết chỗ thì vô hiệu với đúng nhãn đang dùng trên card `/`', () => {
    expect(cta).toContain("LABEL_FULL = 'Đã đủ chỉ tiêu'");
    expect(cta).toContain("LABEL_APPLY = 'Ứng tuyển'");
    expect(cta).toMatch(/disabled=\{disabled\}/);
    expect(cta).toMatch(/const\s+disabled\s*=\s*isFull\s*\|\|\s*applied/);
  });
});

describe('RQ-10/RISK-05 — card ở `/` điều hướng bằng link thật, hai nút nâng trên phần phủ', () => {
  const card = raw(PORTAL_PAGE);

  it('tiêu đề là Link thật tới đường dẫn chi tiết lấy từ đúng một nguồn', () => {
    expect(card).toContain("import Link from 'next/link'");
    expect(card).toContain('publicJobDetailPath(job.slug)');
    expect(card).toMatch(/<Link\s+href=\{detailHref\}/);
  });

  it('có đúng một phần tử phủ absolute inset-0, và nó bị ẩn khỏi cây trợ năng', () => {
    const overlays = card.match(/className="absolute inset-0[^"]*"/g) ?? [];
    expect(overlays).toHaveLength(1);
    expect(card).toMatch(/aria-hidden="true"\s*\n\s*tabIndex=\{-1\}/);
  });

  it('nút Ứng tuyển và nút Lưu việc đều được nâng relative z-10', () => {
    const buttons = card.match(/className="relative z-10[^"]*"/g) ?? [];
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    // Nút Ứng tuyển vẫn mở form tại chỗ: handler cũ, không có điều hướng nào trong nút.
    expect(card).toMatch(/onClick=\{\(\)\s*=>\s*onApply\(job\)\}/);
  });
});

describe('RISK-04 — module văn bản metadata không có đường chạm văn bản tự do', () => {
  const meta = raw(META);

  it('không đọc quan hệ đơn tuyển dụng, không deref khoá văn bản tự do, không biết publicSelect', () => {
    expect(meta).not.toMatch(/staffingOrders?/);
    expect(meta).not.toMatch(/\.description\b/);
    expect(meta).not.toContain('publicSelect');
  });

  it('chỉ nhận DTO công khai, không nhận dòng DB', () => {
    expect(meta).toMatch(/import\s+type\s+\{\s*PublicJobDetailDto\s*\}/);
    expect(meta).not.toContain('PrismaClient');
    expect(meta).not.toContain('getPrisma');
  });
});

describe('DEC-08 — trang chi tiết nằm trong đúng khung của bề mặt công khai', () => {
  it('layout của viec-lam mount GlobalNavbar + GlobalFooter, không định nghĩa token mới', () => {
    const layout = strip(raw(LAYOUT));
    expect(layout).toContain('<GlobalNavbar />');
    expect(layout).toContain('<GlobalFooter />');
    expect(layout).not.toContain('--color-');
    expect(layout).not.toContain('prefers-reduced-motion');
  });
});
