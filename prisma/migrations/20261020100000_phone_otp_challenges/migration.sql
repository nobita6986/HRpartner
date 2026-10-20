-- Store only HMACs of OTP and phone; never persist or return the OTP itself.
CREATE TABLE IF NOT EXISTS phone_otp_challenges (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  code_hash TEXT NOT NULL,
  phone_hash TEXT NOT NULL,
  expires_at TIMESTAMP(3) NOT NULL,
  cooldown_until TIMESTAMP(3) NOT NULL,
  send_window_started_at TIMESTAMP(3) NOT NULL,
  sends_in_window INTEGER NOT NULL DEFAULT 1,
  attempts INTEGER NOT NULL DEFAULT 0,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT phone_otp_challenges_sends_nonnegative CHECK (sends_in_window >= 0),
  CONSTRAINT phone_otp_challenges_attempts_nonnegative CHECK (attempts >= 0)
);

ALTER TABLE phone_otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_otp_challenges FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hrp_phone_otp_challenge_system_scope ON phone_otp_challenges;
CREATE POLICY hrp_phone_otp_challenge_system_scope ON phone_otp_challenges
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (hrp_session_role() = 'ADMIN' AND hrp_session_user_id() = 'system:phone-otp')
  WITH CHECK (hrp_session_role() = 'ADMIN' AND hrp_session_user_id() = 'system:phone-otp');

GRANT SELECT, INSERT, UPDATE, DELETE ON phone_otp_challenges TO app_user_writer, app_user;

CREATE TABLE IF NOT EXISTS etrust_otp_credentials (
  id TEXT PRIMARY KEY DEFAULT 'primary' CHECK (id = 'primary'),
  api_key_ciphertext TEXT NOT NULL,
  secret_key_ciphertext TEXT NOT NULL,
  updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE etrust_otp_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE etrust_otp_credentials FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hrp_etrust_otp_credential_system_scope ON etrust_otp_credentials;
CREATE POLICY hrp_etrust_otp_credential_system_scope ON etrust_otp_credentials
  AS PERMISSIVE FOR ALL
  TO app_user_writer, app_user
  USING (hrp_session_role() = 'ADMIN' AND hrp_session_user_id() = 'system:phone-otp')
  WITH CHECK (hrp_session_role() = 'ADMIN' AND hrp_session_user_id() = 'system:phone-otp');
GRANT SELECT, INSERT, UPDATE, DELETE ON etrust_otp_credentials TO app_user_writer, app_user;

DO $$
DECLARE
  v_fk int;
  v_force boolean;
  v_policy int;
  v_credentials_force boolean;
  v_credentials_policy int;
BEGIN
  SELECT count(*) INTO v_fk
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public' AND t.relname = 'phone_otp_challenges'
    AND c.contype = 'f' AND c.confrelid = 'users'::regclass
    AND ('(' || pg_get_constraintdef(c.oid, true) || ')') LIKE '%ON DELETE CASCADE%';
  IF v_fk <> 1 THEN
    RAISE EXCEPTION 'phone_otp_challenges must reference users with ON DELETE CASCADE';
  END IF;

  SELECT c.relrowsecurity AND c.relforcerowsecurity INTO v_force
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'phone_otp_challenges';
  IF v_force IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'phone_otp_challenges must have ENABLE and FORCE ROW LEVEL SECURITY';
  END IF;

  SELECT count(*) INTO v_policy FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'phone_otp_challenges'
    AND p.polname = 'hrp_phone_otp_challenge_system_scope';
  IF v_policy <> 1 THEN
    RAISE EXCEPTION 'phone_otp_challenges system-only policy missing';
  END IF;

  SELECT c.relrowsecurity AND c.relforcerowsecurity INTO v_credentials_force
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'etrust_otp_credentials';
  IF v_credentials_force IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'etrust_otp_credentials must have ENABLE and FORCE ROW LEVEL SECURITY';
  END IF;
  SELECT count(*) INTO v_credentials_policy FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'etrust_otp_credentials'
    AND p.polname = 'hrp_etrust_otp_credential_system_scope';
  IF v_credentials_policy <> 1 THEN
    RAISE EXCEPTION 'etrust_otp_credentials system-only policy missing';
  END IF;
END
$$;
