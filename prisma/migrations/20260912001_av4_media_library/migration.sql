-- Migration: AV4 — Media Management foundation
-- Plan: docs/tasks/hrp-v6-admin-v4-media-library/TASK.md v0.1
-- ADD-only migration: tạo bảng mới, không sửa schema cũ, không RLS change.
-- AV4 là foundation cho AV2 (JobPosting editor) và AV6 (HomepageSection CMS).

-- 1. Create MediaStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MediaStatus') THEN
    CREATE TYPE "MediaStatus" AS ENUM ('PUBLIC', 'INTERNAL');
  END IF;
END $$;

-- 2. Create Media table
CREATE TABLE IF NOT EXISTS media (
  id              TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::text,
  url             TEXT         UNIQUE NOT NULL,
  alt             TEXT         NOT NULL DEFAULT '',
  caption         TEXT,
  "order"         INTEGER      NOT NULL DEFAULT 0,
  status          "MediaStatus" NOT NULL DEFAULT 'PUBLIC',
  cover           BOOLEAN      NOT NULL DEFAULT false,
  folder          TEXT         NOT NULL DEFAULT 'uncategorized',
  tags            TEXT[]       NOT NULL DEFAULT '{}',
  filename        TEXT         NOT NULL,
  size            INTEGER      NOT NULL,
  mime_type       TEXT         NOT NULL,
  public_url      TEXT         NOT NULL DEFAULT '',
  owner_id        TEXT         NOT NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by_id   UUID
);

CREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder);
CREATE INDEX IF NOT EXISTS idx_media_status ON media(status);
CREATE INDEX IF NOT EXISTS idx_media_owner_id ON media(owner_id);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);

-- 3. FK: media.created_by_id → users.id (nullable, SET NULL on delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_created_by_id_fkey'
  ) THEN
    ALTER TABLE media
      ADD CONSTRAINT media_created_by_id_fkey
      FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Check: size > 0 và mime_type không rỗng
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_size_positive'
  ) THEN
    ALTER TABLE media
      ADD CONSTRAINT media_size_positive CHECK (size > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_mime_type_nonempty'
  ) THEN
    ALTER TABLE media
      ADD CONSTRAINT media_mime_type_nonempty CHECK (length(mime_type) > 0);
  END IF;
END $$;

-- 5. Create MediaAssignment table (polymorphic junction)
CREATE TABLE IF NOT EXISTS media_assignment (
  id            TEXT         PRIMARY KEY DEFAULT gen_random_uuid()::text,
  media_id      TEXT         NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  owner_type    TEXT         NOT NULL,
  owner_id      TEXT         NOT NULL,
  "order"       INTEGER      NOT NULL DEFAULT 0,
  cover         BOOLEAN      NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (media_id, owner_type, owner_id)
);

CREATE INDEX IF NOT EXISTS idx_media_assignment_owner
  ON media_assignment(owner_type, owner_id);

-- 6. Check: owner_type chỉ trong allowlist (AV2/AV6/Article/Partner)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_assignment_owner_type_allowlist'
  ) THEN
    ALTER TABLE media_assignment
      ADD CONSTRAINT media_assignment_owner_type_allowlist
      CHECK (owner_type IN ('JobPosting', 'HomepageSection', 'Article', 'Partner'));
  END IF;
END $$;
