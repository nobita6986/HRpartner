/**
 * 5 fixture article cho Section 4 (Tin tức & cẩm nang).
 *
 * Content dạng structured content array (paragraph | heading | list) — render
 * trực tiếp bằng React elements trong NewsPreviewModal. KHÔNG HTML string,
 * KHÔNG dangerouslySetInnerHTML, KHÔNG SafeHtml.
 *
 * Title/excerpt/category/body dạng cẩm nang mẫu CHUNG CHUNG, không claim
 * số liệu cụ thể của HRP.
 *
 * v1.11 (11/09/2026): thêm 2 article #4, #5 để điền vào slot 2×2 bên phải
 * News section (khoanh đỏ trống). Ảnh dùng từ hero/ (đã có sẵn, không
 * sinh ảnh mới): #4 = dong-goi-ha-noi.jpg, #5 = cong-nhan-may-moc.jpg.
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
  {
    id: 'meo-thich-ung-moi-truong',
    title: 'Mẹo thích ứng nhanh khi mới vào nhà máy',
    excerpt:
      'Những tuần đầu tiên tại nhà máy thường có nhiều bỡ ngỡ. Bài viết chia sẻ các mẹo giúp người mới nhanh chóng hòa nhịp với môi trường làm việc.',
    category: 'Cẩm nang',
    publishedAt: '2026-07-20',
    imageUrl: '/images/hero/dong-goi-ha-noi.jpg',
    body: [
      {
        type: 'paragraph',
        content:
          'Vào một nhà máy mới, mọi thứ đều lạ — từ tiếng máy, quy trình, đến cách giao tiếp với tổ trưởng. Nếu chuẩn bị tâm lý và quan sát tốt, bạn sẽ nhanh chóng ổn định và làm chủ công việc.',
      },
      {
        type: 'heading',
        content: 'Quan sát và học hỏi trong tuần đầu',
      },
      {
        type: 'list',
        content: [
          'Chú ý cách các công nhân lâu năm xử lý tình huống',
          'Ghi chú lại các quy trình quan trọng của dây chuyền',
          'Không ngại hỏi khi chưa rõ — hỏi đúng lúc giúp tránh sai sót',
        ],
      },
      {
        type: 'heading',
        content: 'Giữ gìn sức khỏe và tinh thần',
      },
      {
        type: 'paragraph',
        content:
          'Ăn đủ bữa, ngủ đủ giấc, và dành thời gian nghỉ ngơi hợp lý. Sức khỏe tốt là nền tảng để bạn theo kịp tiến độ và duy trì công việc lâu dài.',
      },
    ],
  },
  {
    id: 'cach-doc-bang-luong',
    title: 'Cách đọc bảng lương và các khoản trừ hàng tháng',
    excerpt:
      'Bảng lương nhà máy thường có nhiều mục — lương cơ bản, phụ cấp, bảo hiểm, thuế. Bài viết giúp bạn hiểu rõ từng khoản để không bị bất ngờ khi nhận lương.',
    category: 'Quyền lợi',
    publishedAt: '2026-07-05',
    imageUrl: '/images/hero/cong-nhan-may-moc.jpg',
    body: [
      {
        type: 'paragraph',
        content:
          'Bảng lương không chỉ là một con số cuối cùng — nó phản ánh cơ cấu thu nhập và các nghĩa vụ đóng góp của người lao động. Hiểu rõ bảng lương giúp bạn kiểm tra tính chính xác và lên kế hoạch chi tiêu hợp lý.',
      },
      {
        type: 'heading',
        content: 'Các khoản thu nhập phổ biến',
      },
      {
        type: 'list',
        content: [
          'Lương cơ bản theo hợp đồng',
          'Phụ cấp (ăn ca, xăng xe, nhà ở, độc hại…)',
          'Lương làm thêm giờ, làm ca đêm, chủ nhật',
          'Thưởng tháng/quý/theo sản phẩm (nếu có)',
        ],
      },
      {
        type: 'heading',
        content: 'Các khoản khấu trừ',
      },
      {
        type: 'paragraph',
        content:
          'Bảo hiểm xã hội, bảo hiểm y tế, bảo hiểm thất nghiệp và thuế thu nhập cá nhân (nếu có) là các khoản trừ bắt buộc theo quy định. Tỷ lệ đóng góp được tính trên lương cơ sở hoặc lương đóng bảo hiểm, không phải trên tổng thu nhập.',
      },
    ],
  },
];
