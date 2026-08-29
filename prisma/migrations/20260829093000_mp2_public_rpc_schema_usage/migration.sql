-- Go-live closure for MP-2 SECURITY DEFINER ownership.
--
-- Hardened environments revoke schema privileges from PUBLIC. Table grants
-- alone are not enough: without schema USAGE, the NOLOGIN function owner sees
-- `relation does not exist` while resolving candidate_submissions under its
-- pinned `public, pg_temp` search_path.
--
-- Role creation remains an OP step (DEC-09). The guarded grant keeps clean CI
-- databases migratable when the privileged role has not been provisioned yet;
-- scripts/create-public-rpc-role.cjs applies the same invariant when it is.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hrp_public_rpc') THEN
    GRANT USAGE ON SCHEMA public TO hrp_public_rpc;
  END IF;
END
$$;
