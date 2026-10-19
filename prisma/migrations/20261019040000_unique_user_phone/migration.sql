-- Enforce one account per canonical Vietnamese phone, including legacy formatting.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.users
    WHERE phone IS NOT NULL AND hrp_normalize_phone(phone) <> ''
    GROUP BY hrp_normalize_phone(phone)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate normalized user phone numbers exist; resolve duplicates before retrying this migration';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_normalized_phone_key
  ON public.users (hrp_normalize_phone(phone))
  WHERE phone IS NOT NULL AND hrp_normalize_phone(phone) <> '';
