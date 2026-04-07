-- Map legacy roles to adult, then constrain to adult | child | other
UPDATE public.members SET role = 'adult' WHERE role IN ('head', 'spouse');

-- Drop old CHECK on role (name may be auto-generated; find by definition)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname AS name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'members'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%role%in%'
  LOOP
    EXECUTE format('ALTER TABLE public.members DROP CONSTRAINT %I', r.name);
  END LOOP;
END $$;

ALTER TABLE public.members
  ADD CONSTRAINT members_role_check CHECK (role IN ('adult', 'child', 'other'));
