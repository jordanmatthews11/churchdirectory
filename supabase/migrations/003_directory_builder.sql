alter table public.directory_settings
  add column if not exists church_name text not null default 'Christ Community Church',
  add column if not exists cover_title_line1 text not null default 'Church',
  add column if not exists cover_title_line2 text not null default 'DIRECTORY',
  add column if not exists cover_year text not null default '2026',
  add column if not exists logo_url text;
