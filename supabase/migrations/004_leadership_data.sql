alter table public.directory_settings
  add column if not exists leadership_data jsonb not null default '{}';
