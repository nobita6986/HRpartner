/**
 * 3 fixture article cho Section 4 (Tin tức & cẩm nang).
 *
 * Content dạng structured content array (paragraph | heading | list) — render
 * trực tiếp bằng React elements trong NewsPreviewModal. KHÔNG HTML string,
 * KHÔNG dangerouslySetInnerHTML, KHÔNG SafeHtml.
 *
 * Title/excerpt/category/body dạng cẩm nang mẫu CHUNG CHUNG, không claim
 * số liệu cụ thể của HRP.
 */

import type { ArticleCardExtended } from '../../public-types';

export const articlePreviewData: ArticleCardExtended[] = [
  {
    id: 'cam-nang-phong-van',
    title: 'Cẩm nang chuẩn bị phỏng vấn nhà máy cho người mới',
    excerpt:
      'Tổng hợp những điều nên chuẩn bị trước khi đến buổi phỏng vấn tại nhà máy — từ giấy tờ, trang phục đến cách trả lời các câu hỏi phổ biến.',
    category: 'Cẩm nang',
    publishedAt: '2026-09-01',
    imageUrl: '/images/homepage-huongb/industrial-location-01.webp',
    body: [
      {
        type: 'paragraph',
        content:
          'Buổi phỏng vấn tại nhà máy thường khác so với phỏng vấn văn phòng — không gian mở, tiếng máy móc, và yêu cầu thực tế rõ ràng. Người tìm việc chuẩn bị tốt sẽ tự tin hơn và có cơ hội được chọn vào các vị trí ổn định lâu dài.',
      },
      {
        type: 'heading',
        content: 'Giấy tờ cần mang theo',
      },
      {
        type: 'list',
        content: [
          'CMND/CCCD bản gốc và 1 bản photo',
          'Sổ hộ khẩu hoặc giấy xác nhận tạm trú',
          'Sơ yếu lý lịch có xác nhận địa phương',
          'Các chứng chỉ nghề (nếu có) liên quan đến vị trí ứng tuyển',
        ],
      },
      {
        type: 'heading',
        content: 'Trang phục và tác phong',
      },
      {
        type: 'paragraph',
        content:
          'Nên chọn trang phục đơn giản, gọn gàng, không cần quá trang trọng nhưng phải sạch sẽ. Tránh đeo trang sức quá nhiều và mang giày thấp, dễ đi lại.',
      },
      {
        type: 'paragraph',
        content:
          'Đến sớm 10–15 phút là một lợi thế: bạn có thời gian quan sát môi trường làm việc, đội ngũ nhân sự, và cho thấy sự tôn trọng với nhà tuyển dụng.',
      },
    ],
  },
  {
    id: 'ky-nang-lam-viec-ca',
    title: 'Kỹ năng cần thiết khi làm việc theo ca',
    excerpt:
      'Làm ca đêm, ca xoay đòi hỏi kỹ năng quản lý giấc ngủ, sức khỏe và tinh thần. Bài viết chia sẻ kinh nghiệm giúp bạn duy trì năng suất lâu dài.',
    category: 'Kỹ năng',
    publishedAt: '2026-08-20',
    imageUrl: '/images/homepage-huongb/industrial-location-02.webp',
    body: [
      {
        type: 'paragraph',
        content:
          'Làm việc theo ca là lựa chọn phổ biến với nhiều lao động tại nhà máy. Nếu biết cách điều chỉnh giấc ngủ và ăn uống, bạn có thể duy trì sức khỏe và làm việc ổn định trong thời gian dài.',
      },
      {
        type: 'heading',
        content: 'Quản lý giấc ngủ',
      },
      {
        type: 'list',
        content: [
          'Duy trì giờ ngủ cố định, kể cả ngày nghỉ',
          'Hạn chế ánh sáng xanh từ điện thoại trước khi ngủ',
          'Dùng rèm cản sáng để ngủ sâu hơn vào ban ngày (sau ca đêm)',
        ],
      },
      {
        type: 'heading',
        content: 'Chế độ ăn uống',
      },
      {
        type: 'paragraph',
        content:
          'Trước ca làm việc nên ăn nhẹ, đủ tinh bột và đạm. Trong ca có thể bổ sung nước, trái cây, và snack lành mạnh. Tránh ăn quá no ngay trước khi vào ca để không buồn ngủ.',
      },
    ],
  },
  {
    id: 'quyen-loi-lao-dong',
    title: 'Những quyền lợi người lao động cần biết khi làm việc tại nhà máy',
    excerpt:
      'Hợp đồng lao động, bảo hiểm xã hội, chế độ nghỉ phép — tóm tắt các quyền cơ bản mà người lao động tại nhà máy nên nắm rõ.',
    category: 'Quyền lợi',
    publishedAt: '2026-08-05',
    imageUrl: '/images/homepage-huongb/industrial-location-03.webp',
    body: [
      {
        type: 'paragraph',
        content:
          'Khi làm việc tại nhà máy, người lao động có nhiều quyền lợi được pháp luật bảo vệ. Nắm rõ những quyền này giúp bạn làm việc tự tin và tránh những rủi ro không đáng có.',
      },
      {
        type: 'heading',
        content: 'Hợp đồng lao động',
      },
      {
        type: 'paragraph',
        content:
          'Mọi quan hệ lao động nên có hợp đồng bằng văn bản, ghi rõ mức lương, thời giờ làm việc, và các điều khoản phúc lợi. Hợp đồng là căn cứ pháp lý khi phát sinh tranh chấp.',
      },
      {
        type: 'heading',
        content: 'Bảo hiểm xã hội và y tế',
      },
      {
        type: 'list',
        content: [
          'Người lao động có hợp đồng từ 1 tháng trở lên phải tham gia BHXH',
          'Được khám chữa bệnh tại các cơ sở y tế theo tuyến',
          'Được hưởng chế độ ốm đau, thai sản, tai nạn lao động theo quy định',
        ],
      },
      {
        type: 'heading',
        content: 'Chế độ nghỉ phép',
      },
      {
        type: 'paragraph',
        content:
          'Theo Bộ luật Lao động, người lao động được nghỉ phép năm theo thâm niên, nghỉ lễ Tết và các trường hợp đặc biệt (hiếu, hỷ, ốm đau). Mức hưởng chi tiết do pháp luật và nội quy nhà máy quy định.',
      },
    ],
  },
];
