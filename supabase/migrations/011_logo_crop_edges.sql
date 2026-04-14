-- Allow the Opening page header logo to be cropped independently from each edge.
alter table public.directory_settings
add column if not exists logo_crop_top integer not null default 0,
add column if not exists logo_crop_bottom integer not null default 0,
add column if not exists logo_crop_left integer not null default 0,
add column if not exists logo_crop_right integer not null default 0;
