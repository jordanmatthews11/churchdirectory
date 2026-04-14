-- Allow the Opening page header logo crop to be repositioned horizontally and vertically.
alter table public.directory_settings
add column if not exists logo_position_x integer not null default 50,
add column if not exists logo_position_y integer not null default 50;
