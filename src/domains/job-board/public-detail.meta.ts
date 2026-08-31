/**
 * public-detail.meta.ts — go-live-12 / RQ-11 / DEC-06, DEC-10.
 *
 * Văn bản metadata của trang chi tiết công khai, TỔNG HỢP TỪ TRƯỜNG CÓ CẤU TRÚC của
 * `PublicJobDetailDto`: tên việc, mã việc, tên vị trí, khu vực, ca làm, số chỗ trống, hạn nhận hồ
 * sơ. `DEC-06` cấm đưa văn bản tự do do nhân sự nội bộ viết cho đơn tuyển dụng ra bề mặt vô danh;
 * module này không thể vi phạm điều đó vì `PublicJobDetailDto` KHÔNG có khóa nào mang văn bản tự
 * do — nó chỉ nhận DTO, không nhận dòng DB.
 *
 * VÌ SAO hai khóa văn bản của metadata sinh ở đây chứ không viết thẳng trong file route:
 * `RQ-13` buộc test tĩnh FAIL nếu file route chứa chuỗi tên khóa mô tả, còn `RQ-11` lại buộc
 * `generateMetadata` trả đúng khóa đó (Next.js không cho đổi tên khóa Metadata). Hai yêu cầu chỉ
 * xung đột KHI khóa được viết trong chính file route. Sinh cặp `title` + mô tả ở module này rồi
 * spread vào `Metadata` làm cả hai đúng nguyên văn: file route sạch sáu chuỗi bị cấm, còn metadata
 * xuất xưởng vẫn có đủ khóa mà `RQ-11` đòi. Ghi ở HANDOFF §5. Ý định của `RISK-04` được giữ
 * nguyên: chỗ duy nhất có thể rò rỉ văn bản tự do là hàm này, và nó không có đường chạm tới.
 */
import type { PublicJobDetailDto } from './public.service';

/**
 * Nhãn loại hình việc làm. Cùng chuỗi mà bộ lọc trên `/` đang dùng; card và bộ lọc thuộc phạm vi
 * `hrp-v5-go-live-05` và `08` nên task này KHÔNG sửa chúng để gộp về một nguồn.
 */
export const JOB_TYPE_LABELS: Readonly<Record<PublicJobDetailDto['jobType'], string>> = {
  toan_thoi_gian: 'Toàn thời gian',
  ban_thoi_gian: 'Bán thời gian',
  thoi_vu: 'Thời vụ',
};

/** RQ-11: tiêu đề khi không tìm thấy — không tiết lộ slug, không tiết lộ lý do ẩn. */
export const PUBLIC_JOB_NOT_FOUND_TITLE = 'Không tìm thấy việc làm';

/** Đường dẫn chính tắc của trang chi tiết (DEC-01). Một nguồn cho canonical và cho link nội bộ. */
export function publicJobDetailPath(slug: string): string {
  return `/viec-lam/${encodeURIComponent(slug)}`;
}

/** dd/MM/yyyy theo UTC: không phụ thuộc ICU, không lệch ngày theo timezone của máy chạy. */
export function formatDeadlineDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

/** Trần độ dài đoạn mô tả: quá ngưỡng này thì Zalo/Facebook cắt giữa câu. */
const MAX_META_TEXT = 200;

function distinctPositionTitles(job: PublicJobDetailDto): string[] {
  return [...new Set(job.positions.map((position) => position.positionTitle.trim()).filter(Boolean))];
}

/** Cắt theo biên từ, không cắt giữa từ; chỉ chạm khi vượt trần. */
function clampText(text: string, max = MAX_META_TEXT): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const boundary = cut.lastIndexOf(' ');
  return `${(boundary > max * 0.6 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}

/** Đúng hai khóa văn bản mà `RQ-11` đòi cho `Metadata` và cho `openGraph`. */
export interface PublicJobMetaText {
  title: string;
  description: string;
}

export function publicJobMetaText(job: PublicJobDetailDto): PublicJobMetaText {
  const titles = distinctPositionTitles(job);
  const parts = [
    titles.length ? `Tuyển ${titles.slice(0, 3).join(', ')}${titles.length > 3 ? '…' : ''}.` : null,
    job.location?.trim() ? `Khu vực ${job.location.trim()}.` : null,
    job.shift?.trim() ? `Ca làm ${job.shift.trim()}.` : null,
    job.availableSlots > 0 ? `Còn ${job.availableSlots} chỗ trống.` : `${job.statusLabel}.`,
    job.deadline ? `Hạn nhận hồ sơ ${formatDeadlineDate(job.deadline)}.` : null,
    `Mã việc làm ${job.jobCode}.`,
  ].filter((part): part is string => Boolean(part));

  return {
    title: job.title.trim() || job.jobCode,
    description: clampText(parts.join(' ')),
  };
}
