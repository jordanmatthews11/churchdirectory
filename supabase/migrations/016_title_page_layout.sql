alter table public.directory_settings
add column if not exists title_page_layout jsonb not null default '{}'::jsonb;
