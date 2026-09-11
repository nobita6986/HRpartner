/**
 * Demo content cho 4 section DEMO (Sections 2..5) của UI04d.
 *
 * View-model DEMO đặt trước khi AV6 Homepage CMS triển khai. Mỗi view-model
 * có `enabled: true`, `order: <index>`, `source: 'DEMO'` để renderer
 * chính sách biết cách render.
 *
 * Nội dung KHÔNG hiển thị chữ "demo" / "CMS pending" (theo Tier 0 directive
 * §4 Section 2). Nội dung dùng 4 dịch vụ lấy từ 5 dịch vụ HRP (carousel hero
 * RecruitmentHighlight đã chốt).
 */

import type {
  HrpIntroContent,
  MobileBannerContentExtended,
  NewsSectionContent,
  PartnerStripContent,
} from '../public-types';
import { articlePreviewData } from '../components/landing/article-preview-data';

export const demoHrpIntro: HrpIntroContent = {
  id: 'hrp-intro',
  enabled: true,
  order: 1,
  source: 'DEMO',
  title: 'Về HRP',
  imageUrl: '/images/homepage-huongb/referral-team.webp',
  imageAlt: 'Đội ngũ nhân viên HRP tư vấn cho người tìm việc',
  paragraphs: [
    'HRP là đơn vị chuyên kết nối lao động với các nhà máy và doanh nghiệp sản xuất tại Việt Nam. Chúng tôi đồng hành cùng người lao động từ khâu tìm việc, chuẩn bị hồ sơ, đến khi bắt đầu công việc tại nhà máy.',
    'Mạng lưới đối tác của HRP trải rộng từ các khu công nghiệp lớn tại Bắc Ninh, Bắc Giang, Hải Phòng, đến các nhà máy tại TP. Hồ Chí Minh, Bình Dương, Đồng Nai — giúp người tìm việc tiếp cận nhiều cơ hội phù hợp với năng lực và điều kiện cá nhân.',
  ],
  values: [
    {
      title: 'Cung ứng lao động thời vụ',
      body: 'Hỗ trợ nhà máy tuyển lao động thời vụ ngắn hạn và dài hạn theo đúng nhu cầu sản xuất.',
      iconName: 'package',
    },
    {
      title: 'Gia công linh kiện điện tử',
      body: 'Cung cấp nhân lực cho các dây chuyền gia công, kiểm tra và phân loại linh kiện điện tử.',
      iconName: 'briefcase',
    },
    {
      title: 'Giới thiệu việc làm',
      body: 'Kết nối người tìm việc với các vị trí phù hợp tại nhà máy, hỗ trợ cả ứng viên và nhà tuyển dụng.',
      iconName: 'users',
    },
    {
      title: 'Bốc xếp và đóng gói',
      body: 'Cung cấp đội ngũ bốc xếp, đóng gói hàng hóa cho các kho bãi và dây chuyền xuất hàng.',
      iconName: 'truck',
    },
  ],
};

export const demoPartnerStrip: PartnerStripContent = {
  id: 'partner-strip',
  enabled: true,
  order: 2,
  source: 'DEMO',
  title: 'Đối tác của chúng tôi',
  partners: [
    { monogram: 'HRP', label: 'HRP Việt Nam' },
    { monogram: 'YP', label: 'Yên Phong' },
    { monogram: 'KT', label: 'Khổng Tiên' },
    { monogram: 'TS', label: 'Từ Sơn' },
    { monogram: 'QN', label: 'Quế Võ' },
  ],
};

export const demoNewsSection: NewsSectionContent = {
  id: 'news-section',
  enabled: true,
  order: 3,
  source: 'DEMO',
  title: 'Tin tức & Cẩm nang',
  featured: articlePreviewData[0],
  others: [articlePreviewData[1], articlePreviewData[2]],
};

export const demoMobileBanner: MobileBannerContentExtended = {
  id: 'mobile-banner',
  enabled: true,
  order: 4,
  source: 'DEMO',
  title: 'Trải nghiệm HRP trên di động',
  body: 'Tìm việc làm nhà máy mọi lúc, mọi nơi với giao diện thân thiện trên điện thoại. Xem việc, ứng tuyển nhanh, và nhận thông báo khi có cơ hội mới.',
  imageUrl: '/images/hero/may-sai-gon.jpg',
  imageAlt: 'Công nhân may tại xưởng sản xuất',
  ctaText: 'Khám phá việc làm',
  ctaHref: '/viec-lam',
};
