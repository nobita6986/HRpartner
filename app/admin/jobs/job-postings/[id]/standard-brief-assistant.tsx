'use client';

/**
 * standard-brief-assistant.tsx — hrp-bi-jobs-feed-sync-v1 (RQ-04, DEC-01)
 *
 * Standardized 4-section "Phiếu yêu cầu tuyển dụng dự án" form inside the
 * HRP Admin JobPosting editor (`/admin/jobs/job-postings/[id]`).
 *
 * Allows HR/Admin to author or update a JobPosting using the exact same
 * 4-section structure as BI (`location` + `general`, `candidate`,
 * `compensation`, `documents`) and compiles it deterministically into
 * `title`, `salaryDisplay`, `descriptionJson`, `requirementsJson`,
 * `benefitsJson`, and `applicationInstructionsJson`.
 */

import React, { useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import {
  EDUCATION_REQUIREMENT_LABELS,
  ENVIRONMENT_TYPE_LABELS,
  GENDER_REQUIREMENT_LABELS,
  RECRUITMENT_EDUCATION_REQUIREMENTS,
  RECRUITMENT_ENVIRONMENT_TYPES,
  RECRUITMENT_GENDER_REQUIREMENTS,
  RECRUITMENT_SHIFT_PATTERNS,
  RECRUITMENT_WORK_POSTURES,
  SHIFT_PATTERN_LABELS,
  WORK_POSTURE_LABELS,
  type RecruitmentEducationRequirement,
  type RecruitmentEnvironmentType,
  type RecruitmentGenderRequirement,
  type RecruitmentShiftPattern,
  type RecruitmentWorkPosture,
  type StandardRecruitmentBriefInput,
} from '@/src/domains/integrations/bi/bi-jobs-feed-contract';
import { compileStandardBriefToJobPosting } from '@/src/domains/integrations/bi/bi-jobs-feed-mapper';

export interface StandardBriefAssistantProps {
  disabled: boolean;
  defaultProjectName?: string | null;
  defaultWorkLocation?: string | null;
  onApplyCompiled: (compiled: {
    title: string;
    salaryDisplay: string;
    descriptionJson: JSONContent;
    requirementsJson: JSONContent;
    benefitsJson: JSONContent;
    applicationInstructionsJson: JSONContent;
  }) => void;
}

export function StandardBriefAssistant({
  disabled,
  defaultProjectName,
  defaultWorkLocation,
  onApplyCompiled,
}: StandardBriefAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Section 1: Thông tin chung dự án
  const [projectName, setProjectName] = useState(defaultProjectName ?? '');
  const [customerName, setCustomerName] = useState('');
  const [industrialParkName, setIndustrialParkName] = useState(defaultWorkLocation ?? '');
  const [provinceName, setProvinceName] = useState('Phú Thọ');
  const [investmentOrigin, setInvestmentOrigin] = useState('Hàn Quốc');
  const [manufacturingIndustry, setManufacturingIndustry] = useState('Sản xuất linh kiện điện tử');
  const [jobDescription, setJobDescription] = useState('Lắp ráp, kiểm tra ngoại quan linh kiện điện tử');
  const [environmentTypes, setEnvironmentTypes] = useState<RecruitmentEnvironmentType[]>(['NORMAL_ROOM']);
  const [workPostures, setWorkPostures] = useState<RecruitmentWorkPosture[]>(['STANDING', 'SITTING']);
  const [shiftPattern, setShiftPattern] = useState<RecruitmentShiftPattern>('TWO_SHIFTS');
  const [shiftDetails, setShiftDetails] = useState('Ca ngày 08:00 - 20:00, Ca đêm 20:00 - 08:00');
  const [isPermanent, setIsPermanent] = useState(true);
  const [isTemporary, setIsTemporary] = useState(true);
  const [supplyScheduleText, setSupplyScheduleText] = useState('Phỏng vấn hằng ngày từ Thứ 2 đến Thứ 7');
  const [expectedHeadcount, setExpectedHeadcount] = useState('100');

  // Section 2: Yêu cầu ứng viên
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('42');
  const [genderRequirement, setGenderRequirement] = useState<RecruitmentGenderRequirement>('ANY');
  const [educationRequirement, setEducationRequirement] =
    useState<RecruitmentEducationRequirement>('NONE');
  const [experienceRequired, setExperienceRequired] = useState(false);
  const [experienceDetails, setExperienceDetails] = useState('');
  const [acceptFormerWorkers, setAcceptFormerWorkers] = useState(true);
  const [entryAssessmentText, setEntryAssessmentText] = useState('Phỏng vấn trực tiếp, không mù màu');
  const [otherRequirementsText, setOtherRequirementsText] = useState('');

  // Section 3: Chế độ lương, thưởng, phúc lợi
  const [baseSalaryVnd, setBaseSalaryVnd] = useState('5000000');
  const [baseSalaryConditions, setBaseSalaryConditions] = useState('26 ngày công chuẩn');
  const [attendanceBonusVnd, setAttendanceBonusVnd] = useState('500000');
  const [attendanceBonusConditions, setAttendanceBonusConditions] = useState('Đủ 26 công/tháng');
  const [livingAllowanceVnd, setLivingAllowanceVnd] = useState('500000');
  const [livingAllowanceConditions, setLivingAllowanceConditions] = useState('');
  const [seniorityAllowanceVnd, setSeniorityAllowanceVnd] = useState('');
  const [seniorityAllowanceConditions, setSeniorityAllowanceConditions] = useState('');
  const [eyesightAllowanceVnd, setEyesightAllowanceVnd] = useState('');
  const [eyesightAllowanceConditions, setEyesightAllowanceConditions] = useState('');
  const [otherAllowanceText, setOtherAllowanceText] = useState('');
  const [avgIncomeMinVnd, setAvgIncomeMinVnd] = useState('9000000');
  const [avgIncomeMaxVnd, setAvgIncomeMaxVnd] = useState('12000000');
  const [salaryPaymentSchedule, setSalaryPaymentSchedule] = useState('Ngày 10 - 15 hàng tháng');
  const [salaryAdvanceAvailable, setSalaryAdvanceAvailable] = useState(true);
  const [salaryAdvanceAmountVnd, setSalaryAdvanceAmountVnd] = useState('');
  const [salaryAdvanceSchedule, setSalaryAdvanceSchedule] = useState('Ứng lương sau 7 ngày làm việc');
  const [weeklySalaryAvailable, setWeeklySalaryAvailable] = useState(false);
  const [weeklySalarySchedule, setWeeklySalarySchedule] = useState('');
  const [dayShift8hVnd, setDayShift8hVnd] = useState('');
  const [dayShift11hVnd, setDayShift11hVnd] = useState('350000');
  const [nightShift8hVnd, setNightShift8hVnd] = useState('');
  const [nightShift11hVnd, setNightShift11hVnd] = useState('400000');
  const [sundayDay11hVnd, setSundayDay11hVnd] = useState('');
  const [sundayNight11hVnd, setSundayNight11hVnd] = useState('');
  const [holidayDay11hVnd, setHolidayDay11hVnd] = useState('');
  const [holidayNight11hVnd, setHolidayNight11hVnd] = useState('');
  const [ppeProvided, setPpeProvided] = useState(true);
  const [ppeDetails, setPpeDetails] = useState('Cấp phát đồng phục miễn phí');
  const [otherBenefits, setOtherBenefits] = useState('Bao cơm ca tại nhà máy');

  // Section 4: Hồ sơ ứng viên cần chuẩn bị
  const [reqCccd, setReqCccd] = useState(true);
  const [reqResume, setReqResume] = useState(false);
  const [reqHealthCert, setReqHealthCert] = useState(false);
  const [reqPhoto, setReqPhoto] = useState(false);
  const [reqDegree, setReqDegree] = useState(false);
  const [reqBhxh, setReqBhxh] = useState(false);
  const [reqOtherDocs, setReqOtherDocs] = useState(false);
  const [otherDocsText, setOtherDocsText] = useState('');

  const [formNotice, setFormNotice] = useState<string | null>(null);

  function toggleEnv(env: RecruitmentEnvironmentType) {
    setEnvironmentTypes((prev) =>
      prev.includes(env) ? prev.filter((item) => item !== env) : [...prev, env],
    );
  }

  function togglePosture(posture: RecruitmentWorkPosture) {
    setWorkPostures((prev) =>
      prev.includes(posture) ? prev.filter((item) => item !== posture) : [...prev, posture],
    );
  }

  function handleApplyToEditor() {
    setFormNotice(null);
    const trimmedCustomer = customerName.trim() || projectName.trim() || 'Nhà máy đối tác HRP';
    const trimmedPark = industrialParkName.trim() || 'Khu công nghiệp';
    const trimmedProvince = provinceName.trim() || 'Việt Nam';
    const trimmedJobDesc = jobDescription.trim() || 'Sản xuất, lắp ráp linh kiện theo dây chuyền';

    const laborTypes = [
      ...(isTemporary ? [{ labor_type_key: 'TEMPORARY', display_name: 'Thời vụ' }] : []),
      ...(isPermanent ? [{ labor_type_key: 'PERMANENT', display_name: 'Chính thức' }] : []),
    ];

    const parsedHeadcount = Number.parseInt(expectedHeadcount.replace(/[^\d]/g, ''), 10);
    const parsedAgeMin = Number.parseInt(ageMin.replace(/[^\d]/g, ''), 10);
    const parsedAgeMax = Number.parseInt(ageMax.replace(/[^\d]/g, ''), 10);

    const briefInput: StandardRecruitmentBriefInput = {
      project_name: projectName.trim() || null,
      location: {
        province_code: 'CUSTOM',
        province_name: trimmedProvince,
        industrial_park_code: 'CUSTOM_PARK',
        industrial_park_name: trimmedPark,
      },
      general: {
        customer_name: trimmedCustomer,
        investment_origin: investmentOrigin.trim() || null,
        manufacturing_industry: manufacturingIndustry.trim() || null,
        job_description: trimmedJobDesc,
        environment_types: environmentTypes,
        work_postures: workPostures,
        shift_pattern: shiftPattern,
        shift_details: shiftDetails.trim() || null,
        labor_types:
          laborTypes.length > 0
            ? laborTypes
            : [{ labor_type_key: 'GENERAL', display_name: 'Lao động phổ thông' }],
        supply_schedule_text: supplyScheduleText.trim() || null,
        expected_headcount: Number.isFinite(parsedHeadcount) && parsedHeadcount > 0 ? parsedHeadcount : null,
      },
      candidate: {
        age_min: Number.isFinite(parsedAgeMin) ? parsedAgeMin : null,
        age_max: Number.isFinite(parsedAgeMax) ? parsedAgeMax : null,
        gender_requirement: genderRequirement,
        gender_label: GENDER_REQUIREMENT_LABELS[genderRequirement],
        education_requirement: educationRequirement,
        experience_required: experienceRequired,
        experience_details: experienceDetails.trim() || null,
        accept_former_customer_workers: acceptFormerWorkers,
        entry_assessment_text: entryAssessmentText.trim() || null,
        other_requirements_text: otherRequirementsText.trim() || null,
      },
      compensation: {
        base_salary_vnd: baseSalaryVnd.trim() || null,
        base_salary_conditions: baseSalaryConditions.trim() || null,
        attendance_bonus_vnd: attendanceBonusVnd.trim() || null,
        attendance_bonus_conditions: attendanceBonusConditions.trim() || null,
        living_allowance_vnd: livingAllowanceVnd.trim() || null,
        living_allowance_conditions: livingAllowanceConditions.trim() || null,
        seniority_allowance_vnd: seniorityAllowanceVnd.trim() || null,
        seniority_allowance_conditions: seniorityAllowanceConditions.trim() || null,
        eyesight_allowance_vnd: eyesightAllowanceVnd.trim() || null,
        eyesight_allowance_conditions: eyesightAllowanceConditions.trim() || null,
        other_allowance_text: otherAllowanceText.trim() || null,
        average_income_min_vnd: avgIncomeMinVnd.trim() || null,
        average_income_max_vnd: avgIncomeMaxVnd.trim() || null,
        salary_payment_schedule: salaryPaymentSchedule.trim() || null,
        salary_advance_available: salaryAdvanceAvailable,
        salary_advance_amount_vnd: salaryAdvanceAmountVnd.trim() || null,
        salary_advance_schedule: salaryAdvanceSchedule.trim() || null,
        weekly_salary_available: weeklySalaryAvailable,
        weekly_salary_payment_schedule: weeklySalarySchedule.trim() || null,
        day_shift_8h_vnd: dayShift8hVnd.trim() || null,
        day_shift_11h_vnd: dayShift11hVnd.trim() || null,
        night_shift_8h_vnd: nightShift8hVnd.trim() || null,
        night_shift_11h_vnd: nightShift11hVnd.trim() || null,
        sunday_day_11h_vnd: sundayDay11hVnd.trim() || null,
        sunday_night_11h_vnd: sundayNight11hVnd.trim() || null,
        holiday_day_11h_vnd: holidayDay11hVnd.trim() || null,
        holiday_night_11h_vnd: holidayNight11hVnd.trim() || null,
        ppe_provided: ppeProvided,
        ppe_details: ppeDetails.trim() || null,
        other_benefits: otherBenefits.trim() || null,
      },
      documents: {
        require_original_cccd_and_copy: reqCccd,
        require_certified_resume: reqResume,
        require_health_certificate_within_6_months: reqHealthCert,
        require_photo_3x4: reqPhoto,
        require_degree_or_certificate: reqDegree,
        require_social_insurance_book: reqBhxh,
        require_other_documents: reqOtherDocs,
        other_documents_text: otherDocsText.trim() || null,
      },
    };

    const compiled = compileStandardBriefToJobPosting(briefInput);
    onApplyCompiled({
      title: compiled.title,
      salaryDisplay: compiled.salaryDisplay ?? '',
      descriptionJson: compiled.descriptionJson as unknown as JSONContent,
      requirementsJson: compiled.requirementsJson as unknown as JSONContent,
      benefitsJson: compiled.benefitsJson as unknown as JSONContent,
      applicationInstructionsJson: compiled.applicationInstructionsJson as unknown as JSONContent,
    });
    setFormNotice(
      'Đã điền chuẩn 4 phần (Mô tả công việc, Yêu cầu ứng viên, Quyền lợi, Hồ sơ cần chuẩn bị) + Tiêu đề & Mức lương. Hãy bấm "Lưu bản nháp" ở thanh trên cùng để lưu.',
    );
  }

  return (
    <section
      className="rounded-xl border"
      style={{
        borderColor: 'var(--outline-variant)',
        backgroundColor: 'var(--color-surface)',
      }}
      data-testid="standard-brief-assistant"
    >
      <header
        className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
        style={{ borderColor: 'var(--outline-variant)' }}
      >
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
            Phiếu yêu cầu tuyển dụng dự án (Biểu mẫu chuẩn 4 phần BI – HRP)
          </h2>
          <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
            Nhập theo mẫu giao việc chuẩn 4 phần để tự động sinh Tiêu đề, Mức lương hiển thị và 4 mục nội dung đồng nhất với BI Feed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          disabled={disabled}
          className="rounded border px-3 py-1 text-xs font-medium"
          style={{
            borderColor: 'var(--color-primary)',
            backgroundColor: isOpen ? 'var(--surface-container-lowest)' : 'var(--color-primary-soft)',
            color: 'var(--color-primary-dark)',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          data-testid="toggle-standard-brief-button"
        >
          {isOpen ? 'Thu gọn biểu mẫu 4 phần' : 'Mở biểu mẫu chuẩn 4 phần'}
        </button>
      </header>

      {isOpen && (
        <div className="flex flex-col gap-5 p-4 text-xs">
          {/* PHẦN 1: THÔNG TIN CHUNG DỰ ÁN */}
          <div className="rounded-lg border p-3" style={{ borderColor: 'var(--outline-variant)' }}>
            <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
              1. Thông tin chung dự án
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InputField label="Tên dự án" value={projectName} onChange={setProjectName} placeholder="VD: Dự án Hwa Sung Vina" />
              <InputField label="Tên khách hàng (công ty/nhà máy) *" value={customerName} onChange={setCustomerName} placeholder="VD: Công ty TNHH Hwa Sung Vina" />
              <InputField label="Vốn đầu tư (Việt/Hàn/Trung/Nhật...)" value={investmentOrigin} onChange={setInvestmentOrigin} placeholder="VD: Hàn Quốc" />
              <InputField label="Ngành nghề sản xuất" value={manufacturingIndustry} onChange={setManufacturingIndustry} placeholder="VD: Sản xuất linh kiện điện tử" />
              <InputField label="Khu công nghiệp / địa chỉ nhà máy *" value={industrialParkName} onChange={setIndustrialParkName} placeholder="VD: KCN Cẩm Khê" />
              <InputField label="Tỉnh / Thành phố *" value={provinceName} onChange={setProvinceName} placeholder="VD: Phú Thọ" />
              <div className="sm:col-span-2">
                <InputField label="Công việc cụ thể *" value={jobDescription} onChange={setJobDescription} placeholder="VD: Lắp ráp, kiểm tra ngoại quan linh kiện điện tử" />
              </div>
              <InputField label="Số lượng dự kiến" value={expectedHeadcount} onChange={setExpectedHeadcount} placeholder="VD: 100" />
              <SelectField
                label="Thời gian / Ca làm việc"
                value={shiftPattern}
                onChange={(v) => setShiftPattern(v as RecruitmentShiftPattern)}
                options={RECRUITMENT_SHIFT_PATTERNS.map((k) => ({ value: k, label: SHIFT_PATTERN_LABELS[k] }))}
              />
              <InputField label="Chi tiết giờ ca" value={shiftDetails} onChange={setShiftDetails} placeholder="VD: Ca ngày 08:00 - 20:00, Ca đêm 20:00 - 08:00" />
              <InputField label="Lịch cấp nhân sự" value={supplyScheduleText} onChange={setSupplyScheduleText} placeholder="VD: Phỏng vấn hằng ngày từ T2 - T7" />
            </div>

            <div className="mt-3 flex flex-wrap gap-6">
              <div>
                <span className="font-medium" style={{ color: 'var(--on-surface-variant)' }}>Môi trường: </span>
                {RECRUITMENT_ENVIRONMENT_TYPES.map((env) => (
                  <label key={env} className="ml-3 inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={environmentTypes.includes(env)}
                      onChange={() => toggleEnv(env)}
                    />
                    <span>{ENVIRONMENT_TYPE_LABELS[env]}</span>
                  </label>
                ))}
              </div>
              <div>
                <span className="font-medium" style={{ color: 'var(--on-surface-variant)' }}>Tư thế: </span>
                {RECRUITMENT_WORK_POSTURES.map((pos) => (
                  <label key={pos} className="ml-3 inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={workPostures.includes(pos)}
                      onChange={() => togglePosture(pos)}
                    />
                    <span>{WORK_POSTURE_LABELS[pos]}</span>
                  </label>
                ))}
              </div>
              <div>
                <span className="font-medium" style={{ color: 'var(--on-surface-variant)' }}>Hình thức tuyển dụng: </span>
                <label className="ml-3 inline-flex items-center gap-1">
                  <input type="checkbox" checked={isPermanent} onChange={(e) => setIsPermanent(e.target.checked)} />
                  <span>Chính thức</span>
                </label>
                <label className="ml-3 inline-flex items-center gap-1">
                  <input type="checkbox" checked={isTemporary} onChange={(e) => setIsTemporary(e.target.checked)} />
                  <span>Thời vụ</span>
                </label>
              </div>
            </div>
          </div>

          {/* PHẦN 2: YÊU CẦU ỨNG VIÊN */}
          <div className="rounded-lg border p-3" style={{ borderColor: 'var(--outline-variant)' }}>
            <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
              2. Yêu cầu ứng viên
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InputField label="Độ tuổi từ" value={ageMin} onChange={setAgeMin} placeholder="18" />
              <InputField label="Độ tuổi đến" value={ageMax} onChange={setAgeMax} placeholder="42" />
              <SelectField
                label="Giới tính"
                value={genderRequirement}
                onChange={(v) => setGenderRequirement(v as RecruitmentGenderRequirement)}
                options={RECRUITMENT_GENDER_REQUIREMENTS.map((k) => ({ value: k, label: GENDER_REQUIREMENT_LABELS[k] }))}
              />
              <SelectField
                label="Trình độ học vấn tối thiểu"
                value={educationRequirement}
                onChange={(v) => setEducationRequirement(v as RecruitmentEducationRequirement)}
                options={RECRUITMENT_EDUCATION_REQUIREMENTS.map((k) => ({ value: k, label: EDUCATION_REQUIREMENT_LABELS[k] }))}
              />
              <InputField label="Chi tiết kinh nghiệm (nếu có)" value={experienceDetails} onChange={setExperienceDetails} placeholder="VD: Không yêu cầu kinh nghiệm" />
              <InputField label="Hình thức kiểm tra đầu vào" value={entryAssessmentText} onChange={setEntryAssessmentText} placeholder="VD: Phỏng vấn, test bảng chữ cái, test mắt màu" />
              <div className="sm:col-span-2">
                <InputField label="Yêu cầu khác" value={otherRequirementsText} onChange={setOtherRequirementsText} placeholder="VD: Nhanh nhẹn, chịu khó, có sức khỏe tốt" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-6">
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={experienceRequired} onChange={(e) => setExperienceRequired(e.target.checked)} />
                <span>Yêu cầu có kinh nghiệm</span>
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={acceptFormerWorkers} onChange={(e) => setAcceptFormerWorkers(e.target.checked)} />
                <span>Có nhận lao động đã từng làm tại công ty khách hàng</span>
              </label>
            </div>
          </div>

          {/* PHẦN 3: CHẾ ĐỘ LƯƠNG, THƯỞNG, PHÚC LỢI */}
          <div className="rounded-lg border p-3" style={{ borderColor: 'var(--outline-variant)' }}>
            <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
              3. Chế độ lương, thưởng, phúc lợi
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InputField label="Thu nhập BQ tối thiểu (VNĐ/tháng)" value={avgIncomeMinVnd} onChange={setAvgIncomeMinVnd} placeholder="VD: 9000000" />
              <InputField label="Thu nhập BQ tối đa (VNĐ/tháng)" value={avgIncomeMaxVnd} onChange={setAvgIncomeMaxVnd} placeholder="VD: 12000000" />
              <InputField label="Lương cơ bản (VNĐ)" value={baseSalaryVnd} onChange={setBaseSalaryVnd} placeholder="VD: 5000000" />
              <InputField label="Điều kiện Lương cơ bản" value={baseSalaryConditions} onChange={setBaseSalaryConditions} placeholder="VD: 26 ngày công chuẩn" />
              <InputField label="Thưởng chuyên cần (VNĐ)" value={attendanceBonusVnd} onChange={setAttendanceBonusVnd} placeholder="VD: 500000" />
              <InputField label="Điều kiện chuyên cần" value={attendanceBonusConditions} onChange={setAttendanceBonusConditions} placeholder="VD: Đủ 26 công" />
              <InputField label="Phụ cấp Đời sống (VNĐ)" value={livingAllowanceVnd} onChange={setLivingAllowanceVnd} placeholder="VD: 500000" />
              <InputField label="Điều kiện PC Đời sống" value={livingAllowanceConditions} onChange={setLivingAllowanceConditions} placeholder="VD: Tính theo ngày công" />
              <InputField label="Phụ cấp Thâm niên (VNĐ)" value={seniorityAllowanceVnd} onChange={setSeniorityAllowanceVnd} placeholder="VD: 300000" />
              <InputField label="Điều kiện PC Thâm niên" value={seniorityAllowanceConditions} onChange={setSeniorityAllowanceConditions} placeholder="VD: Từ tháng thứ 2" />
              <InputField label="Phụ cấp Soi kính (VNĐ)" value={eyesightAllowanceVnd} onChange={setEyesightAllowanceVnd} placeholder="VD: 400000" />
              <InputField label="Điều kiện PC Soi kính" value={eyesightAllowanceConditions} onChange={setEyesightAllowanceConditions} placeholder="VD: Bộ phận kính hiển vi" />
              <InputField label="Phụ cấp khác" value={otherAllowanceText} onChange={setOtherAllowanceText} placeholder="VD: Phụ cấp xăng xe, nhà ở..." />
              <InputField label="Ngày thanh toán lương" value={salaryPaymentSchedule} onChange={setSalaryPaymentSchedule} placeholder="VD: Ngày 10 - 15 hàng tháng" />
              <InputField label="Mức ứng lương (VNĐ)" value={salaryAdvanceAmountVnd} onChange={setSalaryAdvanceAmountVnd} placeholder="VD: 2000000" />
              <InputField label="Lịch ứng lương" value={salaryAdvanceSchedule} onChange={setSalaryAdvanceSchedule} placeholder="VD: Ứng sau 7 ngày công" />
              <InputField label="Ngày thanh toán lương Tuần" value={weeklySalarySchedule} onChange={setWeeklySalarySchedule} placeholder="VD: Thứ 6 hàng tuần" />
              <InputField label="Chi tiết đồng phục / BHLĐ" value={ppeDetails} onChange={setPpeDetails} placeholder="VD: Quần áo phòng sạch, giày tĩnh điện" />
              <div className="sm:col-span-2">
                <InputField label="Phúc lợi khác" value={otherBenefits} onChange={setOtherBenefits} placeholder="VD: Bao cơm ca tại nhà máy, đóng BHXH đầy đủ" />
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InputField label="Đơn giá Ca ngày 8h (VNĐ)" value={dayShift8hVnd} onChange={setDayShift8hVnd} placeholder="VD: 240000" />
              <InputField label="Đơn giá Ca ngày 11h (VNĐ)" value={dayShift11hVnd} onChange={setDayShift11hVnd} placeholder="VD: 350000" />
              <InputField label="Đơn giá Ca đêm 8h (VNĐ)" value={nightShift8hVnd} onChange={setNightShift8hVnd} placeholder="VD: 280000" />
              <InputField label="Đơn giá Ca đêm 11h (VNĐ)" value={nightShift11hVnd} onChange={setNightShift11hVnd} placeholder="VD: 400000" />
              <InputField label="Chủ nhật ngày 11h (VNĐ)" value={sundayDay11hVnd} onChange={setSundayDay11hVnd} placeholder="VD: 500000" />
              <InputField label="Chủ nhật đêm 11h (VNĐ)" value={sundayNight11hVnd} onChange={setSundayNight11hVnd} placeholder="VD: 550000" />
              <InputField label="Lễ ngày 11h (VNĐ)" value={holidayDay11hVnd} onChange={setHolidayDay11hVnd} placeholder="VD: 700000" />
              <InputField label="Lễ đêm 11h (VNĐ)" value={holidayNight11hVnd} onChange={setHolidayNight11hVnd} placeholder="VD: 800000" />
            </div>

            <div className="mt-3 flex flex-wrap gap-6">
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={salaryAdvanceAvailable} onChange={(e) => setSalaryAdvanceAvailable(e.target.checked)} />
                <span>Có hỗ trợ ứng lương</span>
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={weeklySalaryAvailable} onChange={(e) => setWeeklySalaryAvailable(e.target.checked)} />
                <span>Có trả lương tuần</span>
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={ppeProvided} onChange={(e) => setPpeProvided(e.target.checked)} />
                <span>Cấp phát đồng phục, bảo hộ lao động</span>
              </label>
            </div>
          </div>

          {/* PHẦN 4: HỒ SƠ ỨNG VIÊN CẦN CHUẨN BỊ */}
          <div className="rounded-lg border p-3" style={{ borderColor: 'var(--outline-variant)' }}>
            <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>
              4. Hồ sơ ứng viên cần chuẩn bị
            </h3>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={reqCccd} onChange={(e) => setReqCccd(e.target.checked)} />
                <span>CCCD (bản gốc + photo)</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={reqResume} onChange={(e) => setReqResume(e.target.checked)} />
                <span>Sơ yếu lý lịch có xác nhận</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={reqHealthCert} onChange={(e) => setReqHealthCert(e.target.checked)} />
                <span>Giấy khám sức khỏe (trong vòng 6 tháng)</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={reqPhoto} onChange={(e) => setReqPhoto(e.target.checked)} />
                <span>Ảnh 3x4</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={reqDegree} onChange={(e) => setReqDegree(e.target.checked)} />
                <span>Bằng cấp / chứng chỉ (nếu có)</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={reqBhxh} onChange={(e) => setReqBhxh(e.target.checked)} />
                <span>Sổ BHXH (nếu có)</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={reqOtherDocs} onChange={(e) => setReqOtherDocs(e.target.checked)} />
                <span>Giấy tờ khác</span>
              </label>
              {reqOtherDocs && (
                <div className="sm:col-span-2">
                  <InputField label="Chi tiết giấy tờ khác" value={otherDocsText} onChange={setOtherDocsText} placeholder="VD: Xác nhận nhân sự..." />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleApplyToEditor}
              disabled={disabled}
              className="rounded border px-4 py-2 text-sm font-semibold"
              style={{
                borderColor: 'var(--color-primary)',
                backgroundColor: 'var(--color-primary-soft)',
                color: 'var(--color-primary-dark)',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
              data-testid="apply-standard-brief-button"
            >
              Áp dụng vào 4 phần nội dung tin đăng
            </button>

            {formNotice && (
              <span className="text-xs font-medium" style={{ color: 'var(--color-primary-dark)' }}>
                {formNotice}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-medium" style={{ color: 'var(--on-surface-variant)' }}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border px-2 py-1 text-xs"
        style={{
          borderColor: 'var(--outline)',
          backgroundColor: 'var(--surface-container-lowest)',
          color: 'var(--on-surface)',
        }}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-medium" style={{ color: 'var(--on-surface-variant)' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border px-2 py-1 text-xs"
        style={{
          borderColor: 'var(--outline)',
          backgroundColor: 'var(--surface-container-lowest)',
          color: 'var(--on-surface)',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
