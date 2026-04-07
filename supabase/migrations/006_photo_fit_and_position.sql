-- Add non-destructive photo presentation controls for families and members.
-- This lets users choose fit mode and crop position without altering original images.

ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS photo_fit text DEFAULT 'cover',
  ADD COLUMN IF NOT EXISTS photo_position_x integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS photo_position_y integer DEFAULT 50;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS photo_fit text DEFAULT 'cover',
  ADD COLUMN IF NOT EXISTS photo_position_x integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS photo_position_y integer DEFAULT 50;

UPDATE public.families
SET
  photo_fit = COALESCE(photo_fit, 'cover'),
  photo_position_x = COALESCE(photo_position_x, 50),
  photo_position_y = COALESCE(photo_position_y, 50);

UPDATE public.members
SET
  photo_fit = COALESCE(photo_fit, 'cover'),
  photo_position_x = COALESCE(photo_position_x, 50),
  photo_position_y = COALESCE(photo_position_y, 50);

DO $$
DECLARE
  role_constraint text;
BEGIN
  SELECT c.conname INTO role_constraint
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'families'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%photo_fit%in%';
  IF role_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.families DROP CONSTRAINT %I', role_constraint);
  END IF;
END $$;

ALTER TABLE public.families
  ADD CONSTRAINT families_photo_fit_check CHECK (photo_fit IN ('cover', 'contain'));

DO $$
DECLARE
  role_constraint text;
BEGIN
  SELECT c.conname INTO role_constraint
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'members'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%photo_fit%in%';
  IF role_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.members DROP CONSTRAINT %I', role_constraint);
  END IF;
END $$;

ALTER TABLE public.members
  ADD CONSTRAINT members_photo_fit_check CHECK (photo_fit IN ('cover', 'contain'));

ALTER TABLE public.families
  ADD CONSTRAINT families_photo_position_x_check CHECK (photo_position_x BETWEEN 0 AND 100),
  ADD CONSTRAINT families_photo_position_y_check CHECK (photo_position_y BETWEEN 0 AND 100);

ALTER TABLE public.members
  ADD CONSTRAINT members_photo_position_x_check CHECK (photo_position_x BETWEEN 0 AND 100),
  ADD CONSTRAINT members_photo_position_y_check CHECK (photo_position_y BETWEEN 0 AND 100);
