-- Allow the Opening page header logo to be resized from the builder UI.
alter table public.directory_settings
add column if not exists logo_scale integer not null default 100;
