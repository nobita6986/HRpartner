/**
 * detail-sections.fixture.ts — UI04d D.A demo fixtures
 *
 * Plan D.A (Tier 0): Section renderer + demo content có cấu trúc.
 * Tất cả sections của `/viec-lam/[slug]` chưa có backend thật (AV2/AV4)
 * dùng demo fixtures này.
 *
 * Sections:
 *  - introductionContent, compensationContent, supportContent (DEMO)
 *  - applyInstructionsContent (DEMO)
 *  - footerBannerContent (DEMO)
 *
 * Sections integration-pending (render skeleton) không cần fixture.
 * Sections real dùng trực tiếp `PublicJobDetailDto`.
 */
import type {
  ContentSectionContent,
  SalarySectionContent,
  SupportSectionContent,
  FooterBannerContent,
} from '../public-types';

export const demoIntroductionContent: ContentSectionContent = {
  id: 'intro',
  enabled: true,
  order: 30,
  source: 'DEMO',
  title: 'Giới thiệu công việc',
  blocks: [
    {
      type: 'paragraph',
      text: 'Vị trí làm việc tại nhà máy sản xuất với môi trường sạch sẽ, an toàn. Công việc phù hợp cho người có tinh thần trách nhiệm, chịu được áp lực nhịp độ sản xuất.',
    },
    {
      type: 'heading',
      level: 3,
      text: 'Mô tả công việc',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        'Thao tác trên dây chuyền sản xuất theo quy trình công ty',
        'Kiểm tra chất lượng sản phẩm theo tiêu chuẩn',
        'Vệ sinh máy móc, dụng cụ sau ca làm việc',
        'Báo cáo tình hình sản xuất cho tổ trưởng',
      ],
    },
    {
      type: 'callout',
      variant: 'info',
      text: 'Công ty hỗ trợ đào tạo tay nghề trong 1 tuần đầu cho người chưa có kinh nghiệm.',
    },
  ],
};

export const demoRequirementsContent: ContentSectionContent = {
  id: 'requirements',
  enabled: true,
  order: 70,
  source: 'DEMO',
  title: 'Yêu cầu và lưu ý',
  blocks: [
    {
      type: 'heading',
      level: 3,
      text: 'Hồ sơ cần chuẩn bị',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        'CMND/CCCD bản photo',
        'Sơ yếu lý lịch có xác nhận của địa phương',
        'Giấy khám sức khỏe (nếu có)',
      ],
    },
    {
      type: 'heading',
      level: 3,
      text: 'Yêu cầu khác',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        'Sức khỏe tốt, không bệnh truyền nhiễm',
        'Chịu được làm thêm giờ theo yêu cầu sản xuất',
        'Tinh thần trách nhiệm cao',
      ],
    },
  ],
};

export const demoCompensationContent: SalarySectionContent = {
  id: 'salary',
  enabled: true,
  order: 40,
  source: 'DEMO',
  salaryType: 'BASIC',
  salaryDetail: [
    {
      type: 'paragraph',
      text: 'Mức lương cơ bản được tính theo giờ công thực tế. Thưởng thêm theo năng suất và chuyên cần.',
    },
  ],
  bonusItems: [
    {
      icon: 'military_tech',
      title: 'Thưởng chuyên cần',
      description: 'Thưởng hàng tháng khi không nghỉ phép',
      value: '300.000 đ/tháng',
    },
    {
      icon: 'schedule',
      title: 'Tăng ca',
      description: 'Hệ số 1.5x cho ngày thường, 2x cho ngày lễ',
      value: 'Theo giờ',
    },
    {
      icon: 'workspace_premium',
      title: 'Thưởng tháng 13',
      description: 'Thưởng cuối năm theo kết quả kinh doanh',
      value: null,
    },
  ],
  benefitItems: [
    {
      icon: 'restaurant',
      title: 'Bữa ăn ca',
      description: 'Công ty hỗ trợ 1 bữa chính và 1 bữa phụ',
      value: 'Miễn phí',
    },
    {
      icon: 'directions_bus',
      title: 'Xe đưa đón',
      description: 'Một số tuyến cố định theo ca',
      value: null,
    },
    {
      icon: 'home',
      title: 'Nhà ở tập thể',
      description: 'Ký túc xá miễn phí cho lao động xa nhà',
      value: 'Miễn phí',
    },
    {
      icon: 'health_and_safety',
      title: 'Bảo hiểm xã hội',
      description: 'Đóng BHXH, BHYT, BHTN đầy đủ theo luật',
      value: 'Theo quy định',
    },
  ],
};

export const demoSupportContent: SupportSectionContent = {
  id: 'support',
  enabled: true,
  order: 50,
  source: 'DEMO',
  items: [
    {
      icon: 'user-check',
      label: 'Tư vấn hồ sơ',
      description: 'Đội ngũ HR đồng hành xuyên suốt quá trình ứng tuyển',
      available: true,
    },
    {
      icon: 'directions_bus',
      label: 'Hỗ trợ đi lại',
      description: 'Hỗ trợ chi phí di chuyển theo chính sách công ty',
      available: true,
    },
    {
      icon: 'home',
      label: 'Giới thiệu nhà trọ',
      description: 'Danh sách nhà trọ gần nhà máy, giá hợp lý',
      available: true,
    },
    {
      icon: 'medical_services',
      label: 'Khám sức khỏe miễn phí',
      description: 'Hỗ trợ khám sức khỏe trước khi nhận việc',
      available: false,
    },
  ],
};

export const demoApplyInstructionsContent: ContentSectionContent = {
  id: 'apply-instructions',
  enabled: true,
  order: 90,
  source: 'DEMO',
  title: 'Hướng dẫn ứng tuyển',
  blocks: [
    {
      type: 'paragraph',
      text: 'Ứng viên gửi hồ sơ trực tiếp qua trang hoặc liên hệ hotline để được hướng dẫn chi tiết.',
    },
    {
      type: 'list',
      ordered: true,
      items: [
        'Nhấn nút "Ứng tuyển" bên dưới',
        'Điền thông tin cá nhân và kinh nghiệm làm việc',
        'Nhận xác nhận qua SMS/Zalo trong 24 giờ',
        'HRP sẽ liên hệ sắp xếp phỏng vấn trong tuần',
      ],
    },
    {
      type: 'callout',
      variant: 'info',
      text: 'Hồ sơ được bảo mật. HRP không chia sẻ thông tin cá nhân với bên thứ ba.',
    },
  ],
};

export const demoFooterBannerContent: FooterBannerContent = {
  id: 'footer-banner',
  enabled: true,
  order: 110,
  source: 'DEMO',
  ctaLabel: 'Xem thêm việc làm khác',
  ctaHref: '/viec-lam',
  imageUrl: '/images/hero/dong-goi-ha-noi.jpg',
};
