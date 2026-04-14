-- Allow the Opening page header logo to move vertically without affecting layout.
alter table public.directory_settings
add column if not exists logo_offset_y integer not null default 0;
