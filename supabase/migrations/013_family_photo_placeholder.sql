-- Adds a configurable placeholder image used when a family has no photo.
ALTER TABLE directory_settings
  ADD COLUMN IF NOT EXISTS family_placeholder_url text;

