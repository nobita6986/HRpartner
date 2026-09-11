-- Y10.8+ / HRP job board demo seed
-- Seed 10 project mới đa dạng khu vực + dự án cho job board homepage
-- - 5 URGENT (CLOSING_SOON + deadlineDate < +7 ngày) + 5 thường (OPEN + deadlineDate +30 ngày)
-- - Lương hourly_rate_vnd ~22k-45k VND/giờ (lương giờ công nhân Việt Nam)
-- - Title KHÔNG có prefix "Tuyển" (UI đã strip tự động, nhưng data cũng đã sẵn sàng)
--
-- Chạy trên STAGING DB:
--   psql "$DATABASE_URL" -f prisma/seed-extra-jobs.sql
--
-- IDEMPOTENT: dùng fixed UUID + ON CONFLICT (id) DO NOTHING.
-- Xóa seed: DELETE FROM projects WHERE code LIKE 'EXTRA-2026-%';

BEGIN;

-- ─── Clients mới (3 công ty đa vùng) ─────────────────────────────────────
INSERT INTO client_companies (id, code, name, tax_code, industry, status, created_at)
VALUES
  ('seed-client-extra-hn-01',    'CC-EXTRA-HN',    'Khách hàng mẫu Hà Nội',      '08****011', 'Điện tử',         'ACTIVE', NOW()),
  ('seed-client-extra-hcm-01',   'CC-EXTRA-HCM',   'Khách hàng mẫu TP.HCM',       '08****012', 'Dệt may',          'ACTIVE', NOW()),
  ('seed-client-extra-bd-01',    'CC-EXTRA-BD',    'Khách hàng mẫu Bình Dương',   '08****013', 'Công nghiệp nhẹ',  'ACTIVE', NOW())
ON CONFLICT (id) DO NOTHING;

-- ─── 10 Projects ─────────────────────────────────────────────────────────
-- Cấu trúc: code = 'EXTRA-2026-NNN', name = chức danh (đã strip Tuyển),
-- siteAddress = "KCN ..., Tỉnh", quota/filled cho phù hợp
INSERT INTO projects (id, code, client_company_id, name, quota, filled, is_public, site_address, client_company_name, start_date, status, version, created_at)
VALUES
  -- 1. Hà Nội · Điện tử · URGENT
  ('seed-proj-EXTRA-2026-001', 'EXTRA-2026-001', 'seed-client-extra-hn-01',
   'Nhân viên lắp ráp linh kiện điện tử Thăng Long', 30, 18, true,
   'KCN Thăng Long, Hà Nội', 'Công ty CP Điện tử Thăng Long',
   '2026-01-01', 'ACTIVE', 1, NOW()),
  -- 2. Bắc Ninh · Điện tử · thường
  ('seed-proj-EXTRA-2026-002', 'EXTRA-2026-002', 'seed-client-hrp-demo-1',
   'Công nhân đóng gói sản phẩm Yên Phong 2', 40, 32, true,
   'KCN Yên Phong, Bắc Ninh', 'Công ty TNHH Điện tử An Phát',
   '2026-01-01', 'ACTIVE', 1, NOW()),
  -- 3. TP.HCM · Dệt may · URGENT
  ('seed-proj-EXTRA-2026-003', 'EXTRA-2026-003', 'seed-client-extra-hcm-01',
   'Công nhân may công nghiệp Tân Bình', 60, 41, true,
   'KCN Tân Bình, TP. Hồ Chí Minh', 'Công ty CP Dệt may Việt Nam',
   '2026-01-01', 'ACTIVE', 1, NOW()),
  -- 4. Bình Dương · Cơ khí · thường
  ('seed-proj-EXTRA-2026-004', 'EXTRA-2026-004', 'seed-client-extra-bd-01',
   'Thợ hàn cơ khí Bình Dương VSIP II', 20, 12, true,
   'KCN VSIP II, Bình Dương', 'Công ty TNHH Cơ khí Châu Á',
   '2026-01-01', 'ACTIVE', 1, NOW()),
  -- 5. Hải Phòng · Kho vận · URGENT
  ('seed-proj-EXTRA-2026-005', 'EXTRA-2026-005', 'seed-client-extra-hn-01',
   'Nhân viên vận hành kho lạnh Đình Vũ', 15, 9, true,
   'KCN Đình Vũ, Hải Phòng', 'Công ty CP Logistics Miền Bắc',
   '2026-01-01', 'ACTIVE', 1, NOW()),
  -- 6. Thái Nguyên · Điện tử · thường
  ('seed-proj-EXTRA-2026-006', 'EXTRA-2026-006', 'seed-client-extra-hn-01',
   'Kỹ thuật viên SMT Yên Bình', 12, 5, true,
   'KCN Yên Bình, Thái Nguyên', 'Công ty TNHH Samsung Display VN',
   '2026-01-01', 'ACTIVE', 1, NOW()),
  -- 7. Hưng Yên · May mặc · URGENT
  ('seed-proj-EXTRA-2026-007', 'EXTRA-2026-007', 'seed-client-extra-hcm-01',
   'Công nhân may xuất khẩu Phố Nối', 50, 38, true,
   'KCN Phố Nối A, Hưng Yên', 'Công ty TNHH Dệt may Hưng Yên',
   '2026-01-01', 'ACTIVE', 1, NOW()),
  -- 8. Đà Nẵng · Cơ khí · thường
  ('seed-proj-EXTRA-2026-008', 'EXTRA-2026-008', 'seed-client-extra-bd-01',
   'Thợ tiện CNC Hòa Khánh', 18, 10, true,
   'KCN Hòa Khánh, Đà Nẵng', 'Công ty CP Cơ khí Miền Trung',
   '2026-01-01', 'ACTIVE', 1, NOW()),
  -- 9. Bắc Giang · Kho vận · URGENT
  ('seed-proj-EXTRA-2026-009', 'EXTRA-2026-009', 'seed-client-hrp-demo-2',
   'Nhân viên xếp dỡ kho Quang Châu', 25, 16, true,
   'KCN Quang Châu, Bắc Giang', 'Công ty TNHH Kho vận Đông Bắc',
   '2026-01-01', 'ACTIVE', 1, NOW()),
  -- 10. Hà Nội · Văn phòng · thường
  ('seed-proj-EXTRA-2026-010', 'EXTRA-2026-010', 'seed-client-extra-hn-01',
   'Nhân viên hành chính tiếp nhận Cầu Giấy', 5, 1, true,
   'Quận Cầu Giấy, Hà Nội', 'Công ty CP Dịch vụ Nhân sự HRP',
   '2026-01-01', 'ACTIVE', 1, NOW())
ON CONFLICT (id) DO NOTHING;

-- ─── 10 Staffing Orders (5 URGENT + 5 thường) ────────────────────────────
-- URGENT: status=CLOSING_SOON + deadlineDate < +7 ngày
-- thường: status=OPEN + deadlineDate = +30 ngày
INSERT INTO staffing_orders (id, code, project_id, title, description, deadline_date, status, created_at)
VALUES
  ('seed-order-EXTRA-2026-001', 'SO-EXTRA-001', 'seed-proj-EXTRA-2026-001',
   'Đơn tuyển lắp ráp Thăng Long', 'Tuyển gấp 12 người lắp ráp bo mạch điện tử. Ca sáng 7h-15h, có phụ cấp cơm.',
   CURRENT_DATE + INTERVAL '5 days',  'CLOSING_SOON', NOW() - INTERVAL '2 days'),
  ('seed-order-EXTRA-2026-002', 'SO-EXTRA-002', 'seed-proj-EXTRA-2026-002',
   'Đơn tuyển đóng gói Yên Phong 2', 'Tuyển 8 công nhân đóng gói cuối dây chuyền. Lương theo sản phẩm.',
   CURRENT_DATE + INTERVAL '30 days', 'OPEN',         NOW() - INTERVAL '7 days'),
  ('seed-order-EXTRA-2026-003', 'SO-EXTRA-003', 'seed-proj-EXTRA-2026-003',
   'Đơn tuyển công nhân may Tân Bình', 'Tuyển 19 công nhân may áo xuất khẩu. Có tay nghề ưu tiên.',
   CURRENT_DATE + INTERVAL '4 days',  'CLOSING_SOON', NOW() - INTERVAL '1 day'),
  ('seed-order-EXTRA-2026-004', 'SO-EXTRA-004', 'seed-proj-EXTRA-2026-004',
   'Đơn tuyển thợ hàn VSIP II', 'Tuyển 8 thợ hàn MIG/TIG. Lương cạnh tranh theo tay nghề.',
   CURRENT_DATE + INTERVAL '28 days', 'OPEN',         NOW() - INTERVAL '5 days'),
  ('seed-order-EXTRA-2026-005', 'SO-EXTRA-005', 'seed-proj-EXTRA-2026-005',
   'Đơn tuyển vận hành kho lạnh Đình Vũ', 'Tuyển gấp 6 nhân viên kho lạnh (-18°C). Có phụ cấp lạnh.',
   CURRENT_DATE + INTERVAL '6 days',  'CLOSING_SOON', NOW() - INTERVAL '3 days'),
  ('seed-order-EXTRA-2026-006', 'SO-EXTRA-006', 'seed-proj-EXTRA-2026-006',
   'Đơn tuyển kỹ thuật viên SMT', 'Tuyển 7 kỹ thuật viên SMT. Yêu cầu đọc được Gerber file.',
   CURRENT_DATE + INTERVAL '25 days', 'OPEN',         NOW() - INTERVAL '10 days'),
  ('seed-order-EXTRA-2026-007', 'SO-EXTRA-007', 'seed-proj-EXTRA-2026-007',
   'Đơn tuyển công nhân may Phố Nối', 'Tuyển 12 công nhân may xuất khẩu. Ca linh hoạt.',
   CURRENT_DATE + INTERVAL '5 days',  'CLOSING_SOON', NOW() - INTERVAL '2 days'),
  ('seed-order-EXTRA-2026-008', 'SO-EXTRA-008', 'seed-proj-EXTRA-2026-008',
   'Đơn tuyển thợ tiện CNC Hòa Khánh', 'Tuyển 8 thợ tiện CNC. Biết đọc bản vẽ cơ khí.',
   CURRENT_DATE + INTERVAL '30 days', 'OPEN',         NOW() - INTERVAL '6 days'),
  ('seed-order-EXTRA-2026-009', 'SO-EXTRA-009', 'seed-proj-EXTRA-2026-009',
   'Đơn tuyển xếp dỡ kho Quang Châu', 'Tuyển gấp 9 nhân viên xếp dỡ. Ca hành chính 8h-17h.',
   CURRENT_DATE + INTERVAL '4 days',  'CLOSING_SOON', NOW() - INTERVAL '1 day'),
  ('seed-order-EXTRA-2026-010', 'SO-EXTRA-010', 'seed-proj-EXTRA-2026-010',
   'Đơn tuyển nhân viên hành chính HRP', 'Tuyển 4 nhân viên hành chính tiếp nhận hồ sơ. Biết tiếng Anh cơ bản.',
   CURRENT_DATE + INTERVAL '20 days', 'OPEN',         NOW() - INTERVAL '4 days')
ON CONFLICT (id) DO NOTHING;

-- ─── 10 Staffing Order Slots (mỗi đơn 1 slot) ──────────────────────────
-- hourly_rate_vnd ~22k-45k VND/giờ; positionsFilled = slotsNeeded - chỗ còn
INSERT INTO staffing_order_slots (id, staffing_order_id, position_code, position_title, slots_needed, slots_filled, hourly_rate_vnd, shift_start, shift_end, valid_from, valid_to, work_location, created_at)
VALUES
  ('seed-slot-EXTRA-2026-001', 'seed-order-EXTRA-2026-001',
   'ASSEMBLER', 'Nhân viên lắp ráp', 12, 0, 32000, '07:00', '15:00',
   CURRENT_DATE - INTERVAL '2 days',  CURRENT_DATE + INTERVAL '5 days',
   'KCN Thăng Long, Hà Nội', NOW()),
  ('seed-slot-EXTRA-2026-002', 'seed-order-EXTRA-2026-002',
   'PACKER', 'Công nhân đóng gói', 8, 0, 28000, '08:00', '16:00',
   CURRENT_DATE - INTERVAL '7 days',  CURRENT_DATE + INTERVAL '30 days',
   'KCN Yên Phong, Bắc Ninh', NOW()),
  ('seed-slot-EXTRA-2026-003', 'seed-order-EXTRA-2026-003',
   'SEAMSTRESS', 'Công nhân may', 19, 0, 26000, '07:30', '16:30',
   CURRENT_DATE - INTERVAL '1 day',   CURRENT_DATE + INTERVAL '4 days',
   'KCN Tân Bình, TP. Hồ Chí Minh', NOW()),
  ('seed-slot-EXTRA-2026-004', 'seed-order-EXTRA-2026-004',
   'WELDER', 'Thợ hàn', 8, 0, 45000, '07:00', '17:00',
   CURRENT_DATE - INTERVAL '5 days',  CURRENT_DATE + INTERVAL '28 days',
   'KCN VSIP II, Bình Dương', NOW()),
  ('seed-slot-EXTRA-2026-005', 'seed-order-EXTRA-2026-005',
   'WAREHOUSE', 'Nhân viên kho lạnh', 6, 0, 35000, '06:00', '14:00',
   CURRENT_DATE - INTERVAL '3 days',  CURRENT_DATE + INTERVAL '6 days',
   'KCN Đình Vũ, Hải Phòng', NOW()),
  ('seed-slot-EXTRA-2026-006', 'seed-order-EXTRA-2026-006',
   'SMT_TECH', 'Kỹ thuật viên SMT', 7, 0, 40000, '08:00', '17:00',
   CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '25 days',
   'KCN Yên Bình, Thái Nguyên', NOW()),
  ('seed-slot-EXTRA-2026-007', 'seed-order-EXTRA-2026-007',
   'SEAMSTRESS', 'Công nhân may xuất khẩu', 12, 0, 27000, '07:00', '15:30',
   CURRENT_DATE - INTERVAL '2 days',  CURRENT_DATE + INTERVAL '5 days',
   'KCN Phố Nối A, Hưng Yên', NOW()),
  ('seed-slot-EXTRA-2026-008', 'seed-order-EXTRA-2026-008',
   'CNC_OPERATOR', 'Thợ tiện CNC', 8, 0, 38000, '08:00', '17:00',
   CURRENT_DATE - INTERVAL '6 days',  CURRENT_DATE + INTERVAL '30 days',
   'KCN Hòa Khánh, Đà Nẵng', NOW()),
  ('seed-slot-EXTRA-2026-009', 'seed-order-EXTRA-2026-009',
   'LOADER', 'Nhân viên xếp dỡ', 9, 0, 30000, '08:00', '17:00',
   CURRENT_DATE - INTERVAL '1 day',   CURRENT_DATE + INTERVAL '4 days',
   'KCN Quang Châu, Bắc Giang', NOW()),
  ('seed-slot-EXTRA-2026-010', 'seed-order-EXTRA-2026-010',
   'ADMIN', 'Nhân viên hành chính', 4, 0, 22000, '08:30', '17:30',
   CURRENT_DATE - INTERVAL '4 days',  CURRENT_DATE + INTERVAL '20 days',
   'Quận Cầu Giấy, Hà Nội', NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ─── Verify ──────────────────────────────────────────────────────────────
-- SELECT code, name, site_address, quota, filled FROM projects WHERE code LIKE 'EXTRA-2026-%' ORDER BY code;
-- SELECT so.code, so.status, so.deadline_date, COUNT(s.id) AS slots
--   FROM staffing_orders so LEFT JOIN staffing_order_slots s ON s.staffing_order_id = so.id
--   WHERE so.code LIKE 'SO-EXTRA-%' GROUP BY so.code, so.status, so.deadline_date ORDER BY so.code;
