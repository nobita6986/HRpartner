import { describe, expect, it } from 'vitest';
import {
  JOB_POSTING_RICH_TEXT_SCHEMA_VERSION,
  renderJobPostingRichText,
  validateRichText,
} from '@/src/shared/content/job-posting-rich-text';
import {
  parseBiJobsPublicFeedV1,
  type RecruitmentPostPublicJobItemV1,
} from '../bi-jobs-feed-contract';
import {
  buildBiFeedOrderDescription,
  buildBiJobPostingSlug,
  compileStandardBriefToJobPosting,
  extractShiftTimes,
  formatSalaryDisplayFromCompensation,
  parseBiFeedSyncMarker,
  resolveMonthlySalaryRefVnd,
} from '../bi-jobs-feed-mapper';

const SAMPLE_HWA_SUNG_JOB: RecruitmentPostPublicJobItemV1 = {
  id: 'a21c7198-9fc5-4f4c-83b5-ed7db66d03d3',
  brief_id: 'a21c7198-9fc5-4f4c-83b5-ed7db66d03d3',
  version: 2,
  published_at: '2026-11-11T10:19:50.145675+00:00',
  updated_at: '2026-11-11T10:19:50.145675+00:00',
  location: {
    province_code: 'PHU_THO',
    province_name: 'Phú Thọ',
    industrial_park_code: 'PT_CAM_KHE',
    industrial_park_name: 'KCN Cẩm Khê',
  },
  general: {
    customer_name: 'Công ty TNHH Hwa Sung Vina',
    investment_origin: 'Hàn Quốc',
    manufacturing_industry: 'Sản xuất linh kiện điện tử (dây cáp, tai nghe)',
    job_description: 'Lắp ráp, kiểm tra ngoại quan linh kiện điện tử',
    environment_types: ['NORMAL_ROOM'],
    work_postures: ['STANDING', 'SITTING'],
    shift_pattern: 'TWO_SHIFTS',
    shift_details: 'ca ngày 08 : 00 - 20 : 00 , ca đêm 20 : 00 - 08 : 00',
    labor_types: [
      { labor_type_key: 'TEMPORARY', display_name: 'Thời vụ' },
      { labor_type_key: 'PERMANENT', display_name: 'Chính thức' },
    ],
    supply_schedule_text: 'Phỏng vấn liên tục các ngày trong tuần từ T2 - T7',
    expected_headcount: 100,
  },
  candidate: {
    age_min: 18,
    age_max: 42,
    gender_requirement: 'ANY',
    gender_label: 'Nam/Nữ',
    education_requirement: 'NONE',
    experience_required: false,
    experience_details: 'Không yêu cầu kinh nghiệm',
    accept_former_customer_workers: true,
    entry_assessment_text: 'Phỏng vấn trực tiếp, biết đọc viết cơ bản',
    other_requirements_text: 'Nhanh nhẹn, sức khỏe tốt',
  },
  compensation: {
    base_salary_vnd: '4300000',
    base_salary_conditions: '26 công chuẩn',
    attendance_bonus_vnd: '500000',
    attendance_bonus_conditions: 'Đủ 26 công',
    living_allowance_vnd: '400000',
    living_allowance_conditions: 'Tính theo ngày công',
    seniority_allowance_vnd: '300000',
    seniority_allowance_conditions: 'Từ tháng thứ 2',
    eyesight_allowance_vnd: null,
    eyesight_allowance_conditions: null,
    other_allowance_text: 'Hỗ trợ xăng xe nhà ở',
    average_income_min_vnd: '9000000',
    average_income_max_vnd: '12000000',
    salary_payment_schedule: 'Ngày 15 hàng tháng',
    salary_advance_available: true,
    salary_advance_amount_vnd: '2000000',
    salary_advance_schedule: 'Sau 7 ngày công',
    weekly_salary_available: true,
    weekly_salary_payment_schedule: 'Thứ 6 hàng tuần',
    day_shift_8h_vnd: '240000',
    day_shift_11h_vnd: '340000',
    night_shift_8h_vnd: '280000',
    night_shift_11h_vnd: '390000',
    sunday_day_11h_vnd: '480000',
    sunday_night_11h_vnd: '520000',
    holiday_day_11h_vnd: null,
    holiday_night_11h_vnd: null,
    ppe_provided: true,
    ppe_details: 'Áo đồng phục miễn phí',
    other_benefits: 'Bao ăn ca tại nhà máy',
  },
  documents: {
    require_original_cccd_and_copy: true,
    require_certified_resume: false,
    require_health_certificate_within_6_months: false,
    require_photo_3x4: true,
    require_degree_or_certificate: false,
    require_social_insurance_book: false,
    require_other_documents: true,
    other_documents_text: '02 bản photo CCCD',
  },
};

describe('bi-jobs-feed-contract & bi-jobs-feed-mapper (AC-01)', () => {
  it('validates canonical BI feed v1 payload and rejects invalid schema versions', () => {
    const badVersion = parseBiJobsPublicFeedV1({ schema_version: 2, jobs: [] });
    expect(badVersion.ok).toBe(false);

    const valid = parseBiJobsPublicFeedV1({
      schema_version: 1,
      jobs: [SAMPLE_HWA_SUNG_JOB],
    });
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.data.jobs).toHaveLength(1);
      expect(valid.data.jobs[0].brief_id).toBe(SAMPLE_HWA_SUNG_JOB.brief_id);
      expect(valid.data.jobs[0].location.industrial_park_name).toBe('KCN Cẩm Khê');
    }
  });

  it('compiles 4-section brief into valid Tiptap v1 rich-text documents and slot metadata', () => {
    const compiled = compileStandardBriefToJobPosting(SAMPLE_HWA_SUNG_JOB);

    expect(compiled.title).toContain('Tuyển 100 LĐPT (Thời vụ / Chính thức)');
    expect(compiled.title).toContain('Công ty TNHH Hwa Sung Vina (KCN Cẩm Khê)');
    expect(compiled.salaryDisplay).toBe('9.000.000 – 12.000.000 ₫/tháng (LCB: 4.300.000 ₫)');
    expect(compiled.workLocation).toBe('KCN Cẩm Khê, Phú Thọ');
    expect(compiled.shiftStart).toBe('08:00');
    expect(compiled.shiftEnd).toBe('20:00');
    expect(compiled.slotsNeeded).toBe(100);
    expect(compiled.monthlyIncomeRefVnd).toBe(12000000n);

    for (const doc of [
      compiled.descriptionJson,
      compiled.requirementsJson,
      compiled.benefitsJson,
      compiled.applicationInstructionsJson,
    ]) {
      const validation = validateRichText(JOB_POSTING_RICH_TEXT_SCHEMA_VERSION, doc);
      expect(validation.ok).toBe(true);

      const rendered = renderJobPostingRichText(JOB_POSTING_RICH_TEXT_SCHEMA_VERSION, doc);
      expect(rendered.ok).toBe(true);
    }
  });

  it('extracts shift times, formats slugs, and round-trips BI sync markers', () => {
    expect(extractShiftTimes('TWO_SHIFTS', 'ca ngày 08 : 00 - 20 : 00')).toEqual({
      shiftStart: '08:00',
      shiftEnd: '20:00',
    });
    expect(extractShiftTimes('DAY_ONLY', null)).toEqual({
      shiftStart: '08:00',
      shiftEnd: '17:00',
    });

    const slug = buildBiJobPostingSlug(
      'Công ty TNHH Hwa Sung Vina',
      'KCN Cẩm Khê',
      'a21c7198-9fc5-4f4c-83b5-ed7db66d03d3',
    );
    expect(slug).toBe('cong-ty-tnhh-hwa-sung-vina-kcn-cam-khe-a21c7198');

    const desc = buildBiFeedOrderDescription(SAMPLE_HWA_SUNG_JOB, {
      briefId: SAMPLE_HWA_SUNG_JOB.brief_id,
      version: 3,
    });
    expect(parseBiFeedSyncMarker(desc)).toEqual({
      briefId: SAMPLE_HWA_SUNG_JOB.brief_id,
      version: 3,
    });

    expect(
      formatSalaryDisplayFromCompensation({
        ...SAMPLE_HWA_SUNG_JOB.compensation,
        average_income_min_vnd: null,
        average_income_max_vnd: null,
        base_salary_vnd: '5300000',
      }),
    ).toBe('Lương cơ bản: 5.300.000 ₫/tháng');
    expect(resolveMonthlySalaryRefVnd(SAMPLE_HWA_SUNG_JOB.compensation)).toBe(12000000n);
  });
});
