/**
 * Demo content cho 2 section DEMO của UI04d v1.9.
 *
 * v1.9 (11/09/2026): Bỏ PartnerStrip + MobileBanner (Owner visual review trên
 * production thấy thừa). Chỉ còn 2 view-model: `demoHrpIntro` (Về HRP) +
 * `demoNewsSection` (Tin tức & Cẩm nang).
 *
 * View-model DEMO đặt trước khi AV6 Homepage CMS triển khai. Mỗi view-model
 * có `enabled: true`, `order: <index>`, `source: 'DEMO'` để renderer
 * chính sách biết cách render.
 *
 * Nội dung KHÔNG hiển thị chữ "demo" / "CMS pending" (theo Tier 0 directive).
 */

import type {
  HrpIntroContent,
  NewsSectionContent,
} from '../public-types';
import { articlePreviewData } from '../components/landing/article-preview-data';

export const demoHrpIntro: HrpIntroContent = {
  id: 'hrp-intro',
  enabled: true,
  order: 0,
  source: 'DEMO',
  title: 'Về HRP',
  imageUrl: '/images/homepage-huongb/industrial-location-04.webp',
  imageAlt: 'Khu công nghiệp — môi trường làm việc tại các đối tác của HRP',
  paragraphs: [
    'HRP kết nối lao động với nhà máy và doanh nghiệp sản xuất tại Việt Nam — đồng hành từ tìm việc, chuẩn bị hồ sơ, đến khi bắt đầu công việc.',
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
      title: 'Bốc xếp và đóng gói',
      body: 'Cung cấp đội ngũ bốc xếp, đóng gói hàng hóa cho các kho bãi và dây chuyền xuất hàng.',
      iconName: 'truck',
    },
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
