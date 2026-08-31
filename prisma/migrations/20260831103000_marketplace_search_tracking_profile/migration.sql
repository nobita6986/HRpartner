-- Marketplace usability closure:
--   1) Bearer tracking-code holder may re-read the exact identity fields they submitted.
--   2) Canonical demo jobs use Vietnamese diacritics consistently.
--
-- The tracking endpoint remains rate-limited, returns Cache-Control: no-store, and
-- does not expose normalized_phone or any internal review/ownership fields.

CREATE OR REPLACE FUNCTION hrp_public_tracking_profile(p_tracking_code text)
RETURNS TABLE(
  tracking_code  text,
  status         text,
  submitted_at   timestamp,
  job_title      text,
  job_code       text,
  position_title text,
  full_name      text,
  phone          text,
  cccd_number    text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
  SELECT cs.public_tracking_code,
         cs.status,
         cs.created_at,
         p.name,
         p.code,
         s.position_title,
         cs.full_name,
         cs.phone,
         cs.cccd_number
    FROM candidate_submissions cs
    LEFT JOIN staffing_order_slots s ON s.id = cs.slot_id
    LEFT JOIN outsourcing_projects p ON p.id = cs.project_id
   WHERE cs.public_tracking_code = p_tracking_code
   LIMIT 1;
$fn$;

REVOKE ALL ON FUNCTION hrp_public_tracking_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrp_public_tracking_profile(text) TO app_user_writer, app_user;

-- Keep the SECURITY DEFINER owner NOLOGIN. PostgreSQL requires temporary SET
-- permission and CREATE on the containing schema for ownership transfer.
GRANT CREATE ON SCHEMA public TO hrp_public_rpc;
DO $$
BEGIN
  EXECUTE format('GRANT hrp_public_rpc TO %I WITH SET TRUE', session_user);
END
$$;
ALTER FUNCTION hrp_public_tracking_profile(text) OWNER TO hrp_public_rpc;
DO $$
BEGIN
  EXECUTE format('GRANT hrp_public_rpc TO %I WITH SET FALSE', session_user);
END
$$;
REVOKE CREATE ON SCHEMA public FROM hrp_public_rpc;

-- Canonical Vietnamese labels for the five seeded/demo jobs currently used by
-- the public marketplace. Updates are deliberately code-scoped and idempotent.
UPDATE outsourcing_projects
   SET name = CASE code
       WHEN 'DA-DEMO-001' THEN 'Nhà máy Điện tử Kinh Bắc — Bắc Ninh'
       WHEN 'DA-DEMO-002' THEN 'Kho vận Yên Phong'
       WHEN 'DA-DEMO-003' THEN 'DEMO Lắp đặt điện Yên Phong 3'
       WHEN 'DA-2026-018' THEN 'Nhà máy Điện tử An Phát'
       WHEN 'DA-2026-022' THEN 'Kho vận Yên Phong'
       ELSE name
     END,
       site_address = CASE code
       WHEN 'DA-DEMO-001' THEN 'KCN Quế Võ, Bắc Ninh'
       WHEN 'DA-DEMO-002' THEN 'KCN Yên Phong, Bắc Ninh'
       WHEN 'DA-DEMO-003' THEN 'KCN Yên Phong, Bắc Ninh'
       WHEN 'DA-2026-018' THEN 'KCN Chợ An, Bắc Ninh'
       WHEN 'DA-2026-022' THEN 'KCN Yên Phong, Bắc Ninh'
       ELSE site_address
     END
 WHERE code IN ('DA-DEMO-001', 'DA-DEMO-002', 'DA-DEMO-003', 'DA-2026-018', 'DA-2026-022');

UPDATE staffing_orders o
   SET title = CASE p.code
       WHEN 'DA-DEMO-001' THEN 'Tuyển công nhân lắp ráp điện tử'
       WHEN 'DA-DEMO-002' THEN 'Tuyển nhân viên kho Yên Phong'
       WHEN 'DA-DEMO-003' THEN 'Tuyển thợ điện Yên Phong'
       WHEN 'DA-2026-018' THEN 'Tuyển công nhân điện tử An Phát'
       WHEN 'DA-2026-022' THEN 'Tuyển nhân viên kho vận Yên Phong'
       ELSE o.title
     END
  FROM outsourcing_projects p
 WHERE o.project_id = p.id
   AND p.code IN ('DA-DEMO-001', 'DA-DEMO-002', 'DA-DEMO-003', 'DA-2026-018', 'DA-2026-022');

UPDATE staffing_order_slots s
   SET position_title = CASE p.code
       WHEN 'DA-DEMO-001' THEN 'Công nhân lắp ráp'
       WHEN 'DA-DEMO-002' THEN 'Nhân viên kho'
       WHEN 'DA-DEMO-003' THEN 'Thợ điện'
       WHEN 'DA-2026-018' THEN 'Công nhân điện tử'
       WHEN 'DA-2026-022' THEN 'Nhân viên kho'
       ELSE s.position_title
     END,
       work_location = CASE p.code
       WHEN 'DA-DEMO-001' THEN 'KCN Quế Võ, Bắc Ninh'
       WHEN 'DA-DEMO-002' THEN 'KCN Yên Phong, Bắc Ninh'
       WHEN 'DA-DEMO-003' THEN 'KCN Yên Phong, Bắc Ninh'
       WHEN 'DA-2026-018' THEN 'KCN Chợ An, Bắc Ninh'
       WHEN 'DA-2026-022' THEN 'KCN Yên Phong, Bắc Ninh'
       ELSE s.work_location
     END
  FROM staffing_orders o
  JOIN outsourcing_projects p ON p.id = o.project_id
 WHERE s.staffing_order_id = o.id
   AND p.code IN ('DA-DEMO-001', 'DA-DEMO-002', 'DA-DEMO-003', 'DA-2026-018', 'DA-2026-022');
