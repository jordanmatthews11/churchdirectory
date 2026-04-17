alter table public.families
add column if not exists photo_zoom integer not null default 100
check (photo_zoom between 100 and 400);

alter table public.members
add column if not exists photo_zoom integer not null default 100
check (photo_zoom between 100 and 400);
