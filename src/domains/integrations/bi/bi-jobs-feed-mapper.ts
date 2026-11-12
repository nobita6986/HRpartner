/**
 * bi-jobs-feed-mapper.ts — hrp-bi-jobs-feed-sync-v1 (RQ-01, DEC-01, DEC-03)
 *
 * Pure, deterministic compiler that transforms the canonical 4-section
 * "Phiếu yêu cầu tuyển dụng dự án" (`StandardRecruitmentBriefInput` /
 * `RecruitmentPostPublicJobItemV1`) into HRP's JobPosting + StaffingOrderSlot
 * fields and Tiptap ProseMirror JSON (`contentSchemaVersion = 1`).
 *
 * Zero Node-only imports so this module can be safely imported by both:
 *  - Server-side BI Jobs Feed sync (`bi-jobs-feed.service.ts`)
 *  - Client-side Admin 4-Section Standard Form (`standard-brief-assistant.tsx`)
 */

import {
  JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
  validateRichText,
  type JobPostingRichTextDoc,
  type JobPostingRichTextNode,
} from '@/src/shared/content/job-posting-rich-text';
import {
  EDUCATION_REQUIREMENT_LABELS,
  ENVIRONMENT_TYPE_LABELS,
  GENDER_REQUIREMENT_LABELS,
  SHIFT_PATTERN_LABELS,
  WORK_POSTURE_LABELS,
  type RecruitmentPostPublicCompensationV1,
  type RecruitmentShiftPattern,
  type StandardRecruitmentBriefInput,
} from './bi-jobs-feed-contract';

const VND_FORMAT = new Intl.NumberFormat('vi-VN');

export function formatVndAmount(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw).replace(/[^\d]/g, '');
  if (!cleaned) return null;
  const num = Number.parseInt(cleaned, 10);
  if (!Number.isFinite(num) || num <= 0) return null;
  return `${VND_FORMAT.format(num)} ₫`;
}

export function parsePositiveVndInt(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw).replace(/[^\d]/g, '');
  if (!cleaned) return null;
  const num = Number.parseInt(cleaned, 10);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

export function slugifyVietnamese(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

export function buildBiJobPostingSlug(
  customerName: string,
  industrialParkName: string,
  briefId: string,
): string {
  const customerSlug = slugifyVietnamese(customerName) || 'nha-may';
  const parkSlug = slugifyVietnamese(industrialParkName) || 'kcn';
  const shortId = briefId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase() || 'bifeed';
  return `${customerSlug}-${parkSlug}-${shortId}`.slice(0, 120);
}

/**
 * Extracts canonical HH:MM start/end from `shift_details` if present,
 * falling back to standard factory shift hours by `shift_pattern`.
 */
export function extractShiftTimes(
  shiftPattern: RecruitmentShiftPattern,
  shiftDetails: string | null | undefined,
): { shiftStart: string; shiftEnd: string } {
  if (shiftDetails) {
    const match = shiftDetails.match(
      /(\d{1,2})\s*[:hH]\s*(\d{2})\s*[-–~đến]+\s*(\d{1,2})\s*[:hH]\s*(\d{2})/,
    );
    if (match) {
      const h1 = Number.parseInt(match[1], 10);
      const m1 = Number.parseInt(match[2], 10);
      const h2 = Number.parseInt(match[3], 10);
      const m2 = Number.parseInt(match[4], 10);
      if (h1 >= 0 && h1 <= 23 && m1 >= 0 && m1 <= 59 && h2 >= 0 && h2 <= 23 && m2 >= 0 && m2 <= 59) {
        return {
          shiftStart: `${String(h1).padStart(2, '0')}:${String(m1).padStart(2, '0')}`,
          shiftEnd: `${String(h2).padStart(2, '0')}:${String(m2).padStart(2, '0')}`,
        };
      }
    }
  }

  switch (shiftPattern) {
    case 'DAY_ONLY':
      return { shiftStart: '08:00', shiftEnd: '17:00' };
    case 'TWO_SHIFTS':
      return { shiftStart: '08:00', shiftEnd: '20:00' };
    case 'THREE_SHIFTS':
      return { shiftStart: '06:00', shiftEnd: '14:00' };
    case 'OTHER':
    default:
      return { shiftStart: '08:00', shiftEnd: '17:00' };
  }
}

/**
 * Resolves `JobPosting.salaryDisplay` from Section 3 (`compensation`).
 */
export function formatSalaryDisplayFromCompensation(
  comp: RecruitmentPostPublicCompensationV1,
): string | null {
  const minVnd = parsePositiveVndInt(comp.average_income_min_vnd);
  const maxVnd = parsePositiveVndInt(comp.average_income_max_vnd);
  const baseVnd = parsePositiveVndInt(comp.base_salary_vnd);

  let incomePart: string | null = null;
  if (minVnd !== null && maxVnd !== null) {
    incomePart =
      minVnd === maxVnd
        ? `${VND_FORMAT.format(minVnd)} ₫/tháng`
        : `${VND_FORMAT.format(minVnd)} – ${VND_FORMAT.format(maxVnd)} ₫/tháng`;
  } else if (maxVnd !== null) {
    incomePart = `Tới ${VND_FORMAT.format(maxVnd)} ₫/tháng`;
  } else if (minVnd !== null) {
    incomePart = `Từ ${VND_FORMAT.format(minVnd)} ₫/tháng`;
  }

  if (incomePart && baseVnd !== null) {
    return `${incomePart} (LCB: ${VND_FORMAT.format(baseVnd)} ₫)`.slice(0, 200);
  }
  if (incomePart) {
    return incomePart.slice(0, 200);
  }
  if (baseVnd !== null) {
    return `Lương cơ bản: ${VND_FORMAT.format(baseVnd)} ₫/tháng`.slice(0, 200);
  }

  const day11 = parsePositiveVndInt(comp.day_shift_11h_vnd);
  const day8 = parsePositiveVndInt(comp.day_shift_8h_vnd);
  if (day11 !== null) {
    return `Ca ngày 11h: ${VND_FORMAT.format(day11)} ₫/ca`.slice(0, 200);
  }
  if (day8 !== null) {
    return `Ca ngày 8h: ${VND_FORMAT.format(day8)} ₫/ca`.slice(0, 200);
  }

  return null;
}

/**
 * Resolves monthly reference VND for `StaffingOrderSlot.hourlyRateVnd` so
 * `/viec-lam` salary buckets (`5-10`, `10-15` triệu) and `topPaid` sorting work.
 */
export function resolveMonthlySalaryRefVnd(
  comp: RecruitmentPostPublicCompensationV1,
): bigint | null {
  const maxVnd = parsePositiveVndInt(comp.average_income_max_vnd);
  if (maxVnd !== null) return BigInt(maxVnd);
  const minVnd = parsePositiveVndInt(comp.average_income_min_vnd);
  if (minVnd !== null) return BigInt(minVnd);
  const baseVnd = parsePositiveVndInt(comp.base_salary_vnd);
  if (baseVnd !== null) return BigInt(baseVnd);
  return null;
}

// ---------------------------------------------------------------------------
// Tiptap ProseMirror v1 node builders
// ---------------------------------------------------------------------------

function textNode(text: string, bold = false): JobPostingRichTextNode {
  if (bold) {
    return { type: 'text', text, marks: [{ type: 'bold' }] };
  }
  return { type: 'text', text };
}

function paragraphNode(children: JobPostingRichTextNode[]): JobPostingRichTextNode {
  return {
    type: 'paragraph',
    content: children.length > 0 ? children : [{ type: 'text', text: '' }],
  };
}

function headingNode(level: 2 | 3, title: string): JobPostingRichTextNode {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text: title }],
  };
}

function labelValueBulletItem(label: string, value: string): JobPostingRichTextNode {
  return {
    type: 'listItem',
    content: [
      paragraphNode([
        textNode(`${label}: `, true),
        textNode(value),
      ]),
    ],
  };
}

function plainBulletItem(text: string, boldPrefix?: string): JobPostingRichTextNode {
  return {
    type: 'listItem',
    content: [
      paragraphNode(
        boldPrefix
          ? [textNode(boldPrefix, true), textNode(text)]
          : [textNode(text)],
      ),
    ],
  };
}

function bulletListNode(items: JobPostingRichTextNode[]): JobPostingRichTextNode {
  return {
    type: 'bulletList',
    content: items,
  };
}

function ensureValidDoc(nodes: JobPostingRichTextNode[]): JobPostingRichTextDoc {
  const doc: JobPostingRichTextDoc = {
    type: 'doc',
    content: nodes.length > 0 ? nodes : [paragraphNode([textNode('Đang cập nhật.')])],
  };
  const check = validateRichText(JOB_POSTING_RICH_TEXT_SCHEMA_VERSION, doc);
  if (!check.ok) {
    return {
      type: 'doc',
      content: [paragraphNode([textNode('Thông tin chi tiết đang cập nhật.')])],
    };
  }
  return doc;
}

function formatMoneyWithCondition(
  amountRaw: string | null | undefined,
  conditionRaw: string | null | undefined,
): string | null {
  const formatted = formatVndAmount(amountRaw);
  const condition = conditionRaw?.trim() || null;
  if (formatted && condition) return `${formatted} (${condition})`;
  if (formatted) return formatted;
  if (condition) return condition;
  return null;
}

export interface CompiledStandardJobPosting {
  title: string;
  salaryDisplay: string | null;
  positionCode: string;
  positionTitle: string;
  workLocation: string;
  shiftStart: string;
  shiftEnd: string;
  slotsNeeded: number;
  monthlyIncomeRefVnd: bigint | null;
  descriptionJson: JobPostingRichTextDoc;
  requirementsJson: JobPostingRichTextDoc;
  benefitsJson: JobPostingRichTextDoc;
  applicationInstructionsJson: JobPostingRichTextDoc;
  contentSchemaVersion: number;
}

/**
 * Compiles the 4-section "Phiếu yêu cầu tuyển dụng dự án" into HRP's canonical
 * JobPosting + StaffingOrderSlot representation.
 */
export function compileStandardBriefToJobPosting(
  brief: StandardRecruitmentBriefInput,
): CompiledStandardJobPosting {
  const { location, general, candidate, compensation, documents } = brief;

  const customerName = general.customer_name.trim();
  const parkName = location.industrial_park_name.trim();
  const provinceName = location.province_name.trim();
  const workLocation = `${parkName}, ${provinceName}`;

  const laborTypeNames = general.labor_types
    .map((lt) => lt.display_name.trim())
    .filter((s) => s.length > 0);
  const laborTypeSummary =
    laborTypeNames.length > 0 ? laborTypeNames.join(' / ') : 'Lao động phổ thông';

  const headcount =
    general.expected_headcount !== null && general.expected_headcount > 0
      ? general.expected_headcount
      : null;

  const headcountPrefix = headcount ? `Tuyển ${headcount} LĐPT` : 'Tuyển LĐPT';
  const title = `${headcountPrefix} (${laborTypeSummary}) - ${customerName} (${parkName})`.slice(
    0,
    200,
  );

  const shortJobDesc = general.job_description
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
  const positionTitle = `LĐPT (${laborTypeSummary}) — ${shortJobDesc}`.slice(0, 150);

  const { shiftStart, shiftEnd } = extractShiftTimes(
    general.shift_pattern,
    general.shift_details,
  );
  const slotsNeeded = headcount ?? 50;
  const salaryDisplay = formatSalaryDisplayFromCompensation(compensation);
  const monthlyIncomeRefVnd = resolveMonthlySalaryRefVnd(compensation);

  // =========================================================================
  // PHẦN 1: Thông tin chung dự án -> descriptionJson
  // =========================================================================
  const section1Bullets: JobPostingRichTextNode[] = [];
  if (brief.project_name?.trim()) {
    section1Bullets.push(labelValueBulletItem('Tên dự án', brief.project_name.trim()));
  }
  section1Bullets.push(labelValueBulletItem('Khách hàng / Nhà máy', customerName));
  section1Bullets.push(labelValueBulletItem('Khu công nghiệp / Địa chỉ', workLocation));
  if (general.investment_origin?.trim()) {
    section1Bullets.push(labelValueBulletItem('Vốn đầu tư', general.investment_origin.trim()));
  }
  if (general.manufacturing_industry?.trim()) {
    section1Bullets.push(
      labelValueBulletItem('Ngành nghề sản xuất', general.manufacturing_industry.trim()),
    );
  }
  section1Bullets.push(labelValueBulletItem('Công việc thực hiện', general.job_description.trim()));

  const envLabels = general.environment_types.map((e) => ENVIRONMENT_TYPE_LABELS[e] ?? e);
  const postureLabels = general.work_postures.map((p) => WORK_POSTURE_LABELS[p] ?? p);
  const envAndPosture = [...envLabels, ...postureLabels].join(' · ');
  if (envAndPosture) {
    section1Bullets.push(labelValueBulletItem('Môi trường & Tư thế làm việc', envAndPosture));
  }

  const shiftLabel = SHIFT_PATTERN_LABELS[general.shift_pattern] ?? general.shift_pattern;
  const shiftFullText = general.shift_details?.trim()
    ? `${shiftLabel} (${general.shift_details.trim()})`
    : shiftLabel;
  section1Bullets.push(labelValueBulletItem('Thời gian / Ca làm việc', shiftFullText));
  section1Bullets.push(labelValueBulletItem('Hình thức tuyển dụng', laborTypeSummary));

  if (general.supply_schedule_text?.trim()) {
    section1Bullets.push(labelValueBulletItem('Lịch cấp / Phỏng vấn', general.supply_schedule_text.trim()));
  }
  if (headcount !== null) {
    section1Bullets.push(
      labelValueBulletItem('Số lượng tuyển dự kiến', `${VND_FORMAT.format(headcount)} lao động`),
    );
  }

  const descriptionJson = ensureValidDoc([
    headingNode(3, '1. Thông tin chung dự án & công việc'),
    bulletListNode(section1Bullets),
  ]);

  // =========================================================================
  // PHẦN 2: Yêu cầu ứng viên -> requirementsJson
  // =========================================================================
  const section2Bullets: JobPostingRichTextNode[] = [];
  if (candidate.age_min !== null || candidate.age_max !== null) {
    const ageText =
      candidate.age_min !== null && candidate.age_max !== null
        ? `Từ ${candidate.age_min} đến ${candidate.age_max} tuổi`
        : candidate.age_min !== null
        ? `Từ ${candidate.age_min} tuổi trở lên`
        : `Tối đa ${candidate.age_max} tuổi`;
    section2Bullets.push(labelValueBulletItem('Độ tuổi', ageText));
  } else {
    section2Bullets.push(labelValueBulletItem('Độ tuổi', 'Theo quy định lao động hiện hành'));
  }

  const genderText =
    candidate.gender_label?.trim() ||
    GENDER_REQUIREMENT_LABELS[candidate.gender_requirement] ||
    'Nam / Nữ';
  section2Bullets.push(labelValueBulletItem('Giới tính', genderText));

  const eduText =
    EDUCATION_REQUIREMENT_LABELS[candidate.education_requirement] ?? 'Không yêu cầu bằng cấp';
  section2Bullets.push(labelValueBulletItem('Trình độ học vấn tối thiểu', eduText));

  const expText = candidate.experience_required
    ? candidate.experience_details?.trim()
      ? `Yêu cầu có kinh nghiệm (${candidate.experience_details.trim()})`
      : 'Yêu cầu có kinh nghiệm'
    : candidate.experience_details?.trim()
    ? `Không yêu cầu kinh nghiệm (${candidate.experience_details.trim()})`
    : 'Không yêu cầu kinh nghiệm (sẽ được đào tạo khi vào làm)';
  section2Bullets.push(labelValueBulletItem('Kinh nghiệm', expText));

  section2Bullets.push(
    labelValueBulletItem(
      'Lao động đã từng làm tại công ty khách hàng',
      candidate.accept_former_customer_workers
        ? 'Có nhận lại lao động cũ'
        : 'Không nhận lại lao động đã nghỉ việc tại nhà máy',
    ),
  );

  if (candidate.entry_assessment_text?.trim()) {
    section2Bullets.push(
      labelValueBulletItem('Hình thức kiểm tra đầu vào', candidate.entry_assessment_text.trim()),
    );
  }
  if (candidate.other_requirements_text?.trim()) {
    section2Bullets.push(
      labelValueBulletItem('Yêu cầu khác', candidate.other_requirements_text.trim()),
    );
  }

  const requirementsJson = ensureValidDoc([
    headingNode(3, '2. Tiêu chí & yêu cầu ứng viên'),
    bulletListNode(section2Bullets),
  ]);

  // =========================================================================
  // PHẦN 3: Chế độ lương, thưởng, phúc lợi -> benefitsJson
  // =========================================================================
  const salaryBullets: JobPostingRichTextNode[] = [];
  if (salaryDisplay) {
    salaryBullets.push(labelValueBulletItem('Thu nhập bình quân dự kiến / tháng', salaryDisplay));
  }
  const baseSalaryText = formatMoneyWithCondition(
    compensation.base_salary_vnd,
    compensation.base_salary_conditions,
  );
  if (baseSalaryText) {
    salaryBullets.push(labelValueBulletItem('Lương cơ bản', baseSalaryText));
  }
  const attendanceBonusText = formatMoneyWithCondition(
    compensation.attendance_bonus_vnd,
    compensation.attendance_bonus_conditions,
  );
  if (attendanceBonusText) {
    salaryBullets.push(labelValueBulletItem('Thưởng chuyên cần', attendanceBonusText));
  }
  const livingAllowanceText = formatMoneyWithCondition(
    compensation.living_allowance_vnd,
    compensation.living_allowance_conditions,
  );
  if (livingAllowanceText) {
    salaryBullets.push(labelValueBulletItem('Phụ cấp Đời sống', livingAllowanceText));
  }
  const seniorityAllowanceText = formatMoneyWithCondition(
    compensation.seniority_allowance_vnd,
    compensation.seniority_allowance_conditions,
  );
  if (seniorityAllowanceText) {
    salaryBullets.push(labelValueBulletItem('Phụ cấp Thâm niên', seniorityAllowanceText));
  }
  const eyesightAllowanceText = formatMoneyWithCondition(
    compensation.eyesight_allowance_vnd,
    compensation.eyesight_allowance_conditions,
  );
  if (eyesightAllowanceText) {
    salaryBullets.push(labelValueBulletItem('Phụ cấp Soi kính / Đặc thù', eyesightAllowanceText));
  }
  if (compensation.other_allowance_text?.trim()) {
    salaryBullets.push(
      labelValueBulletItem('Phụ cấp khác', compensation.other_allowance_text.trim()),
    );
  }
  if (compensation.salary_payment_schedule?.trim()) {
    salaryBullets.push(
      labelValueBulletItem('Ngày thanh toán lương', compensation.salary_payment_schedule.trim()),
    );
  }
  if (compensation.salary_advance_available) {
    const advAmount = formatVndAmount(compensation.salary_advance_amount_vnd);
    const advSched = compensation.salary_advance_schedule?.trim();
    const advDetails = [advAmount ? `Mức ứng: ${advAmount}` : null, advSched]
      .filter(Boolean)
      .join(' — ');
    salaryBullets.push(
      labelValueBulletItem('Chế độ ứng lương', advDetails ? `Có hỗ trợ (${advDetails})` : 'Có hỗ trợ ứng lương'),
    );
  }
  if (compensation.weekly_salary_available) {
    const weeklySched = compensation.weekly_salary_payment_schedule?.trim();
    salaryBullets.push(
      labelValueBulletItem(
        'Chế độ lương tuần',
        weeklySched ? `Có trả lương tuần (${weeklySched})` : 'Có hỗ trợ trả lương tuần',
      ),
    );
  }
  if (compensation.ppe_provided) {
    salaryBullets.push(
      labelValueBulletItem(
        'Đồng phục & bảo hộ lao động',
        compensation.ppe_details?.trim()
          ? `Có trang bị (${compensation.ppe_details.trim()})`
          : 'Được cấp phát miễn phí theo quy định nhà máy',
      ),
    );
  }
  if (compensation.other_benefits?.trim()) {
    salaryBullets.push(labelValueBulletItem('Phúc lợi khác', compensation.other_benefits.trim()));
  }

  const shiftRatePairs: Array<{ label: string; raw: string | null }> = [
    { label: 'Ca ngày 8h', raw: compensation.day_shift_8h_vnd },
    { label: 'Ca ngày 11h', raw: compensation.day_shift_11h_vnd },
    { label: 'Ca đêm 8h', raw: compensation.night_shift_8h_vnd },
    { label: 'Ca đêm 11h', raw: compensation.night_shift_11h_vnd },
    { label: 'Chủ nhật ca ngày 11h', raw: compensation.sunday_day_11h_vnd },
    { label: 'Chủ nhật ca đêm 11h', raw: compensation.sunday_night_11h_vnd },
    { label: 'Ngày Lễ ca ngày 11h', raw: compensation.holiday_day_11h_vnd },
    { label: 'Ngày Lễ ca đêm 11h', raw: compensation.holiday_night_11h_vnd },
  ];
  const shiftRateBullets: JobPostingRichTextNode[] = [];
  for (const pair of shiftRatePairs) {
    const formatted = formatVndAmount(pair.raw);
    if (formatted) {
      shiftRateBullets.push(labelValueBulletItem(pair.label, `${formatted} / ca`));
    }
  }

  const section3Nodes: JobPostingRichTextNode[] = [
    headingNode(3, '3. Chế độ lương, thưởng & phúc lợi'),
  ];
  if (salaryBullets.length > 0) {
    section3Nodes.push(bulletListNode(salaryBullets));
  }
  if (shiftRateBullets.length > 0) {
    section3Nodes.push(headingNode(3, 'Bảng đơn giá công theo ca làm việc'));
    section3Nodes.push(bulletListNode(shiftRateBullets));
  }
  if (salaryBullets.length === 0 && shiftRateBullets.length === 0) {
    section3Nodes.push(
      bulletListNode([
        plainBulletItem('Hưởng đầy đủ chế độ lương, thưởng và phụ cấp theo quy định của nhà máy.'),
      ]),
    );
  }

  const benefitsJson = ensureValidDoc(section3Nodes);

  // =========================================================================
  // PHẦN 4: Hồ sơ ứng viên cần chuẩn bị -> applicationInstructionsJson
  // =========================================================================
  const docItems: JobPostingRichTextNode[] = [];
  if (documents.require_original_cccd_and_copy) {
    docItems.push(plainBulletItem('CCCD (bản gốc đối chiếu + bản photo)', '✓ '));
  }
  if (documents.require_certified_resume) {
    docItems.push(plainBulletItem('Sơ yếu lý lịch có xác nhận địa phương', '✓ '));
  }
  if (documents.require_health_certificate_within_6_months) {
    docItems.push(plainBulletItem('Giấy khám sức khỏe (trong vòng 6 tháng)', '✓ '));
  }
  if (documents.require_photo_3x4) {
    docItems.push(plainBulletItem('Ảnh thẻ 3x4', '✓ '));
  }
  if (documents.require_degree_or_certificate) {
    docItems.push(plainBulletItem('Bằng cấp / chứng chỉ (nếu có)', '✓ '));
  }
  if (documents.require_social_insurance_book) {
    docItems.push(plainBulletItem('Sổ BHXH / Mã số BHXH (nếu có)', '✓ '));
  }
  if (documents.require_other_documents) {
    const otherDocText = documents.other_documents_text?.trim() || 'Theo hướng dẫn khi phỏng vấn';
    docItems.push(plainBulletItem(`Giấy tờ khác: ${otherDocText}`, '✓ '));
  }
  if (docItems.length === 0) {
    docItems.push(
      plainBulletItem('CCCD bản gốc (chỉ cần mang CCCD gắn chip khi đi phỏng vấn nhận việc).', '✓ '),
    );
  }

  const applicationInstructionsJson = ensureValidDoc([
    headingNode(3, '4. Hồ sơ ứng viên cần chuẩn bị'),
    bulletListNode(docItems),
    paragraphNode([
      textNode('Cách ứng tuyển nhanh: ', true),
      textNode(
        'Điền Họ tên và Số điện thoại vào biểu mẫu "Ứng tuyển ngay" trên trang này. Bộ phận Tuyển dụng HRPartner sẽ liên hệ tư vấn ca làm việc và đón tiếp tại cổng nhà máy.',
      ),
    ]),
  ]);

  return {
    title,
    salaryDisplay,
    positionCode: 'LDPT',
    positionTitle,
    workLocation,
    shiftStart,
    shiftEnd,
    slotsNeeded,
    monthlyIncomeRefVnd,
    descriptionJson,
    requirementsJson,
    benefitsJson,
    applicationInstructionsJson,
    contentSchemaVersion: JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
  };
}

const BI_FEED_MARKER_RE = /\[BI_FEED_V1\s+version=(\d+)\s+brief_id=([a-zA-Z0-9-]+)\]/;

export function parseBiFeedSyncMarker(
  description: string | null | undefined,
): { briefId: string; version: number } | null {
  if (!description) return null;
  const match = description.match(BI_FEED_MARKER_RE);
  if (!match) return null;
  const version = Number.parseInt(match[1], 10);
  if (!Number.isFinite(version)) return null;
  return {
    version,
    briefId: match[2],
  };
}

export function buildBiFeedOrderDescription(
  brief: StandardRecruitmentBriefInput,
  meta: { briefId: string; version: number },
): string {
  const laborTypes = brief.general.labor_types.map((lt) => lt.display_name).join(', ');
  const shiftLabel = SHIFT_PATTERN_LABELS[brief.general.shift_pattern] ?? brief.general.shift_pattern;
  const industry = brief.general.manufacturing_industry ?? '';
  return [
    `[BI_FEED_V1 version=${meta.version} brief_id=${meta.briefId}]`,
    `Khách hàng: ${brief.general.customer_name}`,
    `Khu vực: ${brief.location.industrial_park_name}, ${brief.location.province_name}`,
    `Hình thức: ${laborTypes || 'Lao động phổ thông'}`,
    `Ca làm việc: ${shiftLabel} ${brief.general.shift_details ?? ''}`.trim(),
    industry ? `Ngành nghề: ${industry}` : '',
  ]
    .filter(Boolean)
    .join(' | ');
}
